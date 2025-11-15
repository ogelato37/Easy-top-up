(function () {
  const bundlesGrid = document.getElementById('bundlesGrid');
  const searchInput = document.getElementById('bundleSearch');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('sortBundles');

  // Purchase modal
  const checkoutModal = document.getElementById('checkoutModal');
  const closeModal = document.getElementById('closeModal');
  const checkoutForm = document.getElementById('checkoutForm');
  const receiverInput = document.getElementById('receiverInput');
  const payerInput = document.getElementById('payerInput');
  const selectedBundleEl = document.getElementById('selectedBundle');

  // Airtime modal
  const airtimeModal = document.getElementById('airtimeModal');
  const closeAirtimeModal = document.getElementById('closeAirtimeModal');
  const airtimeForm = document.getElementById('airtimeForm');
  const airReceiver = document.getElementById('airReceiver');
  const airAmount = document.getElementById('airAmount');
  const airPayer = document.getElementById('airPayer');

  let bundles = [];
  let searchTimeout = null;

  /* ------------------------------------------------- */
  /*  Load bundles.json (fallback if fetch fails)      */
  /* ------------------------------------------------- */
  async function loadBundles() {
    try {
      const res = await fetch('bundles.json');
      if (!res.ok) throw new Error('Failed to load bundles.json');
      return await res.json();
    } catch (e) {
      console.warn('Using fallback bundle data:', e.message);
      return [
        { id: 'mtn-100mb', network: 'MTN', title: '100MB', price: 100, validity: '1 day', popular: 7, img: 'MTN Logo PNG Vector (SVG) Free Download.jpeg' },
        { id: 'mtn-500mb', network: 'MTN', title: '500MB', price: 250, validity: '7 days', popular: 9, img: 'MTN Logo PNG Vector (SVG) Free Download.jpeg' },
        { id: 'orange-200mb', network: 'Orange', title: '200MB', price: 120, validity: '3 days', popular: 6, img: 'images (2).png' },
        { id: 'camtel-1gb', network: 'CAMTEL', title: '1GB', price: 300, validity: '30 days', popular: 3, img: 'images.png' },
        { id: 'yoomee-50mb', network: 'Yoomee', title: '50MB', price: 80, validity: '1 day', popular: 2, img: 'images (1).png' }
      ];
    }
  }

  /* ------------------------------------------------- */
  /*  Render bundle cards – **no airtime button**      */
  /* ------------------------------------------------- */
  function renderBundles(list) {
    bundlesGrid.innerHTML = '';
    list.forEach(b => {
      const card = document.createElement('article');
      card.className = 'bundle-card';
      card.dataset.id = b.id;

      const safeImg = b.img ? b.img.replace(/[<>"']/g, '') : 'fallback.png';

      card.innerHTML = `
        <div class="card-head">
          <img src="${safeImg}" alt="${escapeHTML(b.network)}" onerror="this.src='fallback.png'">
          <span>${escapeHTML(b.network)} ${escapeHTML(b.title)}</span>
        </div>
        <div class="card-meta">
          <div class="size">${escapeHTML(b.title)}</div>
          <div class="validity">${escapeHTML(b.validity)}</div>
          <div class="price">FCFA ${b.price}</div>
        </div>
        <div class="card-actions">
          <button class="addBundle" data-id="${b.id}">Buy Data</button>
        </div>
      `;
      bundlesGrid.appendChild(card);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ------------------------------------------------- */
  /*  Filtering / Sorting (debounced search)          */
  /* ------------------------------------------------- */
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
    if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else filtered.sort((a, b) => (b.popular || 0) - (a.popular || 0));

    renderBundles(filtered);
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, 300);
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  sortSelect.addEventListener('change', applyFilters);

  /* ------------------------------------------------- */
  /*  Toast notifications                              */
  /* ------------------------------------------------- */
  function showToast(msg, isError = false) {
    const t = document.createElement('div');
    t.className = `et-toast${isError ? ' error' : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => t.classList.remove('visible'), 2000);
    setTimeout(() => t.remove(), 2300);
  }

  /* ------------------------------------------------- */
  /*  Phone validation (Cameroon-friendly)             */
  /* ------------------------------------------------- */
  function validPhone(v) {
    if (!v) return false;
    const cleaned = v.replace(/\s+/g, '');
    return /^(\+?237|0)?[6-9]\d{8}$/.test(cleaned) || /^[\d]{6,15}$/.test(cleaned);
  }

  /* ------------------------------------------------- */
  /*  PURCHASE MODAL (data bundle)                     */
  /* ------------------------------------------------- */
  function openPurchaseModal(bundle) {
    selectedBundleEl.innerHTML = `
      <strong>${escapeHTML(bundle.network)} ${escapeHTML(bundle.title)}</strong>
      <div style="color:#6b7280; margin-top:6px;">
        Validity: ${escapeHTML(bundle.validity)} · Price: FCFA ${bundle.price}
      </div>
    `;
    checkoutModal.dataset.bundleId = bundle.id;

    receiverInput.value = '';
    payerInput.value = '';

    checkoutModal.classList.add('open');
    checkoutModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => receiverInput.focus(), 100);
  }

  function closePurchaseModal() {
    checkoutModal.classList.remove('open');
    checkoutModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeModal) closeModal.addEventListener('click', closePurchaseModal);

  /* ------------------------------------------------- */
  /*  AIRTIME MODAL (only from hero)                   */
  /* ------------------------------------------------- */
  function openAirtimeModal() {
    airReceiver.value = '';
    airPayer.value = '';
    airAmount.value = '';
    delete airtimeModal.dataset.bundleId;   // no bundle context

    airtimeModal.classList.add('open');
    airtimeModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => airReceiver.focus(), 100);
  }

  function closeAirtimeModalFn() {
    airtimeModal.classList.remove('open');
    airtimeModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeAirtimeModal) closeAirtimeModal.addEventListener('click', closeAirtimeModalFn);

  /* ------------------------------------------------- */
  /*  Open airtime modal from hero (data-buy-airtime)  */
  /* ------------------------------------------------- */
  document.addEventListener('click', e => {
    if (e.target.closest('[data-buy-airtime]')) {
      e.preventDefault();
      openAirtimeModal();
    }
  });

  /* ------------------------------------------------- */
  /*  Bundle-grid click → only “Buy Data” button       */
  /* ------------------------------------------------- */
  bundlesGrid.addEventListener('click', e => {
    const addBtn = e.target.closest('.addBundle');
    if (!addBtn) return;

    const bundle = bundles.find(b => b.id === addBtn.dataset.id);
    if (bundle) openPurchaseModal(bundle);
  });

  /* ------------------------------------------------- */
  /*  AIRTIME FORM SUBMIT                              */
  /* ------------------------------------------------- */
  if (airtimeForm) {
    airtimeForm.addEventListener('submit', async ev => {
      ev.preventDefault();

      const receiver = airReceiver.value.trim();
      const amount = Number(airAmount.value);
      const payer = airPayer.value.trim();
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

      if (!validPhone(receiver) || !validPhone(payer)) {
        return showToast('Please enter valid phone numbers', true);
      }
      if (!amount || amount <= 0) {
        return showToast('Please enter a valid amount', true);
      }
      if (!paymentMethod) {
        return showToast('Please select a payment method', true);
      }

      showToast('Processing airtime purchase...');

      try {
        const description = `Airtime ${amount} FCFA`;

        const resp = await fetch('/api/fapshi-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            phone: receiver,
            payer,
            paymentMethod,
            description,
            metadata: { type: 'airtime', paymentMethod }
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Payment failed');

        if (data.paymentUrl) {
          showToast('Redirecting to payment...');
          setTimeout(() => window.location.href = data.paymentUrl, 800);
        } else {
          showToast('Payment created. Awaiting confirmation.');
          closeAirtimeModalFn();
        }
      } catch (err) {
        console.error('Airtime purchase error:', err);
        showToast('Failed to process payment', true);
      }
    });
  }

  /* ------------------------------------------------- */
  /*  PURCHASE FORM (data bundle) – stub               */
  /* ------------------------------------------------- */
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
      e.preventDefault();
      const receiver = receiverInput.value.trim();
      const payer = payerInput.value.trim();
      const bundleId = checkoutModal.dataset.bundleId;
      const bundle = bundles.find(b => b.id === bundleId);

      if (!validPhone(receiver) || !validPhone(payer)) {
        return showToast('Enter valid phone numbers', true);
      }

      showToast(`Buying ${bundle.title} for ${receiver}...`);
      // TODO: real data-bundle purchase API
      setTimeout(() => {
        showToast('Data bundle purchased successfully!');
        closePurchaseModal();
      }, 1500);
    });
  }

  /* ------------------------------------------------- */
  /*  ESC & backdrop close for both modals            */
  /* ------------------------------------------------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (checkoutModal.classList.contains('open')) closePurchaseModal();
      if (airtimeModal.classList.contains('open')) closeAirtimeModalFn();
    }
  });

  [checkoutModal, airtimeModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        if (modal === checkoutModal) closePurchaseModal();
        if (modal === airtimeModal) closeAirtimeModalFn();
      }
    });
  });

  /* ------------------------------------------------- */
  /*  INITIALISE                                       */
  /* ------------------------------------------------- */
  (async function init() {
    try {
      showToast('Loading bundles...');
      bundles = await loadBundles();
      renderBundles(bundles);
      applyFilters();
      showToast('Bundles loaded!');
    } catch (err) {
      console.error('Init failed:', err);
      showToast('Failed to load bundles', true);
    }
  })();
})();