import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const ticketsRouter = Router()

async function buildTicket(ticketRow) {
  const historyResult = await pool.query(
    `
      SELECT
        tsh.status,
        tsh.changed_by_type,
        tsh.changed_by_id,
        tsh.changed_at,
        CASE
          WHEN tsh.changed_by_type = 'student' THEN CONCAT_WS(' ', s.first_name, s.last_name)
          ELSE CONCAT_WS(' ', e.first_name, e.last_name)
        END AS changed_by_name
      FROM ticket_status_history tsh
      LEFT JOIN students s
        ON tsh.changed_by_type = 'student' AND s.id = tsh.changed_by_id
      LEFT JOIN employees e
        ON tsh.changed_by_type IN ('support', 'admin', 'superadmin') AND e.id = tsh.changed_by_id
      WHERE tsh.ticket_id = $1
      ORDER BY tsh.changed_at ASC, tsh.id ASC
    `,
    [ticketRow.id],
  )

  const creatorResult =
    ticketRow.created_by_type === 'student'
      ? await pool.query('SELECT first_name, last_name FROM students WHERE id = $1', [ticketRow.created_by_id])
      : await pool.query('SELECT first_name, last_name FROM employees WHERE id = $1', [ticketRow.created_by_id])

  const resolverResult = ticketRow.resolved_by_employee_id
    ? await pool.query('SELECT first_name, last_name FROM employees WHERE id = $1', [ticketRow.resolved_by_employee_id])
    : null

  const creatorName =
    creatorResult?.rowCount > 0
      ? `${creatorResult.rows[0].first_name} ${creatorResult.rows[0].last_name}`.trim()
      : ''
  const resolverName =
    resolverResult?.rowCount > 0
      ? `${resolverResult.rows[0].first_name} ${resolverResult.rows[0].last_name}`.trim()
      : ''

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
    createdByName: creatorName,
    resolvedByName: resolverName,
    history: historyResult.rows.map((row) => ({
      status: row.status,
      by: row.changed_by_type,
      date: row.changed_at,
      byId: row.changed_by_id,
      byName: row.changed_by_name || '',
    })),
  }
}

ticketsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const isStudent = request.auth?.role === 'student'
    const result = isStudent
      ? await pool.query(
          `
            SELECT *
            FROM trouble_tickets
            WHERE created_by_type = 'student' AND created_by_id = $1
            ORDER BY created_at DESC
          `,
          [request.auth.userId],
        )
      : await pool.query('SELECT * FROM trouble_tickets ORDER BY created_at DESC')

    const data = await Promise.all(result.rows.map((row) => buildTicket(row)))
    response.json({ success: true, data })
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

    if (!id || !category || !title || !problemDescription) {
      throw new HttpError(400, 'Missing required ticket fields')
    }

    const isStudent = request.auth?.role === 'student'
    const ticketCreatedByType = isStudent ? 'student' : createdByType
    const ticketCreatedById = isStudent ? request.auth.userId : createdById

    if (!ticketCreatedByType || !ticketCreatedById) {
      throw new HttpError(400, 'Missing required ticket creator fields')
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
        [
          id,
          category,
          ticketCreatedByType,
          ticketCreatedById,
          title,
          problemDescription,
          solutionDescription,
          loggedDate,
          status,
        ],
      )

      await client.query(
        `
          INSERT INTO ticket_status_history (ticket_id, status, changed_by_type, changed_by_id)
          VALUES ($1, $2, $3, $4)
        `,
        [id, status, ticketCreatedByType, ticketCreatedById],
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
      const isStudent = request.auth?.role === 'student'
      const updateResult = isStudent
        ? await client.query(
            `
              UPDATE trouble_tickets
              SET status = $2,
                  solution_description = COALESCE($3, solution_description),
                  resolved_by_employee_id = COALESCE($4, resolved_by_employee_id),
                  completion_date = CASE WHEN $2 IN ('completed', 'closed') THEN CURRENT_DATE ELSE completion_date END,
                  updated_at = NOW()
              WHERE id = $1 AND created_by_type = 'student' AND created_by_id = $5
              RETURNING *
            `,
            [request.params.id, status, solutionDescription, resolvedByEmployeeId, request.auth.userId],
          )
        : await client.query(
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
