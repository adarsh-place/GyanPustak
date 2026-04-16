import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './DashboardPage.css'

function buildEditFormData(student) {
  return {
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    email: student?.email || '',
    address: student?.address || '',
    phoneNumber: student?.phoneNumber || '',
    dateOfBirth: student?.dateOfBirth || '',
    universityId: student?.universityId || '',
    major: student?.major || '',
    yearOfStudy: student?.yearOfStudy || '',
    password: '',
  }
}

function buildEmployeeEditFormData(employee) {
  return {
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    gender: employee?.gender || '',
    aadhaarNumber: employee?.aadhaar || '',
    email: employee?.email || '',
    address: employee?.address || '',
    telephoneNumber: employee?.phone || '',
    password: '',
  }
}

function DashboardPage() {
  const { activeRole, authUserId, student, employees, tickets, orders, universities, reloadStudents, reloadEmployees } = useGyanPustak()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFormData, setEditFormData] = useState(buildEditFormData(student))
  const [employeeEditFormData, setEmployeeEditFormData] = useState(buildEmployeeEditFormData(null))
  const [editMessage, setEditMessage] = useState('')
  const [editMessageType, setEditMessageType] = useState('info')
  const [isEditLoading, setIsEditLoading] = useState(false)

  useEffect(() => {
    setEditFormData(buildEditFormData(student))
  }, [student])

  const currentEmployee = useMemo(() => {
    const matchingEmployee = employees.find((employee) => employee.id === authUserId)
    if (matchingEmployee) {
      return matchingEmployee
    }

    const matchingEmployeeByRole = employees.find((employee) => employee.role === activeRole)
    return matchingEmployeeByRole || null
  }, [activeRole, authUserId, employees])

  useEffect(() => {
    setEmployeeEditFormData(buildEmployeeEditFormData(currentEmployee))
  }, [currentEmployee])

  const ticketCount = useMemo(() => {
    if(activeRole === 'support') {
      return tickets.filter((ticket) => ticket.createdBy === 'support').length
    }
    return tickets.length
  }, [tickets, activeRole])

  const orderCount = useMemo(() => {
    return orders.length
  }, [orders])

  const yearOfStudyOptions = useMemo(() => {
    const defaultOptions = ['1', '2', '3', '4', '5', '6', '7', '8']
    const currentValue = String(editFormData.yearOfStudy || '').trim()

    if (currentValue && !defaultOptions.includes(currentValue)) {
      return [currentValue, ...defaultOptions]
    }

    return defaultOptions
  }, [editFormData.yearOfStudy])

  const handleEditChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleEmployeeEditChange = (field, value) => {
    setEmployeeEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    if (!student) return

    if (!editFormData.firstName.trim() || !editFormData.lastName.trim() || !editFormData.email.trim()) {
      setEditMessage('First name, last name, and email are required')
      setEditMessageType('error')
      return
    }

    setEditMessage('Saving profile...')
    setEditMessageType('info')
    setIsEditLoading(true)

    try {
      const payload = {
        first_name: editFormData.firstName.trim(),
        last_name: editFormData.lastName.trim(),
        email: editFormData.email.trim(),
        address: editFormData.address.trim(),
        phone_number: editFormData.phoneNumber.trim(),
        date_of_birth: editFormData.dateOfBirth.trim(),
        university_affiliation: editFormData.universityId.trim(),
        major_field_of_study: editFormData.major.trim(),
        year_of_study: editFormData.yearOfStudy.trim(),
      }

      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim()
      }

      await apiClient.updateStudent(student.id, payload)
      await reloadStudents?.()
      setEditFormData((prev) => ({
        ...prev,
        password: '',
      }))
      setEditMessage('Profile updated successfully')
      setEditMessageType('success')
      setIsEditingProfile(false)
      setTimeout(() => setEditMessage(''), 2000)
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : 'Failed to update profile')
      setEditMessageType('error')
      setTimeout(() => setEditMessage(''), 2000)
    } finally {
      setIsEditLoading(false)
    }
  }

  const handleSaveEmployeeProfile = async (event) => {
    event.preventDefault()
    if (!currentEmployee) return

    if (
      !employeeEditFormData.firstName.trim() ||
      !employeeEditFormData.lastName.trim() ||
      !employeeEditFormData.email.trim() ||
      !employeeEditFormData.aadhaarNumber.trim()
    ) {
      setEditMessage('First name, last name, email, and Aadhaar are required')
      setEditMessageType('error')
      return
    }

    setEditMessage('Saving profile...')
    setEditMessageType('info')
    setIsEditLoading(true)

    try {
      const payload = {
        first_name: employeeEditFormData.firstName.trim(),
        last_name: employeeEditFormData.lastName.trim(),
        gender: employeeEditFormData.gender.trim(),
        aadhaar_number: employeeEditFormData.aadhaarNumber.trim(),
        email: employeeEditFormData.email.trim(),
        address: employeeEditFormData.address.trim(),
        telephone_number: employeeEditFormData.telephoneNumber.trim(),
      }

      if (employeeEditFormData.password.trim()) {
        payload.password = employeeEditFormData.password.trim()
      }

      await apiClient.updateEmployee(currentEmployee.id, payload)
      await reloadEmployees?.()
      setEmployeeEditFormData((prev) => ({
        ...prev,
        password: '',
      }))
      setEditMessage('Profile updated successfully')
      setEditMessageType('success')
      setIsEditingProfile(false)
      setTimeout(() => setEditMessage(''), 2000)
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : 'Failed to update profile')
      setEditMessageType('error')
      setTimeout(() => setEditMessage(''), 2000)
    } finally {
      setIsEditLoading(false)
    }
  }

  return (
    <section className="section-stack dashboard-page">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
      </div>

      {activeRole === 'student' ? (
        <>
          <div className="stat-cards-grid">
            <article className="card stat-card">
              <p className="stat-label">My Tickets</p>
              <p className="stat-value">{ticketCount}</p>
            </article>
            <article className="card stat-card">
              <p className="stat-label">My Orders</p>
              <p className="stat-value">{orderCount}</p>
            </article>
          </div>

          <article className="card profile-card">
            <div className="profile-card-header">
              <h3 className="profile-title">Student Profile</h3>
              {!isEditingProfile && (
                <button className="button button-secondary edit-profile-btn" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </button>
              )}
            </div>
            {editMessage && (
              <article className={`status-message ${editMessageType}`}>{editMessage}</article>
            )}
            {student ? (
              isEditingProfile ? (
                <form className="profile-edit-form" onSubmit={handleSaveProfile}>
                  <div className="form-row">
                    <input
                      className="input"
                      placeholder="First Name"
                      value={editFormData.firstName}
                      onChange={(e) => handleEditChange('firstName', e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Last Name"
                      value={editFormData.lastName}
                      onChange={(e) => handleEditChange('lastName', e.target.value)}
                    />
                  </div>
                  <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={editFormData.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Address"
                    value={editFormData.address}
                    onChange={(e) => handleEditChange('address', e.target.value)}
                  />
                  <input
                    className="input"
                    type="tel"
                    placeholder="Phone Number"
                    value={editFormData.phoneNumber}
                    onChange={(e) => handleEditChange('phoneNumber', e.target.value)}
                  />
                  <input
                    className="input"
                    type="date"
                    placeholder="Date of Birth"
                    value={editFormData.dateOfBirth}
                    onChange={(e) => handleEditChange('dateOfBirth', e.target.value)}
                  />
                  <select
                    className="input"
                    value={editFormData.universityId}
                    onChange={(e) => handleEditChange('universityId', e.target.value)}
                  >
                    <option value="">Select University Affiliation</option>
                    {universities.map((university) => (
                      <option key={university.id} value={university.id}>
                        {university.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    placeholder="Major Field of Study"
                    value={editFormData.major}
                    onChange={(e) => handleEditChange('major', e.target.value)}
                  />
                  <select
                    className="input"
                    value={editFormData.yearOfStudy}
                    onChange={(e) => handleEditChange('yearOfStudy', e.target.value)}
                  >
                    <option value="">Select Year of Study</option>
                    {yearOfStudyOptions.map((yearOption) => (
                      <option key={yearOption} value={yearOption}>
                        Year {yearOption}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="password"
                    placeholder="Password (leave blank to keep current)"
                    value={editFormData.password}
                    onChange={(e) => handleEditChange('password', e.target.value)}
                  />
                  <div className="form-actions">
                    <button className="button" type="submit" disabled={isEditLoading}>
                      {isEditLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={isEditLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-content">
                  <div className="profile-name-section">
                    <p className="profile-name">
                      {student.firstName?.toUpperCase()} {student.lastName?.toUpperCase()}
                    </p>
                    <p className="profile-email">{student.email}</p>
                  </div>
                  <div className="profile-details-grid">
                    <div className="profile-detail">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{student.address || 'Not provided'}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{student.phoneNumber || 'Not provided'}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">Date of Birth</span>
                      <span className="detail-value">{student.dateOfBirth || 'Not provided'}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">University</span>
                      <span className="detail-value">{student.university}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">Major</span>
                      <span className="detail-value">{student.major}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">Year</span>
                      <span className="detail-value">{student.yearOfStudy}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">{student.status}</span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p>Loading student profile...</p>
            )}
          </article>
        </>
      ) : (
      <>
        {activeRole === 'support' &&
          <article className="card stat-card">
            <p className="stat-label">My Tickets</p>
            <p className="stat-value">{ticketCount}</p>
          </article>
        }
        <article className="card profile-card">
          <div className="profile-card-header">
            <h3 className="profile-title">Employee Profile</h3>
            {!isEditingProfile && (
              <button className="button button-secondary edit-profile-btn" onClick={() => setIsEditingProfile(true)}>
                Edit Profile
              </button>
            )}
          </div>
          {editMessage && (
            <article className={`status-message ${editMessageType}`}>{editMessage}</article>
          )}
          {currentEmployee ? (
            isEditingProfile ? (
              <form className="profile-edit-form" onSubmit={handleSaveEmployeeProfile}>
                <div className="form-row">
                  <input
                    className="input"
                    placeholder="First Name"
                    value={employeeEditFormData.firstName}
                    onChange={(e) => handleEmployeeEditChange('firstName', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Last Name"
                    value={employeeEditFormData.lastName}
                    onChange={(e) => handleEmployeeEditChange('lastName', e.target.value)}
                  />
                </div>
                <input
                  className="input"
                  placeholder="Gender"
                  value={employeeEditFormData.gender}
                  onChange={(e) => handleEmployeeEditChange('gender', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Aadhaar Number"
                  value={employeeEditFormData.aadhaarNumber}
                  onChange={(e) => handleEmployeeEditChange('aadhaarNumber', e.target.value)}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Email"
                  value={employeeEditFormData.email}
                  onChange={(e) => handleEmployeeEditChange('email', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Address"
                  value={employeeEditFormData.address}
                  onChange={(e) => handleEmployeeEditChange('address', e.target.value)}
                />
                <input
                  className="input"
                  type="tel"
                  placeholder="Phone Number"
                  value={employeeEditFormData.telephoneNumber}
                  onChange={(e) => handleEmployeeEditChange('telephoneNumber', e.target.value)}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Password (leave blank to keep current)"
                  value={employeeEditFormData.password}
                  onChange={(e) => handleEmployeeEditChange('password', e.target.value)}
                />
                <div className="form-actions">
                  <button className="button" type="submit" disabled={isEditLoading}>
                    {isEditLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isEditLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-content">
                <div className="profile-name-section">
                  <p className="profile-name">
                    {currentEmployee.firstName?.toUpperCase()} {currentEmployee.lastName?.toUpperCase()}
                  </p>
                  <p className="profile-email">{currentEmployee.email}</p>
                </div>
                <div className="profile-details-grid">
                  <div className="profile-detail">
                    <span className="detail-label">Employee ID</span>
                    <span className="detail-value">{currentEmployee.id}</span>
                  </div>
                  <div className="profile-detail">
                    <span className="detail-label">Role</span>
                    <span className="detail-value">{currentEmployee.role}</span>
                  </div>
                  <div className="profile-detail">
                    <span className="detail-label">Gender</span>
                    <span className="detail-value">{currentEmployee.gender || 'Not provided'}</span>
                  </div>
                  <div className="profile-detail">
                    <span className="detail-label">Salary</span>
                    <span className="detail-value">{currentEmployee.salary}</span>
                  </div>
                  <div className="profile-detail">
                    <span className="detail-label">Aadhaar</span>
                    <span className="detail-value">{currentEmployee.aadhaar || 'Not provided'}</span>
                  </div>
                  <div className="profile-detail">
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{currentEmployee.address || 'Not provided'}</span>
                  </div>
                  <div className="profile-detail">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{currentEmployee.phone || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <p>No employee record found for this role.</p>
          )}
        </article>
      </>
      )}
    </section>
  )
}

export default DashboardPage
