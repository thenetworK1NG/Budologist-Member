/* ============================================================
   app.js — Budologist Membership PWA main logic
   ============================================================ */

/* ─── State ──────────────────────────────────────────────── */
let allMembers         = [];   /* local cache */
let deferredInstall    = null;
let monthlyChart       = null;
let typeChart          = null;
let isAutoNumber       = true; /* toggle state for member number field */

/* ─── Service Worker Registration ───────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err =>
      console.warn('SW registration failed:', err)
    );
  });
}

/* ─── PWA Install Prompt ─────────────────────────────────── */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  document.getElementById('installBtn').hidden = false;
});

window.addEventListener('appinstalled', () => {
  document.getElementById('installBtn').hidden = true;
  deferredInstall = null;
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  if (outcome === 'accepted') document.getElementById('installBtn').hidden = true;
  deferredInstall = null;
});

/* ─── Tab Navigation ─────────────────────────────────────── */
function switchTab(name) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.tab-section').forEach(sec => {
    const active = sec.id === name;
    sec.classList.toggle('active', active);
  });
  if (name === 'analytics')  renderAnalytics();
  if (name === 'members')    renderMembers(allMembers);
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* ─── Helpers ────────────────────────────────────────────── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmt(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast toast--${type} toast--show`;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => { el.hidden = true; }, 300);
  }, 3500);
}

function memberStatus(member) {
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  const expiry = member.expiryDate instanceof Date ? member.expiryDate : new Date(member.expiryDate);
  const soon   = new Date(now); soon.setDate(soon.getDate() + 30);
  if (expiry < now)  return 'expired';
  if (expiry <= soon) return 'expiring';
  return 'active';
}

function daysLeft(member) {
  const now    = new Date(); now.setHours(0, 0, 0, 0);
  const expiry = member.expiryDate instanceof Date ? member.expiryDate : new Date(member.expiryDate);
  return Math.ceil((expiry - now) / 86400000);
}

/* ─── Load Members ───────────────────────────────────────── */
async function loadMembers() {
  setLoader('membersLoader', true);
  setLoader('analyticsLoader', true);
  try {
    allMembers = await getAllMembers();
    renderMembers(allMembers);
    renderAnalytics();
  } catch (err) {
    console.error(err);
    showToast('Could not load members. Check your connection.', 'error');
  } finally {
    setLoader('membersLoader', false);
    setLoader('analyticsLoader', false);
  }
}

function setLoader(id, show) {
  const el = document.getElementById(id);
  if (el) el.hidden = !show;
}

/* ─── Members Grid ───────────────────────────────────────── */
function renderMembers(list) {
  const grid  = document.getElementById('membersGrid');
  const empty = document.getElementById('membersEmpty');

  if (!list.length) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = list.map(m => {
    const st     = memberStatus(m);
    const days   = daysLeft(m);
    const label  = st === 'expired'
      ? `Expired ${Math.abs(days)}d ago`
      : `${days}d remaining`;
    const chipLabel = st === 'expiring' ? 'Expiring Soon' : cap(st);

    return `
      <div class="member-card member-card--${st}" role="button" tabindex="0"
           onclick="openDetail('${esc(m.id)}')"
           onkeydown="if(event.key==='Enter'||event.key===' ')openDetail('${esc(m.id)}')">
        <div class="mc-head">
          <span class="mc-number">${esc(m.memberNumber)}</span>
          <span class="chip chip--${st}">${chipLabel}</span>
        </div>
        <div class="mc-name">${esc(m.memberName)}</div>
        <div class="mc-meta">
          <span class="badge badge--${(m.membershipType||'').toLowerCase()}">${esc(m.membershipType)}</span>
          <span class="mc-phone">${esc(m.phoneNumber)}</span>
        </div>
        <div class="mc-expiry">
          <span class="mc-expiry-date">Expires ${fmt(m.expiryDate)}</span>
          <span class="mc-days mc-days--${st}">${label}</span>
        </div>
      </div>`;
  }).join('');
}

/* ─── Search ─────────────────────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) { renderMembers(allMembers); return; }
  renderMembers(allMembers.filter(m =>
    (m.memberName   || '').toLowerCase().includes(q) ||
    (m.idNumber     || '').toLowerCase().includes(q) ||
    (m.memberNumber || '').toLowerCase().includes(q) ||
    (m.phoneNumber  || '').toLowerCase().includes(q)
  ));
});

/* ─── Member Detail Modal ────────────────────────────────── */
function openDetail(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;

  const st   = memberStatus(m);
  const days = daysLeft(m);
  const statusText = st === 'expired'
    ? `Expired ${Math.abs(days)} days ago`
    : st === 'expiring'
      ? `Expiring Soon — ${days} days left`
      : `Active — ${days} days remaining`;

  document.getElementById('detailNumber').textContent   = m.memberNumber;
  document.getElementById('detailName').textContent     = m.memberName;
  document.getElementById('detailId').textContent       = m.idNumber;
  document.getElementById('detailPhone').textContent    = m.phoneNumber;
  document.getElementById('detailEmployee').textContent = m.employeeName;
  document.getElementById('detailAdded').textContent    = fmt(m.dateAdded);
  document.getElementById('detailExpiry').textContent   = fmt(m.expiryDate);

  const typeEl = document.getElementById('detailType');
  typeEl.textContent = m.membershipType;
  typeEl.className   = `badge badge--${(m.membershipType || '').toLowerCase()}`;

  const stEl = document.getElementById('detailStatus');
  stEl.textContent = statusText;
  stEl.className   = `chip chip--${st}`;

  document.getElementById('deleteBtn').onclick = () => confirmDelete(id);

  /* Load local ID photo from IndexedDB (stored on device, no cloud) */
  const imgWrap = document.getElementById('detailIdPhotoWrap');
  const imgEl   = document.getElementById('detailIdPhoto');
  imgWrap.hidden = true;
  imgEl.src = '';
  getIdImageLocally(m.memberNumber).then(dataUrl => {
    if (dataUrl) { imgEl.src = dataUrl; imgWrap.hidden = false; }
  }).catch(() => {});

  document.getElementById('memberDetailModal').hidden = false;
}

function closeDetail() {
  document.getElementById('memberDetailModal').hidden = true;
}

document.getElementById('closeDetail').addEventListener('click', closeDetail);
document.getElementById('closeDetailFooter').addEventListener('click', closeDetail);
document.getElementById('memberDetailModal').addEventListener('click', e => {
  if (e.target === document.getElementById('memberDetailModal')) closeDetail();
});

async function confirmDelete(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`Remove ${m.memberName} (${m.memberNumber})?\nThis cannot be undone.`)) return;
  try {
    await deleteMember(id);
    allMembers = allMembers.filter(x => x.id !== id);
    closeDetail();
    renderMembers(allMembers);
    renderAnalytics();
    showToast(`${m.memberName} removed.`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Could not remove member.', 'error');
  }
}

/* ─── Analytics ──────────────────────────────────────────── */
function renderAnalytics() {
  const total    = allMembers.length;
  const active   = allMembers.filter(m => memberStatus(m) === 'active').length;
  const expiring = allMembers.filter(m => memberStatus(m) === 'expiring').length;
  const expired  = allMembers.filter(m => memberStatus(m) === 'expired').length;
  const basic    = allMembers.filter(m => m.membershipType === 'Basic').length;
  const premium  = allMembers.filter(m => m.membershipType === 'Premium').length;

  document.getElementById('statTotal').textContent    = total;
  document.getElementById('statActive').textContent   = active;
  document.getElementById('statExpiring').textContent = expiring;
  document.getElementById('statExpired').textContent  = expired;
  document.getElementById('statBasic').textContent    = basic;
  document.getElementById('statPremium').textContent  = premium;

  buildMonthlyChart();
  buildTypeChart(basic, premium);
}

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#8b95a1', font: { family: 'inherit' } } } }
};

function buildMonthlyChart() {
  const labels = [];
  const data   = [];
  const now    = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    data.push(
      allMembers.filter(m => {
        if (!m.dateAdded) return false;
        const a = m.dateAdded instanceof Date ? m.dateAdded : new Date(m.dateAdded);
        return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth();
      }).length
    );
  }

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'New Members',
        data,
        backgroundColor: 'rgba(62,207,110,0.65)',
        borderColor:     '#3ecf6e',
        borderWidth: 1,
        borderRadius: 5
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ticks: { color: '#8b95a1' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8b95a1', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}

function buildTypeChart(basic, premium) {
  const ctx = document.getElementById('typeChart').getContext('2d');
  if (typeChart) typeChart.destroy();
  typeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Basic', 'Premium'],
      datasets: [{
        data: [basic, premium],
        backgroundColor: ['rgba(59,130,246,0.75)', 'rgba(168,85,247,0.75)'],
        borderColor:     ['#3b82f6', '#a855f7'],
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' }
      }
    }
  });
}

/* ─── Add Member Form ────────────────────────────────────── */
async function initForm() {
  /* Default date = today */
  const dateInput = document.getElementById('formDate');
  dateInput.value = new Date().toISOString().slice(0, 10);

  /* Auto-fill member number preview */
  await refreshMemberNumber();

  /* Membership type info box */
  document.getElementById('formMembershipType').addEventListener('change', e => {
    const box  = document.getElementById('membershipInfoBox');
    const text = document.getElementById('membershipInfoText');
    if (e.target.value === 'Basic') {
      text.textContent = 'Basic membership — valid for 12 months.';
      box.hidden = false;
    } else if (e.target.value === 'Premium') {
      text.textContent = 'Premium membership — valid for 12 months, includes a complimentary joint on the house! 🌿';
      box.hidden = false;
    } else {
      box.hidden = true;
    }
  });
}

async function refreshMemberNumber() {
  const input = document.getElementById('formMemberNumber');
  if (isAutoNumber) {
    input.readOnly = true;
    input.value = 'Generating…';
    try {
      input.value = await peekNextMemberNumber();
    } catch (_) {
      input.value = 'BUD-001';
    }
  }
}

document.getElementById('manualNumberToggle').addEventListener('change', async e => {
  isAutoNumber = !e.target.checked;
  const input = document.getElementById('formMemberNumber');
  if (isAutoNumber) {
    input.readOnly = true;
    await refreshMemberNumber();
  } else {
    input.readOnly = false;
    input.value = '';
    input.focus();
  }
});

document.getElementById('addMemberForm').addEventListener('submit', async e => {
  e.preventDefault();

  const btn = document.getElementById('addMemberSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-sm"></span> Saving…';

  const formData = {
    employeeName:   document.getElementById('formEmployeeName').value,
    membershipType: document.getElementById('formMembershipType').value,
    memberNumber:   document.getElementById('formMemberNumber').value,
    memberName:     document.getElementById('formMemberName').value,
    idNumber:       document.getElementById('formIdNumber').value,
    date:           document.getElementById('formDate').value,
    phoneNumber:    document.getElementById('formPhone').value
  };

  /* Basic validation */
  if (!formData.employeeName || !formData.membershipType || !formData.memberName ||
      !formData.idNumber || !formData.date || !formData.phoneNumber) {
    showToast('Please fill in all required fields.', 'error');
    btn.disabled = false;
    btn.innerHTML = '+ Add Member &amp; Capture ID';
    return;
  }

  if (!isAutoNumber && !formData.memberNumber.trim()) {
    showToast('Please enter a member number.', 'error');
    btn.disabled = false;
    btn.innerHTML = '+ Add Member &amp; Capture ID';
    return;
  }

  const savedName = formData.memberName;
  const savedId   = formData.idNumber;

  try {
    const { memberNumber } = await addMember(formData, isAutoNumber);

    /* Refresh local cache */
    allMembers = await getAllMembers();

    showToast(`${savedName} (${memberNumber}) added successfully!`, 'success');

    /* Reset form */
    document.getElementById('addMemberForm').reset();
    document.getElementById('formDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('membershipInfoBox').hidden = true;
    isAutoNumber = true;
    document.getElementById('manualNumberToggle').checked = false;
    document.getElementById('formMemberNumber').readOnly = true;
    await refreshMemberNumber();

    /* Open camera to capture ID photo */
    await initCamera(savedName, savedId, memberNumber);

  } catch (err) {
    console.error(err);
    showToast('Failed to add member. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '+ Add Member &amp; Capture ID';
  }
});

/* ─── Bootstrap ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Always show the UI even if Firebase fails on first load */
  try { await loadMembers(); } catch (_) {}
  await initForm();
  switchTab('analytics');
});
