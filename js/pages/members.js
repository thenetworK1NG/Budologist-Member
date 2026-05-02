import { fetchMembers } from '../firebase.js'

let allMembers = []

export async function renderMembers(container) {
  container.innerHTML = `
    <div class="space-y-4">
      <div>
        <h1 class="text-2xl font-bold text-green-400">Members</h1>
        <p id="member-count" class="text-slate-500 text-sm mt-1">Loading...</p>
      </div>
      <div style="position:relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#64748b;pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="search-input" type="text" placeholder="Search by name, ID, member #, phone..."
          style="width:100%;background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:12px 16px 12px 44px;color:#e2e8f0;outline:none;font-size:14px;"
          onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='#2d3748'" />
      </div>
      <div id="members-list" class="space-y-3">
        <div class="flex justify-center py-20">
          <div class="w-8 h-8 rounded-full border-2 border-green-400 border-t-transparent spin"></div>
        </div>
      </div>
    </div>`

  try {
    allMembers = await fetchMembers()
    if (!container.isConnected) return
    renderList(allMembers)
    const count = allMembers.length
    const countEl = container.querySelector('#member-count')
    if (countEl) countEl.textContent = `${count} total member${count !== 1 ? 's' : ''}`
  } catch (err) {
    console.error(err)
    if (!container.isConnected) return
    const listEl = container.querySelector('#members-list')
    if (listEl) listEl.innerHTML =
      '<p class="text-center text-red-400 py-8">Failed to load members. Check your connection.</p>'
  }

  document.getElementById('search-input')?.addEventListener('input', e => {
    const s = e.target.value.toLowerCase()
    const filtered = allMembers.filter(m =>
      (m.memberName || '').toLowerCase().includes(s) ||
      (m.memberNumber || '').toString().toLowerCase().includes(s) ||
      (m.idNumber || '').toLowerCase().includes(s) ||
      (m.phone || '').toLowerCase().includes(s) ||
      (m.employeeName || '').toLowerCase().includes(s)
    )
    renderList(filtered, e.target.value)
  })

  // Card expand via event delegation
  container.addEventListener('click', e => {
    const card = e.target.closest('.member-card')
    if (!card) return
    const details = card.querySelector('.card-details')
    const chevron = card.querySelector('.chevron')
    if (!details) return
    const isOpen = details.classList.contains('open')
    details.classList.toggle('open', !isOpen)
    chevron?.classList.toggle('flipped', !isOpen)
  })
}

function renderList(members, searchTerm = '') {
  const list = document.getElementById('members-list')
  if (!list) return
  if (members.length === 0) {
    list.innerHTML = `
      <div class="text-center py-20">
        <p class="text-slate-400 text-lg">${searchTerm ? 'No members found' : 'No members yet'}</p>
        <p class="text-slate-600 text-sm mt-2">${searchTerm ? `No results for "${esc(searchTerm)}"` : 'Add your first member using the tab below'}</p>
      </div>`
    return
  }
  list.innerHTML = members.map(memberCard).join('')
}

function memberCard(m) {
  const expiry = m.expiryDate?.toDate ? m.expiryDate.toDate() : new Date(m.expiryDate)
  const dateAdded = new Date(expiry.getTime() - 365 * 24 * 60 * 60 * 1000)
  const isActive = expiry > new Date()
  const isPremium = m.membershipType === 'Premium'
  const safePhoto = m.idPhotoUrl && m.idPhotoUrl.startsWith('https://') ? esc(m.idPhotoUrl) : ''

  return `
    <div class="member-card border border-[#2d3748] rounded-2xl p-4 cursor-pointer" style="background:#1a1f2e">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h3 class="font-semibold text-slate-100">${esc(m.memberName)}</h3>
            <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;${isPremium ? 'background:rgba(234,179,8,0.15);color:#facc15;border:1px solid rgba(234,179,8,0.3)' : 'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3)'}">${esc(m.membershipType)}</span>
            <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:500;${isActive ? 'background:rgba(52,211,153,0.1);color:#34d399' : 'background:rgba(248,113,113,0.1);color:#f87171'}">${isActive ? 'Active' : 'Expired'}</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">#${esc(m.memberNumber)} &bull; ${esc(m.phone)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${safePhoto ? `<img src="${safePhoto}" alt="ID" style="width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid #2d3748" />` : ''}
          <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <div class="card-details" style="margin-top:16px;padding-top:16px;border-top:1px solid #2d3748">
        ${row('ID Number', m.idNumber)}
        ${row('Phone', m.phone)}
        ${row('Employee', m.employeeName)}
        ${row('Date Added', dateAdded.toLocaleDateString('en-ZA'))}
        ${row('Expiry', expiry.toLocaleDateString('en-ZA'))}
        ${isPremium ? `<p style="margin-top:8px;padding:8px 12px;background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:10px;color:#facc15;font-size:12px">🌿 Joint on the house included with this membership</p>` : ''}
        ${m.signature ? `
          <div style="margin-top:12px">
            <p class="text-slate-400 text-xs" style="margin-bottom:8px">Signature</p>
            <div style="background:#fff;border-radius:12px;padding:8px;display:inline-block">
              <img src="${esc(m.signature)}" alt="Signature" style="max-height:64px;width:auto" />
            </div>
          </div>` : ''}
        ${safePhoto ? `
          <div style="margin-top:12px">
            <p class="text-slate-400 text-xs" style="margin-bottom:8px">ID Photo</p>
            <img src="${safePhoto}" alt="ID Photo" style="border-radius:12px;max-height:200px;width:auto;border:1px solid #2d3748" />
          </div>` : ''}
      </div>
    </div>`
}

function row(label, value) {
  return `<div style="display:flex;gap:12px;font-size:14px;margin-bottom:8px"><span style="color:#64748b;width:110px;flex-shrink:0">${label}</span><span style="color:#e2e8f0;word-break:break-all">${esc(value || '—')}</span></div>`
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
