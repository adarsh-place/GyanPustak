import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const ticketsRouter = Router()

async function buildTicket(ticketRow) {
  const historyResult = await pool.query(
    `
      SELECT status, changed_by_type, changed_by_id, changed_at
      FROM ticket_status_history
      WHERE ticket_id = $1
      ORDER BY changed_at ASC, id ASC
    `,
    [ticketRow.id],
  )

  return {
    id: ticketRow.id,
    category: ticketRow.category,
    createdBy: ticketRow.created_by_type,
    createdById: ticketRow.created_by_id,
    title: ticketRow.title,
    problemDescription: ticketRow.problem_description,
    solutionDescription: ticketRow.solution_description,
    loggedDate: ticketRow.logged_date,
    completionDate: ticketRow.completion_date,
    status: ticketRow.status,
    resolvedBy: ticketRow.resolved_by_employee_id,
    history: historyResult.rows.map((row) => ({
      status: row.status,
      by: row.changed_by_type,
      date: row.changed_at,
      byId: row.changed_by_id,
    })),
  }
}

ticketsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM trouble_tickets ORDER BY created_at DESC')
    const data = await Promise.all(result.rows.map((row) => buildTicket(row)))
    response.json({ success: true, data })
  }),
)

ticketsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM trouble_tickets WHERE id = $1', [request.params.id])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Ticket not found')
    }

    const [ticket] = await Promise.all(result.rows.map((row) => buildTicket(row)))
    response.json({ success: true, data: ticket })
  }),
)

ticketsRouter.post(
  '/add',
  asyncHandler(async (request, response) => {
    const {
      id,
      category,
      createdByType,
      createdById,
      title,
      problemDescription,
      solutionDescription = '',
      loggedDate = new Date().toISOString().slice(0, 10),
      status = 'new',
    } = request.body

    if (!id || !category || !createdByType || !createdById || !title || !problemDescription) {
      throw new HttpError(400, 'Missing required ticket fields')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(
        `
          INSERT INTO trouble_tickets (
            id, category, created_by_type, created_by_id, title,
            problem_description, solution_description, logged_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `,
        [id, category, createdByType, createdById, title, problemDescription, solutionDescription, loggedDate, status],
      )

      await client.query(
        `
          INSERT INTO ticket_status_history (ticket_id, status, changed_by_type, changed_by_id)
          VALUES ($1, $2, $3, $4)
        `,
        [id, status, createdByType, createdById],
      )

      await client.query('COMMIT')
      const [ticket] = await Promise.all(result.rows.map((row) => buildTicket(row)))
      response.status(201).json({ success: true, data: ticket })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)

ticketsRouter.patch(
  '/:id/status',
  asyncHandler(async (request, response) => {
    const { status, changedByType, changedById, solutionDescription = null, resolvedByEmployeeId = null } = request.body

    if (!status || !changedByType || !changedById) {
      throw new HttpError(400, 'Missing required status fields')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const updateResult = await client.query(
        `
          UPDATE trouble_tickets
          SET status = $2,
              solution_description = COALESCE($3, solution_description),
              resolved_by_employee_id = COALESCE($4, resolved_by_employee_id),
              completion_date = CASE WHEN $2 IN ('completed', 'closed') THEN CURRENT_DATE ELSE completion_date END,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [request.params.id, status, solutionDescription, resolvedByEmployeeId],
      )

      if (updateResult.rowCount === 0) {
        throw new HttpError(404, 'Ticket not found')
      }

      await client.query(
        `
          INSERT INTO ticket_status_history (ticket_id, status, changed_by_type, changed_by_id)
          VALUES ($1, $2, $3, $4)
        `,
        [request.params.id, status, changedByType, changedById],
      )

      await client.query('COMMIT')
      const [ticket] = await Promise.all(updateResult.rows.map((row) => buildTicket(row)))
      response.json({ success: true, data: ticket })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)
