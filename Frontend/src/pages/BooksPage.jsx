import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './BooksPage.css'

function BooksPage() {
  const { books, activeRole, student, courses, cartBooks, reloadCart } = useGyanPustak()
  const [searchTerm, setSearchTerm] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleAddToCart = async (bookId) => {
    if (activeRole !== 'student') {
      return
    }

    setActionMessage('Adding to cart...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.addCartItem(student.id, { bookId, quantity: 1 })
      await reloadCart(student.id)
      setActionMessage('Book added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add book to cart')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return books
    }

    return books.filter((book) => {
      const searchableFields = [
        book.title,
        book.isbn,
        book.category,
        ...book.authors,
        ...book.keywords,
      ]
      return searchableFields.join(' ').toLowerCase().includes(query)
    })
  }, [books, searchTerm])

  const cartBookIds = useMemo(
    () => new Set(cartBooks.map((book) => book.id)),
    [cartBooks],
  )

  return (
    <section className="section-stack books-page">
      <h2>Books</h2>
      <input
        className="input"
        placeholder="Search by title, author, ISBN, category or keyword"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      {actionMessage && (
        <article className={`status-message ${actionType}`}>{actionMessage}</article>
      )}

      <div className="stack">
        {filteredBooks.map((book) => (
          <article key={book.id} className="card">
            <div className="card-header">
              <h3>{book.title}</h3>
              <span className="badge">Rating {book.rating}</span>
            </div>
            <p>
              {book.type.toUpperCase()} • {book.format} • ₹{book.price} • Qty {book.quantity}
            </p>
            <p>
              Authors: {book.authors.join(', ')} | ISBN: {book.isbn}
            </p>
            <p>
              Category: {book.category} • Subcategories: {book.subcategories.join(', ')}
            </p>
            <p>Purchase options: {book.purchaseOption.join(' / ')}</p>

            <div className="inline-actions">
              {activeRole === 'student' && !cartBookIds.has(book.id) ? (
                <button
                  className="button"
                  onClick={() => handleAddToCart(book.id)}
                  disabled={isActionLoading}
                >
                  Add to Cart
                </button>
              ) : activeRole === 'student' ? (
                <span className="badge">Already in cart</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <article className="card">
        <h3>Course Mappings</h3>
        {courses.map((course) => (
          <p key={course.id}>
            {course.id} - {course.name} ({course.semester} {course.year}) | Books:{' '}
            {course.books.map((entry) => `${entry.bookId} (${entry.relation})`).join(', ')}
          </p>
        ))}
      </article>
    </section>
  )
}

export default BooksPage
