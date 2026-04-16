import { useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './UniversitiesPage.css'

function UniversitiesPage() {
  const { universities, courses, activeRole, reloadUniversities } = useGyanPustak()
  const [formState, setFormState] = useState({
    name: '',
    address: '',
    representativeFirstName: '',
    representativeLastName: '',
    representativeEmail: '',
    representativePhone: '',
  })
  const [departmentFormState, setDepartmentFormState] = useState({
    universityId: '',
    name: '',
  })
  const [universityActionMessage, setUniversityActionMessage] = useState('')
  const [universityActionType, setUniversityActionType] = useState('info')
  const [departmentActionMessage, setDepartmentActionMessage] = useState('')
  const [departmentActionType, setDepartmentActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)

  const canAddUniversity = activeRole === 'admin' || activeRole === 'superadmin'

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/[\s-]/g, '')
    const plusFormat = /^\+91\d{10}$/
    const plainFormat = /^\d{10}$/
    return plusFormat.test(cleaned) || plainFormat.test(cleaned)
  }

  const submitUniversity = async (event) => {
    event.preventDefault()
    if (!canAddUniversity) {
      return
    }

    if (
      !formState.name.trim() ||
      !formState.address.trim() ||
      !formState.representativeFirstName.trim() ||
      !formState.representativeLastName.trim() ||
      !formState.representativeEmail.trim() ||
      !formState.representativePhone.trim()
    ) {
      setUniversityActionMessage('All university fields are required')
      setUniversityActionType('error')
      return
    }

    if (!isValidEmail(formState.representativeEmail.trim())) {
      setUniversityActionMessage('Invalid representative email format (e.g., user@example.com)')
      setUniversityActionType('error')
      return
    }

    if (!isValidPhone(formState.representativePhone.trim())) {
      setUniversityActionMessage('Invalid representative phone format (10 digits or +91 followed by 10 digits)')
      setUniversityActionType('error')
      return
    }

    setUniversityActionMessage('Adding university...')
    setUniversityActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createUniversity({
        name: formState.name.trim(),
        address: formState.address.trim(),
        representativeFirstName: formState.representativeFirstName.trim(),
        representativeLastName: formState.representativeLastName.trim(),
        representativeEmail: formState.representativeEmail.trim(),
        representativePhone: formState.representativePhone.trim(),
      })

      await reloadUniversities?.()
      setFormState({
        name: '',
        address: '',
        representativeFirstName: '',
        representativeLastName: '',
        representativeEmail: '',
        representativePhone: '',
      })
      setUniversityActionMessage('University added successfully')
      setUniversityActionType('success')
    } catch (error) {
      setUniversityActionMessage(error instanceof Error ? error.message : 'Failed to add university')
      setUniversityActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setUniversityActionMessage(''), 1800)
    }
  }

  const submitDepartment = async (event) => {
    event.preventDefault()
    if (!canAddUniversity) {
      return
    }

    if (!departmentFormState.universityId.trim() || !departmentFormState.name.trim()) {
      setDepartmentActionMessage('University and department name are required')
      setDepartmentActionType('error')
      return
    }

    setDepartmentActionMessage('Adding department...')
    setDepartmentActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.createDepartment(departmentFormState.universityId, {
        name: departmentFormState.name.trim(),
      })

      await reloadUniversities?.()
      setDepartmentFormState({
        universityId: '',
        name: '',
      })
      setDepartmentActionMessage('Department added successfully')
      setDepartmentActionType('success')
    } catch (error) {
      setDepartmentActionMessage(error instanceof Error ? error.message : 'Failed to add department')
      setDepartmentActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setDepartmentActionMessage(''), 1800)
    }
  }

  return (
    <section className="section-stack universities-page">
      <div className="universities-header">
        <h2>Universities and Departments</h2>
        <p className="universities-count">{universities.length} listed</p>
      </div>

      {canAddUniversity && (
        <form className="card form" onSubmit={submitUniversity}>
          <h3>Add University</h3>
          <input
            className="input"
            placeholder="University name"
            value={formState.name}
            onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Address"
            value={formState.address}
            onChange={(event) => setFormState((previous) => ({ ...previous, address: event.target.value }))}
          />
          <div className="inline-actions">
            <input
              className="input"
              placeholder="Representative first name"
              value={formState.representativeFirstName}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, representativeFirstName: event.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Representative last name"
              value={formState.representativeLastName}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, representativeLastName: event.target.value }))
              }
            />
          </div>
          <input
            className="input"
            placeholder="Representative email"
            value={formState.representativeEmail}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, representativeEmail: event.target.value }))
            }
          />
          <input
            className="input"
            placeholder="Representative phone"
            value={formState.representativePhone}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, representativePhone: event.target.value }))
            }
          />
          {universityActionMessage && <article className={`status-message ${universityActionType}`}>{universityActionMessage}</article>}
          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Add University'}
          </button>
        </form>
      )}

      {canAddUniversity && (
        <form className="card form" onSubmit={submitDepartment}>
          <h3>Add Department</h3>
          <select
            className="input"
            value={departmentFormState.universityId}
            onChange={(event) =>
              setDepartmentFormState((previous) => ({ ...previous, universityId: event.target.value }))
            }
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
            placeholder="Department name"
            value={departmentFormState.name}
            onChange={(event) =>
              setDepartmentFormState((previous) => ({ ...previous, name: event.target.value }))
            }
          />
          {departmentActionMessage && <article className={`status-message ${departmentActionType}`}>{departmentActionMessage}</article>}
          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Add Department'}
          </button>
        </form>
      )}

      <div className="universities-grid">
        {universities.map((university) => (
          <article key={university.id} className="card university-card">
            <div className="university-card-header">
              <h3>{university.name}</h3>
              {/* <span className="department-count-badge">
                {university.departments.length} departments
              </span> */}
            </div>

            <p className="university-address">{university.address}</p>

            <div className="university-representative">
              <p className="representative-label">Representative</p>
              <p className="representative-name">
                {university.representative?.firstName} {university.representative?.lastName}
              </p>
              <p className="representative-contact">{university.representative?.email}</p>
              <p className="representative-contact">{university.representative?.phone}</p>
            </div>

            <div className="department-chip-list">
              {university.departments.length > 0 ? (
                university.departments.map((department) => (
                  <span key={department.id} className="department-chip">
                    {department.name}
                  </span>
                ))
              ) : (
                <span className="department-empty">No departments added yet</span>
              )}
            </div>
          </article>
        ))}
      </div>

    </section>
  )
}

export default UniversitiesPage
