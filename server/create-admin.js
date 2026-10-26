import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'

const username = String(process.env.INITIAL_ADMIN_USERNAME || '').trim()
const password = String(process.env.INITIAL_ADMIN_PASSWORD || '')

if (!username || !password || password.startsWith('replace-this')) {
  throw new Error('Set INITIAL_ADMIN_USERNAME and a strong INITIAL_ADMIN_PASSWORD in .env before creating the administrator.')
}
if (password.length < 12) {
  throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters.')
}

try {
  const [existingUsers] = await pool.execute('SELECT id FROM users WHERE username = ?', [username])
  if (existingUsers.length) {
    throw new Error(`Administrator "${username}" already exists; no changes were made.`)
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await pool.execute(
    'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
    [username, passwordHash, username, 'admin'],
  )
  console.log(`Administrator "${username}" created.`)
} finally {
  await pool.end()
}
