import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(currentDir, '..', '..')
const schemaPath = join(projectRoot, 'db', 'schema.sql')
const seedPath = join(projectRoot, 'db', 'seed.sql')

function shouldSeedDatabase() {
  const value = process.env.DB_AUTO_SEED
  if (value === undefined) {
    return process.env.NODE_ENV !== 'production'
  }

  return value.toLowerCase() === 'true'
}

export async function initializeDatabase() {
  const schemaSql = await readFile(schemaPath, 'utf8')
  await pool.query(schemaSql)

  if (shouldSeedDatabase()) {
    const seedSql = await readFile(seedPath, 'utf8')
    await pool.query(seedSql)
  }
}
