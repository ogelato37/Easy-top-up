const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// config from .env
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:' + PORT;
const ZITOPAY_API = process.env.ZITOPAY_API || 'https://api.zitopay.example'; // replace
const ZITOPAY_KEY = process.env.ZITOPAY_KEY || 'ZITOPAY_KEY';
const ZITOPAY_WEBHOOK_SECRET = process.env.ZITOPAY_WEBHOOK_SECRET || 'ZITOPAY_WEBHOOK_SECRET';
const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID || 'RELOADLY_CLIENT_ID';
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET || 'RELOADLY_CLIENT_SECRET';

// simple persistent orders file (demo only)
const ORDERS_FILE = path.join(__dirname, 'orders.json');
function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE)); } catch (e) { return {}; }
}
function saveOrders(o) { fs.writeFileSync(ORDERS_FILE, JSON.stringify(o, null, 2)); }

// load bundles (same file you created)
const bundles = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundles.json')));

// helper: map network -> reloadly operator id (YOU MUST FILL REAL IDS)
function getReloadlyOperatorId(network) {
  const map = {
    'MTN': 123,      // replace with Reloadly operator id for MTN Cameroon
    'Orange': 456,   // replace with Reloadly operator id for Orange
    'CAMTEL': 789,
    'Yoomee': 999
  };
  return map[network] || null;
}

// create payment (Zitopay) — adapt payload per Zitopay docs
app.post('/api/purchase', async (req, res) => {
  try {
    const { bundleId, receiver, payer } = req.body;
    if (!bundleId || !receiver || !payer) return res.status(400).json({ error: 'bundleId, receiver, payer required' });

    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return res.status(404).json({ error: 'bundle not found' });

    const orders = readOrders();
    const orderId = 'order_' + Date.now();

    // create payment session with Zitopay (placeholder)
    const payload = {
      amount: bundle.price,
      currency: 'XAF',
      description: `${bundle.network} ${bundle.title}`,
      callback_url: `${BASE_URL}/api/webhooks/zitopay`, // webhook callback
      metadata: { orderId, bundleId, receiver, payer }
    };

    const zitResp = await axios.post(`${ZITOPAY_API}/payments/create`, payload, {
      headers: { Authorization: `Bearer ${ZITOPAY_KEY}`, 'Content-Type': 'application/json' }
    });

    // expected: zitResp.data.payment_url or similar (adjust to actual response)
    const paymentUrl = zitResp.data.payment_url || zitResp.data.redirect || null;
    if (!paymentUrl) return res.status(502).json({ error: 'unexpected Zitopay response' });

    // save pending order
    orders[orderId] = {
      id: orderId,
      status: 'pending',
      bundleId, receiver, payer,
      amount: bundle.price,
      createdAt: new Date().toISOString(),
      zitopay_ref: zitResp.data.reference || null,
    };
    saveOrders(orders);

    return res.json({ orderId, paymentUrl });
  } catch (err) {
    console.error('purchase error', err?.response?.data || err.message);
    return res.status(500).json({ error: 'failed to create payment' });
  }
});

// webhook endpoint Zitopay calls when payment status changes
app.post('/api/webhooks/zitopay', async (req, res) => {
  // verify signature if provided by Zitopay (example with HMAC-SHA256 header 'x-zitopay-signature')
  const rawBody = JSON.stringify(req.body);
  const signatureHeader = req.headers['x-zitopay-signature'] || req.headers['X-Zitopay-Signature'];
  if (ZITOPAY_WEBHOOK_SECRET && signatureHeader) {
    const expected = crypto.createHmac('sha256', ZITOPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (expected !== signatureHeader) {
      console.warn('invalid webhook signature');
      return res.status(401).send('invalid signature');
    }
  }

  // parse webhook payload (adjust field names to Zitopay)
  const event = req.body;
  const metadata = event.metadata || {};
  const orderId = metadata.orderId || (event.data && event.data.orderId) || null;
  const status = event.status || event.data?.status || 'unknown';

  if (!orderId) {
    console.warn('webhook missing orderId', event);
    return res.status(400).send('missing order id');
  }

  const orders = readOrders();
  const order = orders[orderId];
  if (!order) return res.status(404).send('order not found');

  // only act on successful payment
  if (status === 'SUCCESS' || status === 'completed' || status === 'PAID') {
    if (order.status === 'completed') return res.status(200).send('already processed');

    try {
      // perform reloadly topup
      await performReloadlyTopup(order);
      order.status = 'completed';
      order.completedAt = new Date().toISOString();
      saveOrders(orders);
      return res.status(200).send('ok');
    } catch (err) {
      console.error('topup error', err?.response?.data || err.message);
      order.status = 'failed';
      order.error = err.message;
      saveOrders(orders);
      return res.status(500).send('topup failed');
    }
  }

  // handle other statuses (failed, cancelled) as needed
  order.status = status.toLowerCase();
  saveOrders(orders);
  return res.status(200).send('ignored');
});

// helper: get reloadly token (client credentials)
let reloadlyToken = null;
let reloadlyTokenExpiry = 0;
async function getReloadlyAuthToken() {
  if (reloadlyToken && Date.now() < reloadlyTokenExpiry - 60 * 1000) return reloadlyToken;
  const resp = await axios.post('https://auth.reloadly.com/oauth/token', {
    client_id: RELOADLY_CLIENT_ID,
    client_secret: RELOADLY_CLIENT_SECRET,
    grant_type: 'client_credentials',
    audience: 'https://topups.reloadly.com'
  }, { headers: { 'Content-Type': 'application/json' } });
  reloadlyToken = resp.data.access_token;
  reloadlyTokenExpiry = Date.now() + (resp.data.expires_in || 3600) * 1000;
  return reloadlyToken;
}

// perform topup using Reloadly (adjust API paths if needed)
async function performReloadlyTopup(order) {
  const bundle = bundles.find(b => b.id === order.bundleId);
  if (!bundle) throw new Error('bundle info missing');

  const operatorId = getReloadlyOperatorId(bundle.network);
  if (!operatorId) throw new Error('operator id mapping missing for ' + bundle.network);

  const token = await getReloadlyAuthToken();

  // Reloadly topups endpoint example (consult Reloadly docs for exact payload)
  const payload = {
    operatorId: operatorId,
    recipientPhone: { countryCode: '237', number: order.receiver.replace(/^\+?237/, '').replace(/\D/g, '') },
    amount: order.amount.toString(),
    // optional: specify productId instead of amount if using data product IDs
    // productId: bundle.reloadlyProductId
  };

  // example endpoint — adjust to the correct Reloadly topups endpoint for airtime/data
  const resp = await axios.post('https://topups.reloadly.com/topups', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // check response; throw if not success
  if (resp.status >= 400 || resp.data?.status === 'FAILED') {
    throw new Error('reloadly error: ' + JSON.stringify(resp.data));
  }

  // save reloadly response into order record
  const orders = readOrders();
  orders[order.id].reloadlyResponse = resp.data;
  saveOrders(orders);
  return resp.data;
}

app.listen(PORT, () => console.log(`API listening on ${PORT}`));