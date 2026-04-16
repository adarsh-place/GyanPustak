import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

export const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(helmet())
app.use(cors());
app.use(express.json())
app.use(cookieParser())
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
