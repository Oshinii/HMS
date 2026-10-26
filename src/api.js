const apiBase = '/api'
const stateKeys = new Set([
  'hms-patients',
  'hms-appointments',
  'hms-medical-records',
  'hms-patient-test-results',
  'hms-patient-documents',
  'hms-medicine-receipts',
  'hms-attendance',
  'hms-profile',
  'hms-doctors',
  'hms-staff',
  'hms-billing',
  'hms-reports',
  'hms-settings',
  'hms-pharmacy-inventory',
  'hms-pharmacy-prescriptions',
  'hms-laboratory-requests',
  'hms-laboratory-status-overrides',
  'hms-laboratory-new-request-count-v2',
  'hms-collected-test-report-count-v2',
  'hms-processing-test-count-v2',
])
export const backendStateKeys = [...stateKeys]
const pendingWrites = new Map()

const request = async (path, options = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.method && options.method !== 'GET' ? { 'X-Requested-With': 'hms-client' } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || `The server returned ${response.status}.`)
    error.status = response.status
    throw error
  }
  return body
}

export const checkSession = () => request('/auth/session')
export const signIn = (username, password) => request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
})
export const signOut = () => request('/auth/logout', { method: 'POST' })
export const updatePassword = (currentPassword, newPassword) => request('/auth/password', {
  method: 'POST',
  body: JSON.stringify({ currentPassword, newPassword }),
})
export const loadBackendState = async () => (await request('/state')).state
export const saveBackendState = (key, value) => request(`/state/${encodeURIComponent(key)}`, {
  method: 'PUT',
  body: JSON.stringify({ value }),
})

export const saveStored = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value))
  if (!stateKeys.has(key) || window.localStorage.getItem('hms-backend-ready') !== 'true') return

  const priorWrite = pendingWrites.get(key) || Promise.resolve()
  const nextWrite = priorWrite
    .catch(() => {})
    .then(() => saveBackendState(key, value))
    .catch((error) => {
      window.dispatchEvent(new CustomEvent('hms-backend-error', { detail: error.message }))
    })
    .finally(() => {
      if (pendingWrites.get(key) === nextWrite) pendingWrites.delete(key)
    })
  pendingWrites.set(key, nextWrite)
}
