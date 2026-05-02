import { saveMember } from '../firebase.js'
import { SignaturePad } from '../signature.js'
import { savePhoto } from '../localPhotos.js'

let sigPad = null
let pendingData = null
const TODAY = () => new Date().toISOString().split('T')[0]

const FIELD_LABELS = {
  employeeName: 'Employee Name',
  memberNumber: 'Member Number',
  memberName: 'Member Name',
  idNumber: 'ID Number',
  phone: 'Phone Number',
  date: 'Date'
}

export function renderAddMember(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-green-400">Add Member</h1>
        <p class="text-slate-500 text-sm mt-1">Fill in all details and capture the member's ID</p>
      </div>

      <form id="add-form" novalidate class="space-y-4">

        ${field('employeeName', 'Employee Name', 'text', 'Your name')}

        <!-- Membership Type -->
        <div>
          <label class="block text-sm text-slate-400 mb-2">Membership Type</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <button type="button" id="btn-Basic" data-type="Basic"
              style="padding:12px 16px;border-radius:12px;border:2px solid #4ade80;background:rgba(34,197,94,0.12);color:#4ade80;font-weight:700;font-size:14px;cursor:pointer;text-align:center">
              <div>Basic</div>
              <div style="font-size:11px;font-weight:400;opacity:0.7;margin-top:2px">12 month membership</div>
            </button>
            <button type="button" id="btn-Premium" data-type="Premium"
              style="padding:12px 16px;border-radius:12px;border:2px solid #2d3748;color:#64748b;font-weight:700;font-size:14px;cursor:pointer;background:transparent;text-align:center">
              <div>Premium</div>
              <div style="font-size:11px;font-weight:400;opacity:0.7;margin-top:2px">🌿 Joint on the house</div>
            </button>
          </div>
          <input type="hidden" id="membershipType" value="Basic" />
        </div>

        ${field('memberNumber', 'Member Number', 'text', 'e.g. 0042')}
        ${field('memberName', 'Member Name', 'text', 'Full name')}
        ${field('idNumber', 'ID Number', 'text', 'ID document number')}
        ${field('phone', 'Phone Number', 'tel', '+27 ...')}
        ${field('date', 'Date', 'date', '', TODAY())}

        <!-- Signature -->
        <div>
          <label class="block text-sm text-slate-400 mb-2">Signature <span style="color:#f87171">*</span></label>
          <div style="border:2px dashed #2d3748;border-radius:12px;overflow:hidden;background:#fff;touch-action:none">
            <canvas id="sig-canvas" style="width:100%;height:140px;display:block;cursor:crosshair"></canvas>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
            <p class="text-xs text-slate-500">Draw your signature above</p>
            <button type="button" id="sig-clear" style="font-size:12px;color:#64748b;background:none;border:none;cursor:pointer;padding:4px 8px">Clear</button>
          </div>
        </div>

        <!-- Error -->
        <div id="form-error" style="display:none;padding:12px 16px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);border-radius:12px;color:#f87171;font-size:14px"></div>

        <button type="submit" id="submit-btn"
          style="width:100%;padding:16px;background:#22c55e;color:#000;font-weight:700;border-radius:12px;border:none;cursor:pointer;font-size:16px;margin-top:8px">
          📷&nbsp; Save Member &amp; Capture ID Photo
        </button>
      </form>

      <!-- Hidden camera input -->
      <input id="camera-input" type="file" accept="image/*" capture="environment" style="display:none" />
    </div>`

  // Init signature pad
  sigPad = new SignaturePad(document.getElementById('sig-canvas'))

  // Clear signature
  document.getElementById('sig-clear').addEventListener('click', () => sigPad.clear())

  // Membership type toggle
  document.querySelectorAll('#add-form [data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type
      document.getElementById('membershipType').value = type
      document.getElementById('btn-Basic').style.cssText = type === 'Basic'
        ? 'padding:12px 16px;border-radius:12px;border:2px solid #4ade80;background:rgba(34,197,94,0.12);color:#4ade80;font-weight:700;font-size:14px;cursor:pointer;text-align:center'
        : 'padding:12px 16px;border-radius:12px;border:2px solid #2d3748;color:#64748b;font-weight:700;font-size:14px;cursor:pointer;background:transparent;text-align:center'
      document.getElementById('btn-Premium').style.cssText = type === 'Premium'
        ? 'padding:12px 16px;border-radius:12px;border:2px solid #facc15;background:rgba(234,179,8,0.12);color:#facc15;font-weight:700;font-size:14px;cursor:pointer;text-align:center'
        : 'padding:12px 16px;border-radius:12px;border:2px solid #2d3748;color:#64748b;font-weight:700;font-size:14px;cursor:pointer;background:transparent;text-align:center'
    })
  })

  // Form submit
  document.getElementById('add-form').addEventListener('submit', e => {
    e.preventDefault()
    const errEl = document.getElementById('form-error')
    errEl.style.display = 'none'

    for (const [id, label] of Object.entries(FIELD_LABELS)) {
      if (!(document.getElementById(id)?.value?.trim())) {
        errEl.textContent = `${label} is required.`
        errEl.style.display = 'block'
        return
      }
    }

    if (sigPad.isEmpty()) {
      errEl.textContent = 'Please draw a signature.'
      errEl.style.display = 'block'
      return
    }

    pendingData = {
      employeeName: document.getElementById('employeeName').value.trim(),
      membershipType: document.getElementById('membershipType').value,
      memberNumber: document.getElementById('memberNumber').value.trim(),
      memberName: document.getElementById('memberName').value.trim(),
      idNumber: document.getElementById('idNumber').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      date: document.getElementById('date').value,
      signature: sigPad.toDataURL()
    }

    document.getElementById('camera-input').click()
  })

  // Photo selected / taken
  document.getElementById('camera-input').addEventListener('change', async e => {
    const file = e.target.files?.[0]
    if (!file) return

    const btn = document.getElementById('submit-btn')
    const errEl = document.getElementById('form-error')
    btn.disabled = true
    btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:8px"></span>Saving...'

    try {
      await saveMember(pendingData)
      const photoKey = `photo-${pendingData.memberNumber}-${Date.now()}`
      await savePhoto(photoKey, file)
      showSuccess(container)
    } catch (err) {
      console.error(err)
      errEl.textContent = 'Failed to save member. Please try again.'
      errEl.style.display = 'block'
      btn.disabled = false
      btn.innerHTML = '📷&nbsp; Save Member &amp; Capture ID Photo'
    } finally {
      e.target.value = ''
    }
  })
}

function showSuccess(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 0;gap:24px;text-align:center">
      <div style="width:96px;height:96px;border-radius:50%;background:rgba(34,197,94,0.15);border:2px solid rgba(34,197,94,0.35);display:flex;align-items:center;justify-content:center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <h2 class="text-2xl font-bold text-green-400">Member Added!</h2>
        <p class="text-slate-400 mt-2">The member has been saved successfully.</p>
      </div>
      <button id="add-another-btn" style="padding:12px 32px;background:#22c55e;color:#000;font-weight:700;border-radius:12px;border:none;cursor:pointer;font-size:16px">
        Add Another Member
      </button>
    </div>`
  document.getElementById('add-another-btn').addEventListener('click', () => renderAddMember(container))
}

function field(id, label, type = 'text', placeholder = '', defaultValue = '') {
  return `
    <div>
      <label style="display:block;font-size:14px;color:#94a3b8;margin-bottom:6px" for="${id}">
        ${label} <span style="color:#f87171">*</span>
      </label>
      <input type="${type}" id="${id}" name="${id}" placeholder="${placeholder}" value="${defaultValue}"
        style="width:100%;background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:12px 16px;color:#e2e8f0;outline:none;font-size:15px"
        onfocus="this.style.borderColor='#22c55e';this.style.boxShadow='0 0 0 3px rgba(34,197,94,0.15)'"
        onblur="this.style.borderColor='#2d3748';this.style.boxShadow='none'" />
    </div>`
}
