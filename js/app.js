import { renderAnalytics } from './pages/analytics.js'
import { renderMembers } from './pages/members.js'
import { renderAddMember } from './pages/add-member.js'

const routes = { analytics: renderAnalytics, members: renderMembers, add: renderAddMember }
const main = document.getElementById('app-main')

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '')
  return routes[hash] ? hash : 'analytics'
}

async function navigate(route) {
  location.hash = '#/' + route
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === route)
  })
  try {
    await routes[route](main)
  } catch (err) {
    console.error(err)
    main.innerHTML = '<p class="text-center text-red-400 py-12">Something went wrong. Please try again.</p>'
  }
}

// Nav clicks
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.route))
})

// Browser back/forward
window.addEventListener('hashchange', () => navigate(currentRoute()))

// PWA install prompt
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferredPrompt = e
  const container = document.getElementById('install-btn-container')
  container.innerHTML = `
    <button id="install-pwa-btn" style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#22c55e;color:#000;font-weight:700;border-radius:8px;font-size:14px;border:none;cursor:pointer;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Install App
    </button>`
  document.getElementById('install-pwa-btn').addEventListener('click', async () => {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') container.innerHTML = ''
    deferredPrompt = null
  })
})

window.addEventListener('appinstalled', () => {
  document.getElementById('install-btn-container').innerHTML = ''
})

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error)
}

// Initial navigation
navigate(currentRoute())
