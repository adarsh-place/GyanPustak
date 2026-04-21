import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

export const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server tools and same-origin requests with no Origin header.
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json())
app.use(morgan('dev'))

app.get('/', (request, response) => {
  response.json({
    success: true,
    message: 'GyanPustak backend is running',
  })
})

app.use('/api', apiRouter)

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: 'Route not found',
  })
})

app.use(errorHandler)
