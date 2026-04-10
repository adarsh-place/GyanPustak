import pg from 'pg'

const { Pool } = pg

const useSsl = process.env.NODE_ENV === 'production'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
})
