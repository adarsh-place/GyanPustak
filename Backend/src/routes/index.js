import { Router } from 'express'
import { booksRouter } from './books.js'
import { cartRouter } from './cart.js'
import { coursesRouter } from './courses.js'
import { employeesRouter } from './employees.js'
import { healthRouter } from './health.js'
import { ordersRouter } from './orders.js'
import { studentsRouter } from './students.js'
import { ticketsRouter } from './tickets.js'
import { universitiesRouter } from './universities.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/books', booksRouter)
apiRouter.use('/universities', universitiesRouter)
apiRouter.use('/courses', coursesRouter)
apiRouter.use('/students', studentsRouter)
apiRouter.use('/employees', employeesRouter)
apiRouter.use('/tickets', ticketsRouter)
apiRouter.use('/carts', cartRouter)
apiRouter.use('/orders', ordersRouter)
