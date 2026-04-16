import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './StudentsPage.css'

function StudentsPage() {
  const { activeRole, students, reloadStudents } = useGyanPustak()
  const canManageStudents = activeRole === 'admin' || activeRole === 'superadmin'

  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    phoneNumber: '',
    dateOfBirth: '',
    university: '',
    major: '',
    status: 'undergraduate',
    yearOfStudy: '1st Year',
  })
  const [universities, setUniversities] = useState([])
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false)
  const [universityFilter, setUniversityFilter] = useState('all')
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const filteredStudents = useMemo(() => {
    if (universityFilter === 'all') {
      return students
    }

    return students.filter((student) => student.universityId === universityFilter)
  }, [students, universityFilter])

  useEffect(() => {
    const fetchUniversities = async () => {
      setIsLoadingUniversities(true)
      try {
        const response = await apiClient.getUniversities()
        setUniversities(response.data || [])
      } catch (error) {
        console.error('Failed to fetch universities:', error)
        setUniversities([])
      } finally {
        setIsLoadingUniversities(false)
      }
    }

    fetchUniversities()
  }, [])

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone) => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '')
    
    // Check if it matches: +91 followed by 10 digits, OR just 10 digits
    const plusFormat = /^\+91\d{10}$/
    const plainFormat = /^\d{10}$/
    
    return plusFormat.test(cleaned) || plainFormat.test(cleaned)
  }

  const submitStudent = async (event) => {
    event.preventDefault()

    if (activeRole !== 'admin' && activeRole !== 'superadmin') {
      setActionMessage('Only admin or superadmin can add students')
      setActionType('error')
      return
    }

    if (!formState.firstName.trim()) {
      setActionMessage('First name is required')
      setActionType('error')
      return
    }

    if (!formState.lastName.trim()) {
      setActionMessage('Last name is required')
      setActionType('error')
      return
    }

    if (!formState.email.trim()) {
      setActionMessage('Email is required')
      setActionType('error')
      return
    }

    if (!isValidEmail(formState.email.trim())) {
      setActionMessage('Invalid email format (e.g., user@example.com)')
      setActionType('error')
      return
    }

    if (!formState.phoneNumber.trim()) {
      setActionMessage('Phone number is required')
      setActionType('error')
      return
    }

    if (!isValidPhone(formState.phoneNumber.trim())) {
      setActionMessage('Invalid phone format (10 digits or +91 followed by 10 digits)')
      setActionType('error')
      return
    }

    if (!formState.university.trim()) {
      setActionMessage('University is required')
      setActionType('error')
      return
    }

    if (!formState.major.trim()) {
      setActionMessage('Major field of study is required')
      setActionType('error')
      return
    }

    const nextStudent = {
      id: `S${1000 + students.length + 1}`,
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: formState.email.trim(),
      address: formState.address.trim(),
      phoneNumber: formState.phoneNumber.trim(),
      dateOfBirth: formState.dateOfBirth || null,
      university: formState.university.trim(),
      major: formState.major.trim(),
      status: formState.status,
      yearOfStudy: formState.yearOfStudy,
    }

    setActionMessage('Adding student...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createStudent({
        id: nextStudent.id,
        firstName: nextStudent.firstName,
        lastName: nextStudent.lastName,
        email: nextStudent.email,
        phoneNumber: nextStudent.phoneNumber,
        address: nextStudent.address,
        dateOfBirth: nextStudent.dateOfBirth,
        universityAffiliation: nextStudent.university,
        majorFieldOfStudy: nextStudent.major,
        studentStatus: nextStudent.status,
        yearOfStudy: nextStudent.yearOfStudy,
      })
      await reloadStudents?.()
      setFormState({
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        phoneNumber: '',
        dateOfBirth: '',
        university: '',
        major: '',
        status: 'undergraduate',
        yearOfStudy: '1st Year',
      })
      setActionMessage('Student added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add student')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  return (
    <section className="section-stack students-page">
      <div className="students-header">
        <div>
          <h2>{canManageStudents ? 'Student Management' : 'Students'}</h2>
          { canManageStudents && <p className="page-eyebrow">Academic Registry</p>}
        </div>
      </div>

      {canManageStudents && <form className="card form student-form-card" onSubmit={submitStudent}>
        <h3>Add New Student</h3>
        <input
          className="input"
          placeholder="First name"
          value={formState.firstName}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              firstName: event.target.value,
            }))
          }
        />
        <input
          className="input"
          placeholder="Last name"
          value={formState.lastName}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              lastName: event.target.value,
            }))
          }
        />
        <input
          className="input"
          placeholder="Email"
          value={formState.email}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              email: event.target.value,
            }))
          }
        />
        <input
          className="input"
          placeholder="Address"
          value={formState.address}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              address: event.target.value,
            }))
          }
        />
        <input
          className="input"
          placeholder="Phone number (10 digits or +91XXXXXXXXXX)"
          value={formState.phoneNumber}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              phoneNumber: event.target.value,
            }))
          }
        />
        <input
          className="input"
          type="date"
          value={formState.dateOfBirth}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              dateOfBirth: event.target.value,
            }))
          }
        />
        <select
          className="input"
          value={formState.university}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              university: event.target.value,
            }))
          }
        >
          <option value="">Select a university</option>
          {isLoadingUniversities ? (
            <option disabled>Loading universities...</option>
          ) : universities.length > 0 ? (
            universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))
          ) : (
            <option disabled>No universities available</option>
          )}
        </select>
        <input
          className="input"
          placeholder="Major field of study"
          value={formState.major}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              major: event.target.value,
            }))
          }
        />
        <select
          className="input"
          value={formState.status}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              status: event.target.value,
            }))
          }
        >
          <option value="undergraduate">Undergraduate</option>
          <option value="graduate">Graduate</option>
        </select>
        <select
          className="input"
          value={formState.yearOfStudy}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              yearOfStudy: event.target.value,
            }))
          }
        >
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
          <option value="5th Year">5th Year</option>
        </select>
        {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

        <button className="button" type="submit" disabled={isActionLoading}>
          {isActionLoading ? 'Working...' : 'Add Student'}
        </button>
      </form>}

      <article className="card form student-filter-card">
        <h3>Filter Students</h3>
        <select
          className="input"
          value={universityFilter}
          onChange={(event) => setUniversityFilter(event.target.value)}
        >
          <option value="all">All Universities</option>
          {isLoadingUniversities ? (
            <option disabled>Loading universities...</option>
          ) : universities.length > 0 ? (
            universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))
          ) : (
            <option disabled>No universities available</option>
          )}
        </select>
      </article>

      <p className="students-count">All Students ({filteredStudents.length})</p>
      <div className="students-grid">
        {filteredStudents.length === 0 ? (
          <article className="card">
            <p>No students found.</p>
          </article>
        ) : (
          filteredStudents.map((student) => (
            <article key={student.id} className="card student-card">
              <div className="student-card-header">
                <div>
                  <p className="student-id">{student.id}</p>
                  <h4 className="student-name">
                    {student.firstName} {student.lastName}
                  </h4>
                </div>
                <span className="student-badge">{student.status}</span>
              </div>
              <div className="student-meta-grid">
                <div className="student-meta-item">
                  <span className="student-meta-label">Email</span>
                  <span className="student-meta-value">{student.email}</span>
                </div>
                <div className="student-meta-item">
                  <span className="student-meta-label">Phone</span>
                  <span className="student-meta-value">{student.phoneNumber || 'N/A'}</span>
                </div>
                <div className="student-meta-item">
                  <span className="student-meta-label">University</span>
                  <span className="student-meta-value">{student.universityName || student.university}</span>
                </div>
                <div className="student-meta-item">
                  <span className="student-meta-label">Major</span>
                  <span className="student-meta-value">{student.major}</span>
                </div>
                <div className="student-meta-item">
                  <span className="student-meta-label">Year</span>
                  <span className="student-meta-value">{student.yearOfStudy}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default StudentsPage
