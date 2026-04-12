import { Router } from 'express'
import { authRouter } from './auth.js'
import { booksRouter } from './books.js'
import { cartRouter } from './cart.js'
import { coursesRouter } from './courses.js'
import { employeesRouter } from './employees.js'
import { healthRouter } from './health.js'
import { instructorsRouter } from './instructors.js'
import { ordersRouter } from './orders.js'
import { reviewsRouter } from './reviews.js'
import { studentsRouter } from './students.js'
import { ticketsRouter } from './tickets.js'
import { universitiesRouter } from './universities.js'
import { requireAuth } from '../middleware/authGuard.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/health', healthRouter)
apiRouter.use(requireAuth)
apiRouter.use('/books', booksRouter)
apiRouter.use('/universities', universitiesRouter)
apiRouter.use('/instructors', instructorsRouter)
apiRouter.use('/courses', coursesRouter)
apiRouter.use('/students', studentsRouter)
apiRouter.use('/employees', employeesRouter)
apiRouter.use('/tickets', ticketsRouter)
apiRouter.use('/reviews', reviewsRouter)
apiRouter.use('/carts', cartRouter)
apiRouter.use('/orders', ordersRouter)
