import 'dotenv/config'
import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { pool } from './db.js'

const port = Number(process.env.PORT || 3001)
const appOrigin = process.env.APP_ORIGIN || 'http://localhost:5173'
const sessionSecret = process.env.SESSION_SECRET || ''
if (sessionSecret.length < 32 || sessionSecret.startsWith('replace-this')) {
  throw new Error('Set SESSION_SECRET to a random value of at least 32 characters in .env.')
}

const allowedStateKeys = new Set([
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
const arrayStateKeys = new Set([
  'hms-patients',
  'hms-appointments',
  'hms-medical-records',
  'hms-patient-test-results',
  'hms-medicine-receipts',
  'hms-attendance',
  'hms-doctors',
  'hms-staff',
  'hms-billing',
  'hms-reports',
  'hms-pharmacy-inventory',
  'hms-pharmacy-prescriptions',
  'hms-laboratory-requests',
])
const objectStateKeys = new Set([
  'hms-patient-documents',
  'hms-profile',
  'hms-settings',
  'hms-laboratory-status-overrides',
])

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false)
app.use(helmet())
app.use(express.json({ limit: '20mb' }))

const getSessionToken = (request) => {
  const cookie = request.headers.cookie?.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith('hms_session='))
  return cookie ? decodeURIComponent(cookie.slice('hms_session='.length)) : ''
}
const hashSession = (token) => crypto.createHash('sha256').update(`${sessionSecret}:${token}`).digest('hex')
const setSessionCookie = (response, token, maxAge) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `hms_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`)
}
const clearSessionCookie = (response) => setSessionCookie(response, '', 0)
const requireSession = async (request, response, next) => {
  try {
    const token = getSessionToken(request)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      response.status(401).json({ error: 'Please sign in to continue.' })
      return
    }
    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.full_name AS fullName, u.role
       FROM app_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.session_hash = ? AND s.expires_at > UTC_TIMESTAMP()`,
      [hashSession(token)],
    )
    if (!rows.length) {
      clearSessionCookie(response)
      response.status(401).json({ error: 'Your session expired. Please sign in again.' })
      return
    }
    request.user = rows[0]
    request.sessionHash = hashSession(token)
    next()
  } catch (error) {
    next(error)
  }
}
const requireSameOrigin = (request, response, next) => {
  const origin = request.get('origin')
  if (origin && origin !== appOrigin) {
    response.status(403).json({ error: 'Request origin is not allowed.' })
    return
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    && request.get('x-requested-with') !== 'hms-client') {
    response.status(403).json({ error: 'Request verification failed.' })
    return
  }
  next()
}
app.use('/api', requireSameOrigin)

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' },
})

app.get('/api/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1')
    response.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/session', async (request, response, next) => {
  try {
    const token = getSessionToken(request)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      response.json({ authenticated: false })
      return
    }
    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.full_name AS fullName, u.role
       FROM app_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.session_hash = ? AND s.expires_at > UTC_TIMESTAMP()`,
      [hashSession(token)],
    )
    if (!rows.length) {
      clearSessionCookie(response)
      response.json({ authenticated: false })
      return
    }
    response.json({ authenticated: true, user: rows[0] })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', loginLimiter, async (request, response, next) => {
  try {
    const username = String(request.body?.username || '').trim()
    const password = String(request.body?.password || '')
    if (!username || !password || username.length > 100 || password.length > 1024) {
      response.status(400).json({ error: 'Enter a valid username and password.' })
      return
    }
    const [users] = await pool.execute(
      'SELECT id, username, full_name AS fullName, role, password_hash FROM users WHERE username = ?',
      [username],
    )
    const user = users[0]
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!passwordMatches) {
      response.status(401).json({ error: 'Incorrect username or password.' })
      return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const maxAgeSeconds = 8 * 60 * 60
    const sessionHash = hashSession(token)
    await pool.execute(
      'INSERT INTO app_sessions (session_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))',
      [sessionHash, user.id, maxAgeSeconds],
    )
    setSessionCookie(response, token, maxAgeSeconds)
    response.json({ user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', requireSession, async (request, response, next) => {
  try {
    await pool.execute('DELETE FROM app_sessions WHERE session_hash = ?', [request.sessionHash])
    clearSessionCookie(response)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/password', requireSession, async (request, response, next) => {
  try {
    const currentPassword = String(request.body?.currentPassword || '')
    const newPassword = String(request.body?.newPassword || '')
    if (!currentPassword || newPassword.length < 12 || newPassword.length > 1024) {
      response.status(400).json({ error: 'Enter your current password and a new password with at least 12 characters.' })
      return
    }

    const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [request.user.id])
    const user = users[0]
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      response.status(401).json({ error: 'The current password is incorrect.' })
      return
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, request.user.id])
    await pool.execute('DELETE FROM app_sessions WHERE user_id = ? AND session_hash <> ?', [request.user.id, request.sessionHash])
    response.json({ updated: true })
  } catch (error) {
    next(error)
  }
})

app.get('/api/state', requireSession, async (request, response, next) => {
  try {
    const [rows] = await pool.execute('SELECT state_key, state_value FROM app_state WHERE user_id = ?', [request.user.id])
    const state = Object.fromEntries(rows.map(({ state_key: key, state_value: value }) => [key, value]))
    response.json({ state })
  } catch (error) {
    next(error)
  }
})

app.put('/api/state/:key', requireSession, async (request, response, next) => {
  try {
    const { key } = request.params
    if (!allowedStateKeys.has(key)) {
      response.status(404).json({ error: 'Unknown application data key.' })
      return
    }
    const { value } = request.body || {}
    if (value === undefined) {
      response.status(400).json({ error: 'A JSON value is required.' })
      return
    }
    if (arrayStateKeys.has(key) && !Array.isArray(value)) {
      response.status(400).json({ error: 'This data field must be a JSON array.' })
      return
    }
    if (objectStateKeys.has(key) && (!value || typeof value !== 'object' || Array.isArray(value))) {
      response.status(400).json({ error: 'This data field must be a JSON object.' })
      return
    }
    if (key.endsWith('-count-v2') && (!Number.isInteger(value) || value < 0)) {
      response.status(400).json({ error: 'This data field must be a non-negative integer.' })
      return
    }
    await pool.execute(
      `INSERT INTO app_state (user_id, state_key, state_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE state_value = VALUES(state_value), updated_at = CURRENT_TIMESTAMP`,
      [request.user.id, key, JSON.stringify(value)],
    )
    response.json({ saved: true, key })
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }))

const dirname = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.resolve(dirname, '..', 'dist')
if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory))
  app.get('/{*path}', (_request, response) => response.sendFile(path.join(distDirectory, 'index.html')))
}

app.use((error, _request, response, _next) => {
  console.error('HMS API error:', error.message)
  if (response.headersSent) return
  if (error.type === 'entity.too.large') {
    response.status(413).json({ error: 'The submitted data is too large to save.' })
    return
  }
  response.status(500).json({ error: 'A server error prevented this request.' })
})

const server = app.listen(port, async () => {
  try {
    await pool.query('SELECT 1')
    console.log(`HMS API listening on port ${port}.`)
  } catch (error) {
    console.error(`MySQL connection failed: ${error.message}`)
    server.close(() => process.exit(1))
  }
})

const sessionCleanup = setInterval(() => {
  pool.execute('DELETE FROM app_sessions WHERE expires_at <= UTC_TIMESTAMP()')
    .catch((error) => console.error(`Expired session cleanup failed: ${error.message}`))
}, 60 * 60 * 1000)
sessionCleanup.unref()
