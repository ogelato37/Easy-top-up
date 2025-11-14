// ...existing code...
(function () {
  const bundlesGrid = document.getElementById('bundlesGrid');
  const searchInput = document.getElementById('bundleSearch');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('sortBundles');

  // modal elements
  const checkoutModal = document.getElementById('checkoutModal');
  const closeModal = document.getElementById('closeModal') || document.getElementById('closeModal'); // safe lookup
  const checkoutForm = document.getElementById('checkoutForm');
  const receiverInput = document.getElementById('receiverInput');
  const payerInput = document.getElementById('payerInput');
  const selectedBundleEl = document.getElementById('selectedBundle');
  const cancelRedirect = document.getElementById('cancelRedirect');

  // load bundles.json if available, otherwise fallback sample
  async function loadBundles() {
    try {
      const res = await fetch('bundles.json');
      if (!res.ok) throw new Error('no json');
      const data = await res.json();
      return data;
    } catch (e) {
      // fallback sample
      return [
        { id: 'mtn-100mb', network: 'MTN', title: '100MB', price: 100, validity: '1 day', popular: 7, img: 'MTN Logo PNG Vector (SVG) Free Download.jpeg' },
        { id: 'mtn-500mb', network: 'MTN', title: '500MB', price: 250, validity: '7 days', popular: 9, img: 'MTN Logo PNG Vector (SVG) Free Download.jpeg' },
        { id: 'orange-200mb', network: 'Orange', title: '200MB', price: 120, validity: '3 days', popular: 6, img: 'images (2).png' },
        { id: 'camtel-1gb', network: 'CAMTEL', title: '1GB', price: 300, validity: '30 days', popular: 3, img: 'images.png' },
        { id: 'yoomee-50mb', network: 'Yoomee', title: '50MB', price: 80, validity: '1 day', popular: 2, img: 'images (1).png' }
      ];
    }
  }

  let bundles = [];

  function renderBundles(list) {
    bundlesGrid.innerHTML = '';
    list.forEach(b => {
      const card = document.createElement('article');
      card.className = 'bundle-card';
      card.dataset.id = b.id;
      card.dataset.network = b.network;
      card.dataset.price = b.price;
      card.innerHTML = `
        <div class="card-head"><img src="${b.img}" alt="${b.network}"><span>${b.network} ${b.title}</span></div>
        <div class="card-meta">
          <div class="size">${b.title}</div>
          <div class="validity">${b.validity}</div>
          <div class="price">FCFA ${b.price}</div>
        </div>
        <div class="card-actions">
          <button class="addBundle" data-id="${b.id}">Buy</button>
        </div>
      `;
      bundlesGrid.appendChild(card);
    });
  }

  function applyFilters() {
    const activeNetwork = document.querySelector('.filter-btn.active')?.dataset.network || 'all';
    const q = (searchInput.value || '').trim().toLowerCase();
    let filtered = bundles.filter(b => {
      const matchesNet = activeNetwork === 'all' || b.network === activeNetwork;
      const label = (b.network + ' ' + b.title).toLowerCase();
      const matchesQ = !q || label.includes(q) || String(b.price).includes(q);
      return matchesNet && matchesQ;
    });
    const sort = sortSelect.value;
    if (sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    else filtered.sort((a,b) => (b.popular || 0) - (a.popular || 0));
    renderBundles(filtered);
  }

  // purchase modal helpers
  function openPurchaseModal(bundle) {
    selectedBundleEl.innerHTML = `<strong>${bundle.network} ${bundle.title}</strong>
      <div style="color:#6b7280; margin-top:6px;">Validity: ${bundle.validity} · Price: FCFA ${bundle.price}</div>`;
    checkoutModal.dataset.bundleId = bundle.id;
    receiverInput.value = '';
    payerInput.value = '';
    checkoutModal.classList.add('open');
    checkoutModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => receiverInput.focus(), 80);
  }

  function closePurchaseModal() {
    checkoutModal.classList.remove('open');
    checkoutModal.setAttribute('aria-hidden', 'true');
  }

  // event bindings
  bundlesGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.addBundle');
    if (!btn) return;
    const id = btn.dataset.id;
    const bundle = bundles.find(b => b.id === id);
    if (!bundle) return;
    openPurchaseModal(bundle);
  });

  if (filterBtns) filterBtns.forEach(b => b.addEventListener('click', () => {
    filterBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    applyFilters();
  }));

  if (searchInput) searchInput.addEventListener('input', () => applyFilters());
  if (sortSelect) sortSelect.addEventListener('change', () => applyFilters());

  // modal close handlers
  if (closeModal) closeModal.addEventListener('click', closePurchaseModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal.classList.contains('open')) closePurchaseModal();
  });

  // form submit (simulate)
// ...inside your purchase flow where you open modal, replace submit handler with:
checkoutForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const bundleId = checkoutModal.dataset.bundleId;
  const receiver = receiverInput.value.trim();
  const payer = payerInput.value.trim();
  if (!bundleId || !receiver || !payer) { showToast('Please complete form'); return; }

  try {
    const resp = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId, receiver, payer })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'payment creation failed');

    // redirect user to Zitopay payment page
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else {
      showToast('Payment created; awaiting confirmation');
      checkoutModal.classList.remove('open');
    }
  } catch (err) {
    console.error(err);
    showToast('Could not create payment');
  }
});

  // small toast
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'et-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(()=> t.classList.remove('visible'), 1600);
    setTimeout(()=> t.remove(), 1900);
  }

  // init loader
  (async function init() {
    bundles = await loadBundles();
    renderBundles(bundles);
    applyFilters();
  })();

})();




// Open modal when #buy-btn (or any element with [data-buy-airtime]) is clicked.
// Prevents default navigation on #buy-btn.
(function () {
  const modal = document.getElementById('airtimeModal');
  const openLink = document.getElementById('buy-btn'); // nav link used on pages
  const closeBtn = document.getElementById('closeAirtimeModal');
  const form = document.getElementById('airtimeForm');
  const receiver = document.getElementById('airReceiver');
  const payer = document.getElementById('airPayer');
  const amount = document.getElementById('airAmount');

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => receiver && receiver.focus(), 80);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // open from #buy-btn (nav) — prevent navigation
  if (openLink) {
    openLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  // open from any element with data-buy-airtime attribute (useful for buttons)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy-airtime]');
    if (!btn) return;
    e.preventDefault();
    openModal();
  });

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
  });

  // basic phone validation (simple digits + optional leading +)
  function validPhone(v) {
    if (!v) return false;
    return /^[+]?[\d]{6,15}$/.test(v.replace(/\s+/g, ''));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = receiver.value.trim();
      const p = payer.value.trim();
      const a = Number(amount.value);
      if (!validPhone(r) || !validPhone(p)) {
        showToast('Enter valid phone numbers (include country code)');
        return;
      }
      if (!a || a <= 0) {
        showToast('Enter a valid amount');
        return;
      }

      // simulate processing
      showToast('Processing airtime purchase...');
      closeModal();
      setTimeout(() => {
        showToast(`Success: FCFA ${a} sent to ${r}`);
        // optionally: POST to server here
      }, 900);
    });
  }

  // re-use site toast style .et-toast (if present) or simple fallback
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'et-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => t.classList.remove('visible'), 1700);
    setTimeout(() => t.remove(), 2000);
  }
})();