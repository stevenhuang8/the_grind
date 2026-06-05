'use strict'

// XP values mirrored from types/index.ts STAGE_XP
const STAGE_XP = {
  applied: 50,
  in_review: 25,
  interview: 200,
  final_round: 400,
  offer: 1000,
  rejected: 75,
  ghosted: 0,
}

// ─── Storage helpers ───────────────────────────────────────────────────────────

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve))
}

function storageSyncGet(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve))
}

function storageSet(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve))
}

function storageSyncSet(obj) {
  return new Promise(resolve => chrome.storage.sync.set(obj, resolve))
}

function storageClear(keys) {
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve))
}

// ─── Config ───────────────────────────────────────────────────────────────────

async function loadConfig() {
  return storageSyncGet(['supabaseUrl', 'supabaseAnonKey', 'appUrl'])
}

async function saveConfig(supabaseUrl, supabaseAnonKey, appUrl) {
  return storageSyncSet({
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    supabaseAnonKey,
    appUrl: (appUrl || 'http://localhost:3000').replace(/\/$/, ''),
  })
}

// ─── Session ──────────────────────────────────────────────────────────────────

async function loadSession() {
  return storageGet(['accessToken', 'refreshToken', 'userId', 'expiresAt'])
}

async function persistSession(data) {
  await storageSet({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user?.id ?? data.user_id,
    // expires_at from Supabase is a Unix timestamp (seconds)
    expiresAt: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  })
}

async function clearSession() {
  return storageClear(['accessToken', 'refreshToken', 'userId', 'expiresAt'])
}

// ─── Auth (Supabase REST — no SDK) ────────────────────────────────────────────

async function signIn(supabaseUrl, anonKey, email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error_description || body.message || 'Sign in failed')
  return body
}

async function refreshSessionToken(supabaseUrl, anonKey, refreshTok) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
    body: JSON.stringify({ refresh_token: refreshTok }),
  })
  if (!res.ok) throw new Error('Session expired. Please sign in again.')
  return res.json()
}

async function getValidToken(config) {
  const stored = await loadSession()
  if (!stored.accessToken) throw new Error('not_logged_in')

  const nowSec = Math.floor(Date.now() / 1000)
  if (stored.expiresAt - nowSec < 60) {
    const refreshed = await refreshSessionToken(config.supabaseUrl, config.supabaseAnonKey, stored.refreshToken)
    await persistSession(refreshed)
    return { token: refreshed.access_token, userId: refreshed.user?.id ?? stored.userId }
  }

  return { token: stored.accessToken, userId: stored.userId }
}

// ─── Page extraction ──────────────────────────────────────────────────────────

async function extractPageData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const url = location.href
      const title = document.title
      const hostname = location.hostname

      // Clone body to avoid mutating the live page
      const clone = document.body.cloneNode(true)

      // Strip structural noise before reading text
      const noiseSelectors = [
        'nav', 'header', 'footer',
        '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
        'script', 'style', 'noscript',
      ]
      noiseSelectors.forEach(sel => {
        clone.querySelectorAll(sel).forEach(el => el.remove())
      })

      // Site-specific container targeting (falls back to full cleaned body)
      let jobSection = null
      if (hostname.includes('linkedin.com')) {
        jobSection = clone.querySelector([
          '.jobs-details__main-content',
          '.job-view-layout__main-content',
          '[class*="jobs-details"]',
          '.scaffold-layout__main',
        ].join(', '))
      } else if (hostname.includes('greenhouse.io')) {
        jobSection = clone.querySelector('#app_body, .job__description, .job-post')
      } else if (hostname.includes('lever.co')) {
        jobSection = clone.querySelector('.posting-description, main')
      } else if (hostname.includes('indeed.com')) {
        jobSection = clone.querySelector('#jobDescriptionText, .jobsearch-JobComponent')
      } else if (hostname.includes('workday.com')) {
        jobSection = clone.querySelector('[data-automation-id="job-posting-details"]')
      }

      const bodyText = (jobSection || clone).innerText

      return {
        url,
        // Prepend title — LinkedIn format: "Job Title at Company | LinkedIn"
        pageText: `Page title: ${title}\nURL: ${url}\n\n${bodyText.slice(0, 12000)}`,
      }
    },
  })
  return results[0].result
}

// ─── Capture API call ─────────────────────────────────────────────────────────

async function captureJobFromPage(appUrl, token, url, pageText) {
  const res = await fetch(`${appUrl}/api/jobs/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ url, pageText }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Capture failed (${res.status}): ${text}`)
  }
  return res.json() // { company, role, notes }
}

// ─── Save to Supabase REST ────────────────────────────────────────────────────

async function saveApplication(config, token, userId, form) {
  const stage = form.stage || 'applied'
  const payload = {
    company: form.company,
    role: form.role,
    stage,
    applied_date: form.appliedDate,
    url: form.url || null,
    notes: form.notes || null,
    user_id: userId,
    xp_awarded: STAGE_XP[stage] ?? 50,
  }

  const res = await fetch(`${config.supabaseUrl}/rest/v1/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': config.supabaseAnonKey,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Save failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const VIEWS = ['#setup-view', '#auth-view', '#loading-view', '#form-view', '#success-view']

function showView(id) {
  VIEWS.forEach(sel => {
    document.querySelector(sel).style.display = 'none'
  })
  document.querySelector(id).style.display = 'block'

  // Header action visibility
  const signOutEl = document.querySelector('#sign-out-link')
  const editConfigEl = document.querySelector('#edit-config-link')
  const activeInSession = id === '#form-view' || id === '#loading-view' || id === '#success-view'
  signOutEl.style.display = activeInSession ? 'inline' : 'none'
  editConfigEl.style.display = id === '#auth-view' ? 'inline' : 'none'
}

function setLoading(text) {
  document.querySelector('#loading-text').textContent = text
  showView('#loading-view')
}

function showError(viewSelector, msg) {
  const el = document.querySelector(`${viewSelector} .error-msg`)
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
}

function hideError(viewSelector) {
  const el = document.querySelector(`${viewSelector} .error-msg`)
  if (el) el.style.display = 'none'
}

function populateForm(jobData, url) {
  const today = new Date().toISOString().split('T')[0]
  document.querySelector('#field-company').value = jobData.company || ''
  document.querySelector('#field-role').value = jobData.role || ''
  document.querySelector('#field-notes').value = jobData.notes || ''
  document.querySelector('#field-url').value = url || ''
  document.querySelector('#field-date').value = today
  document.querySelector('#field-stage').value = 'applied'
  hideError('#form-view')
  showView('#form-view')
}

function showSuccess(stage) {
  const xp = STAGE_XP[stage] ?? 50
  document.querySelector('#xp-amount').textContent = `+${xp} XP`
  showView('#success-view')
}

// ─── Core capture flow ────────────────────────────────────────────────────────

async function runCapture(config) {
  try {
    const { token } = await getValidToken(config)

    setLoading('Reading page...')
    const { url, pageText } = await extractPageData()

    setLoading('Extracting job details...')
    const jobData = await captureJobFromPage(config.appUrl || 'http://localhost:3000', token, url, pageText)

    populateForm(jobData, url)
  } catch (err) {
    if (err.message === 'not_logged_in' || err.message.includes('expired')) {
      await clearSession()
      showView('#auth-view')
    } else {
      // Non-auth error — show empty form so user can fill manually
      populateForm({}, '')
      showError('#form-view', err.message)
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const config = await loadConfig()

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    showView('#setup-view')
    return
  }

  const stored = await loadSession()
  if (!stored.accessToken) {
    showView('#auth-view')
    return
  }

  await runCapture(config)
}

// ─── Event listeners ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init()

  // Setup form
  document.querySelector('#setup-form').addEventListener('submit', async e => {
    e.preventDefault()
    hideError('#setup-view')

    const supabaseUrl = document.querySelector('#setup-supabase-url').value.trim()
    const supabaseAnonKey = document.querySelector('#setup-anon-key').value.trim()
    const appUrl = document.querySelector('#setup-app-url').value.trim()

    try {
      await saveConfig(supabaseUrl, supabaseAnonKey, appUrl)
      showView('#auth-view')
    } catch (err) {
      showError('#setup-view', err.message)
    }
  })

  // Auth form
  document.querySelector('#auth-form').addEventListener('submit', async e => {
    e.preventDefault()
    hideError('#auth-view')

    const email = document.querySelector('#auth-email').value
    const password = document.querySelector('#auth-password').value
    const btn = document.querySelector('#auth-submit')
    btn.disabled = true
    btn.textContent = '...'

    try {
      const config = await loadConfig()
      const data = await signIn(config.supabaseUrl, config.supabaseAnonKey, email, password)
      await persistSession(data)
      await runCapture(config)
    } catch (err) {
      showError('#auth-view', err.message)
    } finally {
      btn.disabled = false
      btn.textContent = 'Enter the Grind'
    }
  })

  // Job form
  document.querySelector('#job-form').addEventListener('submit', async e => {
    e.preventDefault()
    hideError('#form-view')

    const submitBtn = document.querySelector('#form-submit')
    submitBtn.disabled = true
    submitBtn.textContent = 'Saving...'

    try {
      const config = await loadConfig()
      const { token, userId } = await getValidToken(config)

      const stage = document.querySelector('#field-stage').value
      const form = {
        company: document.querySelector('#field-company').value,
        role: document.querySelector('#field-role').value,
        stage,
        appliedDate: document.querySelector('#field-date').value,
        url: document.querySelector('#field-url').value,
        notes: document.querySelector('#field-notes').value,
      }

      await saveApplication(config, token, userId, form)
      showSuccess(stage)
    } catch (err) {
      showError('#form-view', err.message)
      submitBtn.disabled = false
      submitBtn.textContent = 'Add to Grind'
    }
  })

  // Rescan button
  document.querySelector('#form-rescan').addEventListener('click', async () => {
    const config = await loadConfig()
    await runCapture(config)
  })

  // Capture another job (from success view)
  document.querySelector('#capture-another-btn').addEventListener('click', async () => {
    const config = await loadConfig()
    await runCapture(config)
  })

  // Open app
  document.querySelector('#open-app-btn').addEventListener('click', async () => {
    const config = await loadConfig()
    chrome.tabs.create({ url: config.appUrl || 'http://localhost:3000' })
  })

  // Sign out
  document.querySelector('#sign-out-link').addEventListener('click', async e => {
    e.preventDefault()
    await clearSession()
    showView('#auth-view')
  })

  // Edit config
  document.querySelector('#edit-config-link').addEventListener('click', async e => {
    e.preventDefault()
    const config = await loadConfig()
    // Pre-fill existing values
    document.querySelector('#setup-supabase-url').value = config.supabaseUrl || ''
    document.querySelector('#setup-anon-key').value = config.supabaseAnonKey || ''
    document.querySelector('#setup-app-url').value = config.appUrl || ''
    showView('#setup-view')
  })
})
