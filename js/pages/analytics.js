import { fetchAnalytics } from '../firebase.js'

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-green-400">Analytics</h1>
        <p class="text-slate-500 text-sm mt-1">Membership overview</p>
      </div>
      <div id="analytics-inner" class="flex justify-center py-20">
        <div class="w-8 h-8 rounded-full border-2 border-green-400 border-t-transparent spin"></div>
      </div>
    </div>`

  try {
    const s = await fetchAnalytics()
    if (!container.isConnected) return
    const inner = container.querySelector('#analytics-inner')
    if (!inner) return
    const pPct = s.total > 0 ? (s.premium / s.total * 100) : 0
    const bPct = s.total > 0 ? (s.basic / s.total * 100) : 0
    const aPct = s.total > 0 ? (s.active / s.total * 100) : 0
    const ePct = s.total > 0 ? (s.expired / s.total * 100) : 0

    inner.innerHTML = `
      <div class="space-y-4 w-full">
        <div class="grid grid-cols-2 gap-3">
          ${stat('Total Members', s.total, '#4ade80', true)}
          ${stat('Active', s.active, '#34d399')}
          ${stat('Expired', s.expired, '#f87171')}
          ${stat('Premium', s.premium, '#facc15')}
          ${stat('Basic', s.basic, '#60a5fa')}
        </div>
        ${s.total > 0 ? `
        <div class="rounded-2xl p-5 border border-[#2d3748]" style="background:#1a1f2e">
          <p class="text-sm text-slate-400 mb-3 font-medium">Membership Breakdown</p>
          <div class="flex rounded-full overflow-hidden h-3" style="background:#2d3748">
            <div style="width:${pPct}%;background:#facc15"></div>
            <div style="width:${bPct}%;background:#22c55e"></div>
          </div>
          <div class="flex gap-5 mt-3 text-xs text-slate-400">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:#facc15;display:inline-block"></span>Premium (${s.premium})</span>
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:#22c55e;display:inline-block"></span>Basic (${s.basic})</span>
          </div>
        </div>
        <div class="rounded-2xl p-5 border border-[#2d3748]" style="background:#1a1f2e">
          <p class="text-sm text-slate-400 mb-3 font-medium">Active vs Expired</p>
          <div class="flex rounded-full overflow-hidden h-3" style="background:#2d3748">
            <div style="width:${aPct}%;background:#34d399"></div>
            <div style="width:${ePct}%;background:#f87171"></div>
          </div>
          <div class="flex gap-5 mt-3 text-xs text-slate-400">
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:#34d399;display:inline-block"></span>Active (${s.active})</span>
            <span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:50%;background:#f87171;display:inline-block"></span>Expired (${s.expired})</span>
          </div>
        </div>
        ` : '<p class="text-center text-slate-500 py-8">No members yet. Add your first member to see analytics.</p>'}
      </div>`
  } catch (err) {
    console.error(err)
    if (!container.isConnected) return
    const inner = container.querySelector('#analytics-inner')
    if (inner) inner.innerHTML =
      '<p class="text-center text-red-400 py-8">Failed to load analytics. Check your connection.</p>'
  }
}

function stat(label, value, color, full = false) {
  return `
    <div class="${full ? 'col-span-2 ' : ''}rounded-2xl p-4 border border-[#2d3748]" style="background:#1a1f2e">
      <p class="text-slate-400 text-sm">${label}</p>
      <p class="text-4xl font-bold mt-1" style="color:${color}">${value}</p>
    </div>`
}
