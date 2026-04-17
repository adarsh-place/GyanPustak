import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { requireRoles } from '../middleware/authGuard.js'

export const booksRouter = Router()

async function loadBookDetails(bookIsbn) {
  const [authorsResult, keywordsResult, courseLinksResult] = await Promise.all([
    pool.query(
      'SELECT author_name FROM book_authors WHERE book_id = $1 ORDER BY author_order ASC, author_name ASC',
      [bookIsbn],
    ),
    pool.query('SELECT keyword FROM book_keywords WHERE book_id = $1 ORDER BY keyword ASC', [bookIsbn]),
    pool.query(
      `
        SELECT cb.course_id, cb.relation, c.name AS course_name
        FROM course_books cb
        JOIN courses c ON c.id = cb.course_id
        WHERE cb.book_id = $1
        ORDER BY c.name ASC
      `,
      [bookIsbn],
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
      ...((await loadBookDetails(book.isbn)) ?? {}),
    })),
  )
}

booksRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const queryText = 'SELECT * FROM books ORDER BY title ASC'
    const result = await pool.query(queryText)
    const data = await enrichBooks(result.rows)

    response.json({ success: true, data })
  }),
)

booksRouter.get(
  '/:isbn',
  asyncHandler(async (request, response) => {
    const result = await pool.query('SELECT * FROM books WHERE isbn = $1', [request.params.isbn])
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Book not found')
    }

    const [book] = await enrichBooks(result.rows)
    response.json({ success: true, data: book })
  }),
)

booksRouter.post(
  '/add',
  requireRoles(['admin', 'superadmin']),
  asyncHandler(async (request, response) => {
    const {
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
            title, type, purchase_option, price, quantity, isbn, publisher,
            publication_date, edition_number, language, format, category, subcategories, rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `,
        [
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
          [isbn, authorName, index + 1],
        )
      }

      for (const keyword of keywords) {
        await client.query('INSERT INTO book_keywords (book_id, keyword) VALUES ($1, $2)', [isbn, keyword])
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
