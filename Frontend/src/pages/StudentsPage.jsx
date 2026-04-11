import { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './StudentsPage.css'

function StudentsPage() {
  const { activeRole, students, reloadStudents } = useGyanPustak()

  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    university: '',
    major: '',
    status: 'undergraduate',
    yearOfStudy: '1st Year',
  })
  const [universities, setUniversities] = useState([])
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

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
      phoneNumber: formState.phoneNumber.trim(),
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
        address: '',
        dateOfBirth: null,
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
        phoneNumber: '',
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

  if (activeRole !== 'admin' && activeRole !== 'superadmin') {
    return (
      <section className="section-stack">
        <h2>Students</h2>
        <article className="card">
          <p>Only admins and superadmins can manage students.</p>
        </article>
      </section>
    )
  }

  return (
    <section className="section-stack students-page">
      <h2>Student Management</h2>

      <form className="card form" onSubmit={submitStudent}>
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
          placeholder="Phone number (10 digits or +91XXXXXXXXXX)"
          value={formState.phoneNumber}
          onChange={(event) =>
            setFormState((previous) => ({
              ...previous,
              phoneNumber: event.target.value,
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
          <option value="1st Sem">1st Sem</option>
          <option value="2nd Sem">2nd Sem</option>
        </select>
        {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

        <button className="button" type="submit" disabled={isActionLoading}>
          {isActionLoading ? 'Working...' : 'Add Student'}
        </button>
      </form>

      <h3 style={{ marginTop: '20px' }}>All Students ({students.length})</h3>
      <div className="stack">
        {students.length === 0 ? (
          <article className="card">
            <p>No students found.</p>
          </article>
        ) : (
          students.map((student) => (
            <article key={student.id} className="card">
              <h4>
                {student.id} - {student.firstName} {student.lastName}
              </h4>
              <p>Email: {student.email}</p>
              <p>Phone: {student.phoneNumber || 'N/A'}</p>
              <p>
                University: {student.university} | Major: {student.major}
              </p>
              <p>
                Status: {student.status} | Year: {student.yearOfStudy}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default StudentsPage
