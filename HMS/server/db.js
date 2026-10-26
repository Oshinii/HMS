import 'dotenv/config'
import mysql from 'mysql2/promise'

const requiredEnvironment = ['DB_HOST', 'DB_USER', 'DB_NAME']
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name])
if (missingEnvironment.length) {
  throw new Error(`Missing required database settings: ${missingEnvironment.join(', ')}`)
}

if (!/^[A-Za-z0-9_]+$/.test(process.env.DB_NAME)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.')
}

export const databaseName = process.env.DB_NAME
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
})
