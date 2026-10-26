import 'dotenv/config'
import mysql from 'mysql2/promise'

const requiredEnvironment = ['DB_HOST', 'DB_USER', 'DB_NAME']
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name])
if (missingEnvironment.length) {
  throw new Error(`Missing required database settings: ${missingEnvironment.join(', ')}`)
}

const databaseName = process.env.DB_NAME
if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.')
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
})

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.changeUser({ database: databaseName })
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(150) NOT NULL DEFAULT 'Administrator',
      role VARCHAR(40) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      session_hash CHAR(64) NOT NULL PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sessions_expires_at (expires_at),
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      user_id BIGINT UNSIGNED NOT NULL,
      state_key VARCHAR(100) NOT NULL,
      state_value JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, state_key),
      CONSTRAINT fk_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)
  console.log(`MySQL database "${databaseName}" and HMS tables are ready.`)
} finally {
  await connection.end()
}
