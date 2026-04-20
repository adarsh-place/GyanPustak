import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './TicketsPage.css'

function TicketsPage() {
  const {
    activeRole,
    authUserId,
    tickets,
    student,
    reloadTickets,
  } = useGyanPustak()

  const [formState, setFormState] = useState({
    category: 'products',
    title: '',
    problemDescription: '',
  })
  const [actionMessage, setActionMessage] = useState('')
  const [actionType, setActionType] = useState('info')
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [expandedTickets, setExpandedTickets] = useState({})
  const [solutionInputs, setSolutionInputs] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')

  const toggleTicketHistory = (ticketId) => {
    setExpandedTickets((previous) => ({
      ...previous,
      [ticketId]: !previous[ticketId],
    }))
  }

  const canCreateTickets = ['student', 'support'].includes(activeRole)

  const formatRole = (role) => {
    if (!role) {
      return ''
    }
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const visibleTickets = useMemo(() => {
    const roleFilteredTickets =
      activeRole === 'student'
        ? tickets.filter((ticket) => ticket.createdBy === 'student')
        : tickets

    const adminFilteredTickets = ['admin', 'superadmin'].includes(activeRole)
      ? roleFilteredTickets.filter((ticket) => ticket.status !== 'new')
      : roleFilteredTickets

    if (statusFilter === 'all') {
      return adminFilteredTickets
    }

    return adminFilteredTickets.filter((ticket) => ticket.status === statusFilter)
  }, [activeRole, statusFilter, tickets])

  const submitTicket = (event) => {
    event.preventDefault()
    if (!formState.title.trim() || !formState.problemDescription.trim()) {
      return
    }

    setActionMessage('Creating ticket...')
    setActionType('info')
    setIsActionLoading(true)

    apiClient
      .createTicket({
        id: `T${Date.now()}`,
        category: formState.category,
        createdByType: activeRole,
        createdById: activeRole === 'student' ? student.email : authUserId,
        title: formState.title.trim(),
        problemDescription: formState.problemDescription.trim(),
        status: 'new',
      })
      .then(() => {
        reloadTickets()
        setActionMessage('Ticket created successfully')
        setActionType('success')
      })
      .catch((error) => {
        setActionMessage(error instanceof Error ? error.message : 'Failed to create ticket')
        setActionType('error')
      })
      .finally(() => {
        setIsActionLoading(false)
        setTimeout(() => setActionMessage(''), 1800)
        setFormState({ category: 'products', title: '', problemDescription: '' })
      })
  }

  const assignTicket = async (ticketId) => {
    setActionMessage('Assigning ticket...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.updateTicketStatus(ticketId, {
        status: 'assigned',
        changedByType: 'support',
        changedById: 'E3001',
      })
      await reloadTickets()
      setActionMessage('Ticket assigned successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to assign ticket')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  const progressTicket = async (ticketId) => {
    const currentTicket = tickets.find((ticket) => ticket.id === ticketId)
    const nextStatusByCurrent = {
      assigned: 'in-process',
      'in-process': 'completed',
    }

    const nextStatus = nextStatusByCurrent[currentTicket?.status]
    if (!nextStatus) {
      return
    }

    const solutionText = (solutionInputs[ticketId] || '').trim()
    if (nextStatus === 'completed' && !solutionText) {
      setActionMessage('Please enter the solution before marking the ticket completed')
      setActionType('error')
      return
    }

    setActionMessage('Updating ticket status...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.updateTicketStatus(ticketId, {
        status: nextStatus,
        changedByType: activeRole,
        changedById: activeRole === 'admin' ? 'E4001' : 'E5001',
        solutionDescription: nextStatus === 'completed' ? solutionText : undefined,
        resolvedByEmployeeId:
          nextStatus === 'completed' ? (activeRole === 'admin' ? 'E4001' : 'E5001') : undefined,
      })
      await reloadTickets()
      if (nextStatus === 'completed') {
        setSolutionInputs((previous) => ({ ...previous, [ticketId]: '' }))
      }
      setActionMessage('Ticket updated successfully')
      setActionType('success')
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Failed to update ticket')
      setActionType('error')
    } finally {
      setIsActionLoading(false)
      setTimeout(() => setActionMessage(''), 1800)
    }
  }

  return (
    <section className="section-stack tickets-page">
      <div className="tickets-header">
        <div>
          <h2>Trouble Tickets</h2>
          <p className="page-eyebrow">Support Desk</p>
        </div>
      </div>

      {canCreateTickets && (
        <form className="card form ticket-form-card" onSubmit={submitTicket}>
          <h3>Create Ticket</h3>
          <select
            className="input"
            value={formState.category}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, category: event.target.value }))
            }
          >
            <option value="user profile">User profile</option>
            <option value="products">Products</option>
            <option value="cart">Cart</option>
            <option value="orders">Orders</option>
            <option value="other">Other</option>
          </select>

          <input
            className="input"
            placeholder="Ticket title"
            value={formState.title}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, title: event.target.value }))
            }
          />

          <textarea
            className="input"
            placeholder="Problem description"
            rows={3}
            value={formState.problemDescription}
            onChange={(event) =>
              setFormState((previous) => ({ ...previous, problemDescription: event.target.value }))
            }
          />

          <button className="button" type="submit" disabled={isActionLoading}>
            {isActionLoading ? 'Working...' : 'Submit ticket'}
          </button>
        </form>
      )}

      {actionMessage && <article className={`status-message ${actionType}`}>{actionMessage}</article>}

      <div className="card form ticket-filter-card">
        <h3>Filter by Status</h3>
        <select
          className="input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All Statuses</option>
          {!['admin', 'superadmin'].includes(activeRole) && <option value="new">New</option>}
          <option value="assigned">Assigned</option>
          <option value="in-process">In Process</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <p className="tickets-count">{activeRole === 'student' ? 'My' : 'All'} Tickets ({visibleTickets.length})</p>
      <div className="tickets-stack">
        {visibleTickets.map((ticket) => {
          const supportCanAssign = activeRole === 'support' && ticket.status === 'new'
          const adminCanProgress =
            ['admin', 'superadmin'].includes(activeRole) &&
            ['assigned', 'in-process'].includes(ticket.status)

          return (
            <article key={ticket.id} className="card ticket-card">
              <div className="ticket-card-header">
                <div>
                  <p className="ticket-id">{ticket.id}</p>
                  <h3 className="ticket-title">{ticket.title}</h3>
                </div>
                <span className={`ticket-badge ${ticket.status}`}>{ticket.status}</span>
              </div>
              <div className="ticket-meta-grid">
                <div className="ticket-meta-item">
                  <span className="ticket-meta-label">Category</span>
                  <span className="ticket-meta-value">{ticket.category}</span>
                </div>
                <div className="ticket-meta-item">
                  <span className="ticket-meta-label">Logged</span>
                  <span className="ticket-meta-value">{ticket.loggedDate || 'N/A'}</span>
                </div>
                <div className="ticket-meta-item">
                  <span className="ticket-meta-label">Created by</span>
                  <span className="ticket-meta-value">
                    {formatRole(ticket.createdBy)} ({ticket.createdByName || ticket.createdById || 'N/A'})
                  </span>
                </div>
              </div>

              <div className="ticket-description-block">
                <p className="ticket-description-label">Problem</p>
                <p className="ticket-description-text">{ticket.problemDescription}</p>
              </div>

              {ticket.solutionDescription && (
                <div className="ticket-description-block solution">
                  <p className="ticket-description-label">Solution</p>
                  <p className="ticket-description-text">{ticket.solutionDescription}</p>
                </div>
              )}

              {ticket.resolvedBy && (
                <div className="ticket-resolved-chip">
                  Resolved by {ticket.resolvedByName || ticket.resolvedBy}
                </div>
              )}

              <div className="ticket-actions">
                {supportCanAssign && (
                  <button className="button" onClick={() => assignTicket(ticket.id)} disabled={isActionLoading}>
                    Assign to Admin
                  </button>
                )}

                {adminCanProgress && ticket.status === 'in-process' && (
                  <textarea
                    className="input ticket-solution-input"
                    rows={3}
                    placeholder="Enter solution before marking completed"
                    value={solutionInputs[ticket.id] || ''}
                    onChange={(event) =>
                      setSolutionInputs((previous) => ({ ...previous, [ticket.id]: event.target.value }))
                    }
                  />
                )}

                {adminCanProgress && activeRole !== 'superadmin' && (
                  <button className="button" onClick={() => progressTicket(ticket.id)} disabled={isActionLoading}>
                    {ticket.status === 'assigned' ? 'Start Processing' : 'Mark Completed'}
                  </button>
                )}
              </div>

              <button
                className="show-history-link"
                onClick={() => toggleTicketHistory(ticket.id)}
                type="button"
              >
                {expandedTickets[ticket.id] ? '▼ Hide' : '▶ Track'} History
              </button>

              {expandedTickets[ticket.id] && (
                <div className="timeline">
                  <div className="timeline-header">Status Timeline</div>
                  <div className="timeline-track">
                    {ticket.history.map((item, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-checkpoint">
                          <div className="checkpoint-dot"></div>
                        </div>
                        <div className="timeline-content">
                          <div className="checkpoint-status">{item.status.toUpperCase()}</div>
                          <div className="checkpoint-meta">
                            {formatRole(item.by)} ({item.byName || item.byId || 'N/A'}) • {item.date}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default TicketsPage
