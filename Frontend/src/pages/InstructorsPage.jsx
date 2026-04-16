import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './InstructorsPage.css'

function InstructorsPage() {
  const { instructors, universities, activeRole, isLoading, error, reloadInstructors } = useGyanPustak()
  const canAddInstructor = activeRole === 'admin' || activeRole === 'superadmin'
  const [formState, setFormState] = useState({
    universityId: '',
    departmentId: '',
    firstName: '',
    lastName: '',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [filterUniversityId, setFilterUniversityId] = useState('')

  const selectedUniversity = useMemo(
    () => universities.find((university) => university.id === formState.universityId),
    [formState.universityId, universities],
  )

  const filteredInstructors = useMemo(() => {
    if (!filterUniversityId) {
      return instructors
    }

    return instructors.filter((instructor) => instructor.universityId === filterUniversityId)
  }, [filterUniversityId, instructors])

  const submitInstructor = async (event) => {
    event.preventDefault()

    if (!canAddInstructor) {
      return
    }

    if (!formState.universityId || !formState.firstName.trim() || !formState.lastName.trim()) {
      setActionMessage('University, first name, and last name are required')
      setActionType('error')
      return
    }

    setActionMessage('Adding instructor...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createInstructor({
        universityId: formState.universityId,
        departmentId: formState.departmentId || null,
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
      })

      await reloadInstructors?.()
      setFormState({
        universityId: '',
        departmentId: '',
        firstName: '',
        lastName: '',
      })
      setActionMessage('Instructor added successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to add instructor')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const resetDepartment = (universityId) => {
    setFormState((previous) => ({
      ...previous,
      universityId,
      departmentId: '',
    }))
  }

  return (
    <section className="section-stack instructors-page">
      <div className="instructors-header">
        <div>
          <h2>{activeRole === 'student' ? 'Instructors' : 'Instructor Management'}</h2>
        </div>
      </div>

      {canAddInstructor && (
        <form className="card form instructor-form-card" onSubmit={submitInstructor}>
          <h3>Add Instructor</h3>
          <select
            className="input"
            value={formState.universityId}
            onChange={(event) => resetDepartment(event.target.value)}
          >
            <option value="">Select a university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={formState.departmentId}
            onChange={(event) => setFormState((previous) => ({ ...previous, departmentId: event.target.value }))}
            disabled={!selectedUniversity}
          >
            <option value="">Select a department (optional)</option>
            {selectedUniversity?.departments?.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <div className="inline-actions">
            <input
              className="input"
              placeholder="First name"
              value={formState.firstName}
              onChange={(event) => setFormState((previous) => ({ ...previous, firstName: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Last name"
              value={formState.lastName}
              onChange={(event) => setFormState((previous) => ({ ...previous, lastName: event.target.value }))}
            />
          </div>
          {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}
          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Add Instructor'}
          </button>
        </form>
      )}

      <article className="card form">
        <h3>Filter by University</h3>
        <select
          className="input"
          value={filterUniversityId}
          onChange={(event) => setFilterUniversityId(event.target.value)}
        >
          <option value="">All universities</option>
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
        </select>
      </article>

      <p className="instructors-count">Instructors ({filteredInstructors.length})</p>
    
      {error ? (
        <article className="card">
          <p>Failed to load instructors: {error}</p>
        </article>
      ) : isLoading ? (
        <article className="card">
          <p>Loading instructors...</p>
        </article>
      ) : filteredInstructors.length === 0 ? (
        <article className="card">
          <p>No instructors found.</p>
        </article>
      ) : (
        <div className="instructors-grid">
          {filteredInstructors.map((instructor) => (
            <article key={instructor.id} className="card instructor-card">
              <div className="instructor-card-header">
                <div>
                  <p className="instructor-id">{instructor.id}</p>
                  <h3 className="instructor-name">
                    {instructor.firstName} {instructor.lastName}
                  </h3>
                </div>
                <span className="instructor-badge">Instructor</span>
              </div>
              <div className="instructor-meta-grid">
                <div className="instructor-meta-item">
                  <span className="instructor-meta-label">University</span>
                  <span className="instructor-meta-value">{instructor.universityName}</span>
                </div>
                <div className="instructor-meta-item">
                  <span className="instructor-meta-label">Department</span>
                  <span className="instructor-meta-value">{instructor.departmentName || 'N/A'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default InstructorsPage
