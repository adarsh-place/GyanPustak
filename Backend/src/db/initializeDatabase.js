import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(currentDir, '..', '..')
const schemaPath = join(projectRoot, 'db', 'schema.sql')
const seedPath = join(projectRoot, 'db', 'seed.sql')

function shouldSeedDatabase() {
  const value = process.env.DB_AUTO_SEED
  return typeof value === 'string' && value.toLowerCase() === 'true'
}

async function hashPlaceholderPasswords() {
  const testPassword = 'password123'
  const hashedPassword = await bcrypt.hash(testPassword, 10)

  const queries = [
    pool.query('UPDATE students SET password_hash = $1 WHERE password_hash = $2', [
      hashedPassword,
      '$2a$10$placeholder',
    ]),
    pool.query('UPDATE employees SET password_hash = $1 WHERE password_hash = $2', [
      hashedPassword,
      '$2a$10$placeholder',
    ]),
  ]

  await Promise.all(queries)
}

export async function initializeDatabase() {
  if (!shouldSeedDatabase()) {
    console.log('Skipping DB reset/seed. Set DB_AUTO_SEED=true to reinitialize database.')
    return
  }

  // Drop existing tables first to handle schema updates
  try {
    await pool.query(`
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS cart_items CASCADE;
      DROP TABLE IF EXISTS carts CASCADE;
      DROP TABLE IF EXISTS course_instructors CASCADE;
      DROP TABLE IF EXISTS course_departments CASCADE;
      DROP TABLE IF EXISTS courses CASCADE;
      DROP TABLE IF EXISTS instructors CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS books CASCADE;
      DROP TABLE IF EXISTS tickets CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS students CASCADE;
      DROP TABLE IF EXISTS universities CASCADE;
    `)
  } catch (error) {
    // Tables might not exist yet, ignore error
  }

  const schemaSql = await readFile(schemaPath, 'utf8')
  await pool.query(schemaSql)
  const seedSql = await readFile(seedPath, 'utf8')
  await pool.query(seedSql)
  await hashPlaceholderPasswords()
}
