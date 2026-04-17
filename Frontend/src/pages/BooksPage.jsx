import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './BooksPage.css'

function BooksPage() {
  const { books, activeRole, cartBooks, reloadBooks } = useGyanPustak()
  const [searchTerm, setSearchTerm] = useState('')
  const [formState, setFormState] = useState({
    title: '',
    type: 'new',
    price: '',
    quantity: '',
    authors: '',
    isbn: '',
    publisher: '',
    publicationDate: '',
    edition: '',
    language: '',
    format: 'softcover',
    category: '',
    subcategories: '',
    keywords: '',
    rating: '',
    purchaseOption: 'buy',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleAddBook = async (event) => {
    event.preventDefault()
    if (activeRole !== 'admin' && activeRole !== 'superadmin') {
      return
    }

    if (!formState.title.trim() || !formState.isbn.trim() || !formState.publisher.trim() || !formState.category.trim()) {
      setActionMessage('Title, ISBN, publisher, and category are required')
      setActionType('error')
      return
    }

    setActionMessage('Adding book...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createBook({
        title: formState.title.trim(),
        type: formState.type,
        purchaseOption: formState.purchaseOption === 'both' ? ['buy', 'rent'] : [formState.purchaseOption],
        price: Number(formState.price || 0),
        quantity: Number(formState.quantity || 0),
        authors: formState.authors
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        isbn: formState.isbn.trim(),
        publisher: formState.publisher.trim(),
        publicationDate: formState.publicationDate || new Date().toISOString().slice(0, 10),
        edition: Number(formState.edition || 1),
        language: formState.language.trim(),
        format: formState.format.trim().toLowerCase() === 'paperback' ? 'softcover' : formState.format.trim().toLowerCase(),
        category: formState.category.trim(),
        subcategories: formState.subcategories
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        keywords: formState.keywords
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        rating: Number(formState.rating || 0),
      })

      await reloadBooks?.()
      setFormState({
        title: '',
        type: 'new',
        price: '',
        quantity: '',
        authors: '',
        isbn: '',
        publisher: '',
        publicationDate: '',
        edition: '',
        language: '',
        format: 'softcover',
        category: '',
        subcategories: '',
        keywords: '',
        rating: '',
        purchaseOption: 'buy',
      })
      setActionMessage('Book added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add book')
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
    () => new Set(cartBooks.map((book) => book.isbn)),
    [cartBooks],
  )

  const coverUrl = (book) => {
    if (!book?.isbn) {
      return ''
    }
    return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(book.isbn)}-L.jpg`
  };

  return (
    <section className="section-stack books-page">
      <h2>Books</h2>

      {(activeRole === 'admin' || activeRole === 'superadmin') && (
        <form className="card form" onSubmit={handleAddBook}>
          <h3>Add Book</h3>
          <input className="input" placeholder="Title" value={formState.title} onChange={(event) => setFormState((previous) => ({ ...previous, title: event.target.value }))} />
          <div className="books-form-row">
            <input className="input" placeholder="ISBN" value={formState.isbn} onChange={(event) => setFormState((previous) => ({ ...previous, isbn: event.target.value }))} />
            <input className="input" placeholder="Publisher" value={formState.publisher} onChange={(event) => setFormState((previous) => ({ ...previous, publisher: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" placeholder="Category" value={formState.category} onChange={(event) => setFormState((previous) => ({ ...previous, category: event.target.value }))} />
            <input className="input" placeholder="Subcategories (comma separated)" value={formState.subcategories} onChange={(event) => setFormState((previous) => ({ ...previous, subcategories: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" placeholder="Authors (comma separated)" value={formState.authors} onChange={(event) => setFormState((previous) => ({ ...previous, authors: event.target.value }))} />
            <input className="input" placeholder="Keywords (comma separated)" value={formState.keywords} onChange={(event) => setFormState((previous) => ({ ...previous, keywords: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={formState.price} onChange={(event) => setFormState((previous) => ({ ...previous, price: event.target.value }))} />
            <input className="input" type="number" min="0" placeholder="Quantity" value={formState.quantity} onChange={(event) => setFormState((previous) => ({ ...previous, quantity: event.target.value }))} />
            <input className="input" type="date" placeholder="Publication date" value={formState.publicationDate} onChange={(event) => setFormState((previous) => ({ ...previous, publicationDate: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <select className="input" value={formState.type} onChange={(event) => setFormState((previous) => ({ ...previous, type: event.target.value }))}>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
            <select className="input" value={formState.format} onChange={(event) => setFormState((previous) => ({ ...previous, format: event.target.value }))}>
              <option value="hardcover">Hardcover</option>
              <option value="softcover">Softcover (Paperback)</option>
              <option value="electronic">Electronic</option>
            </select>
            <input className="input" placeholder="Language (Ex. English)" value={formState.language} onChange={(event) => setFormState((previous) => ({ ...previous, language: event.target.value }))} />
          </div>
          <div className="books-form-row">
            <input className="input" type="number" min="1" placeholder="Edition" value={formState.edition} onChange={(event) => setFormState((previous) => ({ ...previous, edition: event.target.value }))} />
            <input className="input" type="number" min="0" max="5" step="0.1" placeholder="Rating" value={formState.rating} onChange={(event) => setFormState((previous) => ({ ...previous, rating: event.target.value }))} />
            <select className="input" value={formState.purchaseOption} onChange={(event) => setFormState((previous) => ({ ...previous, purchaseOption: event.target.value }))}>
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
              <option value="both">Buy and Rent</option>
            </select>
          </div>

          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Add Book'}
          </button>
        </form>
      )}

      {actionMessage && (
        <article className={`status-message ${actionType}`}>{actionMessage}</article>
      )}

      <input
        className="input"
        placeholder="Search by title, author, ISBN, category or keyword"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      
      <p>Books ({filteredBooks.length})</p>
      <div className="stack">
        {filteredBooks.map((book) => (
          <article key={book.isbn} className="card book-card">
            <div className="book-card-cover-wrap">
              <img
                className="book-cover"
                src={coverUrl(book)}
                alt={`${book.title} cover`}
              />
            </div>

            <div className="book-card-content">
              <div className="card-header">
                <h3>{book.title}</h3>
                <span className="badge">Rating {book.rating}</span>
              </div>

              <p className="book-meta-primary">
                {book.type.toUpperCase()} • {book.format}
              </p>
              <p className="book-meta-secondary">
                <strong>Authors:</strong> {(book.authors || []).join(', ') || 'N/A'}
              </p>
              <p className="book-meta-secondary">
                <strong>ISBN:</strong> {book.isbn || 'N/A'}
              </p>
              {!(activeRole === 'student' && cartBookIds.has(book.isbn)) && (
                <p className="book-meta-secondary">
                  <strong>Purchase options:</strong> {(book.purchaseOption || []).join(' / ') || 'N/A'}
                </p>
              )}
              <p className="book-meta-secondary">
                <strong>Price: ₹{book.price}</strong>
              </p>

              <div className="inline-actions book-card-actions">
                <Link className="button button-link" to={`/books/${book.isbn}`}>
                  View
                </Link>
                {activeRole === 'student' && cartBookIds.has(book.isbn) ? (
                  <span className="badge">Already in cart</span>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      
    </section>
  )
}

export default BooksPage
