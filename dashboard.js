// === PASSWORD PROTECTION ===
const CORRECT_PASSWORD = "EasyTopUp2025!"; // CHANGE THIS TO YOUR SECRET PASSWORD

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const passwordInput = document.getElementById('adminPassword');
  const loginBtn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMsg');

  // Check if already logged in (this session)
  if (sessionStorage.getItem('adminAuthenticated') === 'true') {
    loginScreen.style.display = 'none';
    return;
  }

  // Login logic
  loginBtn.addEventListener('click', () => {
    const entered = passwordInput.value.trim();
    if (entered === CORRECT_PASSWORD) {
      sessionStorage.setItem('adminAuthenticated', 'true');
      loginScreen.style.opacity = '0';
      setTimeout(() => {
        loginScreen.style.display = 'none';
      }, 400);
    } else {
      errorMsg.textContent = 'Incorrect password. Try again.';
      passwordInput.style.borderColor = '#ef4444';
      passwordInput.value = '';
    }
  });

  // Allow Enter key
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
});


// Auto-increase stats every 30s
setInterval(() => {
  const revenue = document.getElementById('revenueToday');
  revenue.textContent = (parseInt(revenue.textContent.replace(/,/g,'')) + 12500).toLocaleString();
}, 30000);

// dashboard.js — Real-time Mock Data
document.addEventListener('DOMContentLoaded', () => {
  // Revenue Chart
  const ctx = document.getElementById('revenueChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Revenue (FCFA)',
        data: [980000, 1120000, 1350000, 1280000, 1480000, 1620000, 1248500],
        borderColor: '#f1c40f',
        backgroundColor: 'rgba(241,196,15,0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // Live Activity Feed
  const activities = [
    { icon: 'fas fa-mobile-alt', text: '<strong>Marie D.</strong> bought 1GB MTN', city: 'Douala' },
    { icon: 'fas fa-wallet', text: '<strong>Jean K.</strong> paid 500 FCFA via MoMo', city: 'Yaoundé' },
    { icon: 'fas fa-check', text: '<strong>Paul B.</strong> received 500MB bonus', city: 'Bamenda' },
  ];

  const feed = document.getElementById('activityFeed');
  const addActivity = () => {
    const act = activities[Math.floor(Math.random() * activities.length)];
    const minsAgo = Math.floor(Math.random() * 10) + 1;
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon"><i class="${act.icon}"></i></div>
      <div>
        <div>${act.text} • ${minsAgo} min${minsAgo>1?'s':''} ago</div>
        <div style="font-size:0.8rem; color:#64748b;">${act.city}</div>
      </div>
    `;
    feed.insertBefore(item, feed.firstChild);
    if (feed.children.length > 6) feed.removeChild(feed.lastChild);
  };
  addActivity();
  setInterval(addActivity, 7000);

  // Recent Transfers
  const transfers = [
    { id: '#T9821', user: 'Aisha M.', bundle: '1GB MTN', amount: '500', time: '2 min ago', status: 'success' },
    { id: '#T9820', user: 'Emmanuel T.', bundle: '500MB Orange', amount: '300', time: '5 min ago', status: 'success' },
    { id: '#T9819', user: 'Grace N.', bundle: '2GB Yoomee', amount: '1000', time: '8 min ago', status: 'pending' },
  ];

  const table = document.getElementById('transfersTable');
  transfers.forEach(t => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.id}</td>
      <td>${t.user}</td>
      <td>${t.bundle}</td>
      <td>FCFA ${t.amount}</td>
      <td>${t.time}</td>
      <td><span class="status ${t.status}">${t.status}</span></td>
    `;
    table.appendChild(row);
  });

  // Auto-update stats
  setInterval(() => {
    document.getElementById('transfersToday').textContent = 
      (parseInt(document.getElementById('transfersToday').textContent) + Math.floor(Math.random() * 5)).toLocaleString();
  }, 15000);
});