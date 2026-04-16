import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './CoursesPage.css'

function CoursesPage() {
  const { courses, universities, books, activeRole, reloadCourses } = useGyanPustak()
  const canAddCourse = activeRole === 'admin' || activeRole === 'superadmin'
  const currentYear = new Date().getFullYear()
  const [formState, setFormState] = useState({
    universityId: '',
    name: '',
    year: '',
    semester: '',
    departmentIds: [],
    instructorIds: [],
    books: [],
  })
  const [bookFormState, setBookFormState] = useState({
    bookId: '',
    relation: 'required',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [universityFilter, setUniversityFilter] = useState('all')
  const [instructorFilter, setInstructorFilter] = useState('all')

  const selectedUniversity = useMemo(
    () => universities.find((university) => university.id === formState.universityId),
    [formState.universityId, universities],
  )

  const instructorFilterOptions = useMemo(() => {
    const allInstructors = courses.flatMap((course) => course.instructors || [])
    return Array.from(new Set(allInstructors)).sort((a, b) => a.localeCompare(b))
  }, [courses])

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesUniversity = universityFilter === 'all' || course.university === universityFilter
      const matchesInstructor =
        instructorFilter === 'all' || (course.instructors || []).includes(instructorFilter)
      return matchesUniversity && matchesInstructor
    })
  }, [courses, instructorFilter, universityFilter])

  const submitCourse = async (event) => {
    event.preventDefault()

    if (!canAddCourse) {
      return
    }

    if (!formState.universityId || !formState.name.trim() || !formState.year.trim() || !formState.semester.trim()) {
      setActionMessage('University, course name, year, and semester are required')
      setActionType('error')
      return
    }

    setActionMessage('Adding course...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createCourse({
        universityId: formState.universityId,
        name: formState.name.trim(),
        year: formState.year.trim(),
        semester: formState.semester.trim(),
        departmentIds: formState.departmentIds,
        instructorIds: formState.instructorIds,
        books: formState.books,
      })

      await reloadCourses?.()
      setFormState({
        universityId: '',
        name: '',
        year: '',
        semester: '',
        departmentIds: [],
        instructorIds: [],
        books: [],
      })
      setBookFormState({
        bookId: '',
        relation: 'required',
      })
      setActionMessage('Course added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add course')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const toggleSelection = (key, value) => {
    setFormState((previous) => {
      const current = previous[key]
      const exists = current.includes(value)
      return {
        ...previous,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      }
    })
  }

  const clearSelections = () => {
    setFormState((previous) => ({
      ...previous,
      departmentIds: [],
      instructorIds: [],
        books: [],
    }))
  }

  const addBookToCourse = () => {
    if (!bookFormState.bookId) {
      setActionMessage('Select a book first')
      setActionType('error')
      return
    }

    const selectedBook = books.find((book) => book.id === bookFormState.bookId)
    if (!selectedBook) {
      setActionMessage('Selected book was not found')
      setActionType('error')
      return
    }

    setFormState((previous) => {
      const alreadyAdded = previous.books.some((book) => book.bookId === bookFormState.bookId)
      if (alreadyAdded) {
        return previous
      }

      return {
        ...previous,
        books: [
          ...previous.books,
          {
            bookId: selectedBook.id,
            relation: bookFormState.relation,
          },
        ],
      }
    })

    setBookFormState({
      bookId: '',
      relation: 'required',
    })
  }

  const removeBookFromCourse = (bookId) => {
    setFormState((previous) => ({
      ...previous,
      books: previous.books.filter((book) => book.bookId !== bookId),
    }))
  }

  return (
    <section className="section-stack courses-page">
      <h2>Courses</h2>

      {canAddCourse && (
        <form className="card form" onSubmit={submitCourse}>
          <h3>Add Course</h3>
          <select
            className="input"
            value={formState.universityId}
            onChange={(event) => {
              setFormState((previous) => ({
                ...previous,
                universityId: event.target.value,
              }))
              clearSelections()
            }}
          >
            <option value="">Select a university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Course name"
            value={formState.name}
            onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
          />
          <div className="inline-actions">
            <select
              className="input"
              value={formState.year}
              onChange={(event) => setFormState((previous) => ({ ...previous, year: event.target.value }))}
            >
              <option value="">Select year</option>
              {Array.from({ length: 3 }, (_, index) => currentYear + index).map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={formState.semester}
              onChange={(event) => setFormState((previous) => ({ ...previous, semester: event.target.value }))}
            >
              <option value="">Select semester</option>
              <option value="autumn">Autumn</option>
              <option value="spring">Spring</option>
            </select>
          </div>

          {selectedUniversity && (
            <div className="stack">
              <div>
                <p>Departments:</p>
                <div className="stack">
                  {selectedUniversity.departments.length > 0 ? (
                    selectedUniversity.departments.map((department) => (
                      <label key={department.id} className="inline-actions">
                        <input
                          type="checkbox"
                          checked={formState.departmentIds.includes(department.id)}
                          onChange={() => toggleSelection('departmentIds', department.id)}
                        />
                        <span>{department.name}</span>
                      </label>
                    ))
                  ) : (
                    <p style={{color:'darkred'}}    >No departments available for this university.</p>
                  )}
                </div>
              </div>

              <div>
                <p>Instructors:</p>
                <div className="stack">
                  {selectedUniversity.instructors.length > 0 ? (
                    selectedUniversity.instructors.map((instructor) => (
                      <label key={instructor.id} className="inline-actions">
                        <input
                          type="checkbox"
                          checked={formState.instructorIds.includes(instructor.id)}
                          onChange={() => toggleSelection('instructorIds', instructor.id)}
                        />
                        <span>
                          {instructor.firstName} {instructor.lastName}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p style={{color:'darkred'}}>No instructors available for this university.</p>
                  )}
                </div>
              </div>

              <div className="stack">
                <p>Books:</p>
                <div className="inline-actions">
                  <select
                    className="input"
                    value={bookFormState.bookId}
                    onChange={(event) =>
                      setBookFormState((previous) => ({ ...previous, bookId: event.target.value }))
                    }
                  >
                    <option value="">Select a book</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={bookFormState.relation}
                    onChange={(event) =>
                      setBookFormState((previous) => ({ ...previous, relation: event.target.value }))
                    }
                  >
                    <option value="required">Required</option>
                    <option value="recommended">Recommended</option>
                  </select>
                  <button className="button" type="button" onClick={addBookToCourse}>
                    Add Book
                  </button>
                </div>

                {formState.books.length > 0 ? (
                  <div className="stack">
                    {formState.books.map((bookSelection) => {
                      const selectedBook = books.find((book) => book.id === bookSelection.bookId)
                      return (
                        <div key={bookSelection.bookId} className="card" style={{ padding: '10px' }}>
                          <div className="card-header">
                            <strong>{selectedBook ? selectedBook.title : bookSelection.bookId}</strong>
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => removeBookFromCourse(bookSelection.bookId)}
                            >
                              Remove
                            </button>
                          </div>
                          <p>Relation: {bookSelection.relation}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p>No books added yet.</p>
                )}
              </div>
            </div>
          )}

          {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}
          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Add Course'}
          </button>
        </form>
      )}

      <article className="card form">
        <h3>Filter Courses</h3>
        <select
          className="input"
          value={universityFilter}
          onChange={(event) => setUniversityFilter(event.target.value)}
        >
          <option value="all">All Universities</option>
          {Array.from(new Set(courses.map((course) => course.university))).map((universityName) => (
            <option key={universityName} value={universityName}>
              {universityName}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={instructorFilter}
          onChange={(event) => setInstructorFilter(event.target.value)}
        >
          <option value="all">All Instructors/Employees</option>
          {instructorFilterOptions.map((instructorName) => (
            <option key={instructorName} value={instructorName}>
              {instructorName}
            </option>
          ))}
        </select>
      </article>

      {filteredCourses.length === 0 ? (
        <article className="card">
          <p>No courses found.</p>
        </article>
      ) : (
        <div className="courses-grid">
          <p className="courses-count">Courses ({filteredCourses.length})</p>
          {filteredCourses.map((course) => (
            <article key={course.id} className="card course-card">
              <div className="course-card-header">
                <div>
                  <p className="course-id">{course.id}</p>
                  <h3 className="course-title">{course.name}</h3>
                </div>
                <span className="course-badge">
                  {course.year} | {course.semester}
                </span>
              </div>
              <div className="course-meta-grid">
                <div className="course-meta-item">
                  <span className="course-meta-label">University</span>
                  <span className="course-meta-value">{course.university}</span>
                </div>
                <div className="course-meta-item">
                  <span className="course-meta-label">Departments</span>
                  <span className="course-meta-value">{course.departments.length > 0 ? course.departments.join(', ') : 'N/A'}</span>
                </div>
                <div className="course-meta-item">
                  <span className="course-meta-label">Instructors</span>
                  <span className="course-meta-value">{course.instructors.length > 0 ? course.instructors.join(', ') : 'N/A'}</span>
                </div>
              </div>

              <div className="course-books-section">
                <p className="course-section-title">Books</p>
                {course.books.length > 0 ? (
                  <ul className="course-books-list">
                    {course.books.map((book) => (
                      <li key={book.bookId} className={`course-book-item ${book.relation}`}>
                        <span className="course-book-title">{book.title}</span>
                        <span className={`course-book-relation ${book.relation}`}>{book.relation}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="course-empty-books">No books assigned yet.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default CoursesPage
