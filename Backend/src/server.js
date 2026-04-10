import 'dotenv/config'
import { app } from './app.js'
import { initializeDatabase } from './db/initializeDatabase.js'
import { pool } from './db/pool.js'

const port = Number(process.env.PORT || 5000)

async function startServer() {
  try {
    await initializeDatabase()
    await pool.query('SELECT 1')
    console.log('DB successfully connected')

    app.listen(port, () => {
      console.log(`Server listening on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to initialize backend:', error)
    process.exit(1)
  }
}

startServer()
