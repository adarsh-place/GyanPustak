import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'

export const booksRouter = Router()

async function loadBookDetails(bookId) {
  const [authorsResult, keywordsResult, courseLinksResult] = await Promise.all([
    pool.query(
      'SELECT author_name FROM book_authors WHERE book_id = $1 ORDER BY author_order ASC, author_name ASC',
      [bookId],
    ),
    pool.query('SELECT keyword FROM book_keywords WHERE book_id = $1 ORDER BY keyword ASC', [bookId]),
    pool.query(
      `
        SELECT cb.course_id, cb.relation, c.name AS course_name
        FROM course_books cb
        JOIN courses c ON c.id = cb.course_id
        WHERE cb.book_id = $1
        ORDER BY c.name ASC
      `,
      [bookId],
    ),
  ])

  return {
    authors: authorsResult.rows.map((row) => row.author_name),
    keywords: keywordsResult.rows.map((row) => row.keyword),
    courseLinks: courseLinksResult.rows,
  }
}

async function enrichBooks(rows) {
  return Promise.all(
    rows.map(async (book) => ({
      id: book.id,
      title: book.title,
      type: book.type,
      purchaseOption: book.purchase_option,
      price: Number(book.price),
      quantity: book.quantity,
      isbn: book.isbn,
      publisher: book.publisher,
      publicationDate: book.publication_date,
      edition: book.edition_number,
      language: book.language,
      format: book.format,
      category: book.category,
      subcategories: book.subcategories ?? [],
      rating: Number(book.rating),
      ...((await loadBookDetails(book.id)) ?? {}),
    })),
  )
}

booksRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const { search } = request.query

    const queryText = search
      ? `
          SELECT *
          FROM books
          WHERE title ILIKE $1 OR isbn ILIKE $1 OR category ILIKE $1
          ORDER BY title ASC
        `
      : 'SELECT * FROM books ORDER BY title ASC'

    const params = search ? [`%${search}%`] : []
    const result = await pool.query(queryText, params)
    const data = await enrichBooks(result.rows)

    response.json({ success: true, data })
  }),
)

booksRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [request.params.id])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Book not found')
    }

    const [book] = await enrichBooks(result.rows)
    response.json({ success: true, data: book })
  }),
)

booksRouter.post(
  '/add',
  asyncHandler(async (request, response) => {
    const {
      id,
      title,
      type,
      purchaseOption = ['buy'],
      price,
      quantity = 0,
      authors = [],
      isbn,
      publisher,
      publicationDate,
      edition,
      language,
      format,
      category,
      subcategories = [],
      keywords = [],
      rating = 0,
    } = request.body

    if (
      !id ||
      !title ||
      !type ||
      price === undefined ||
      price === null ||
      !isbn ||
      !publisher ||
      !publicationDate ||
      !edition ||
      !language ||
      !format ||
      !category
    ) {
      throw new HttpError(400, 'Missing required book fields')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const bookResult = await client.query(
        `
          INSERT INTO books (
            id, title, type, purchase_option, price, quantity, isbn, publisher,
            publication_date, edition_number, language, format, category, subcategories, rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `,
        [
          id,
          title,
          type,
          purchaseOption,
          price,
          quantity,
          isbn,
          publisher,
          publicationDate,
          edition,
          language,
          format,
          category,
          subcategories,
          rating,
        ],
      )

      for (const [index, authorName] of authors.entries()) {
        await client.query(
          'INSERT INTO book_authors (book_id, author_name, author_order) VALUES ($1, $2, $3)',
          [id, authorName, index + 1],
        )
      }

      for (const keyword of keywords) {
        await client.query('INSERT INTO book_keywords (book_id, keyword) VALUES ($1, $2)', [id, keyword])
      }

      await client.query('COMMIT')
      const [book] = await enrichBooks(bookResult.rows)
      response.status(201).json({ success: true, data: book })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }),
)
