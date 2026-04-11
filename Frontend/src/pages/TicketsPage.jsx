import { useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { useGyanPustak } from '../context/GyanPustakContext'
import './TicketsPage.css'

function TicketsPage() {
  const {
    activeRole,
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
  const [expandedTickets, setExpandedTickets] = useState({});

  const toggleTicketHistory = (ticketId) => {
    setExpandedTickets((previous) => ({
      ...previous,
      [ticketId]: !previous[ticketId],
    }))
  }

  const canCreateTickets = ['student', 'support'].includes(activeRole)

  const visibleTickets = useMemo(() => {
    if (activeRole === 'student') {
      return tickets.filter((ticket) => ticket.createdBy === 'student')
    }
    return tickets
  }, [activeRole, tickets])

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
        createdById: activeRole === 'student' ? student.id : 'E3001',
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

    setActionMessage('Updating ticket status...')
    setActionType('info')
    setIsActionLoading(true)

    try {
      await apiClient.updateTicketStatus(ticketId, {
        status: nextStatus,
        changedByType: activeRole,
        changedById: activeRole === 'admin' ? 'E4001' : 'E5001',
        solutionDescription:
          nextStatus === 'completed' ? 'Issue resolved by administrator.' : undefined,
        resolvedByEmployeeId:
          nextStatus === 'completed' ? (activeRole === 'admin' ? 'E4001' : 'E5001') : undefined,
      })
      await reloadTickets()
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
      <h2>Trouble Tickets</h2>

      {canCreateTickets && (
        <form className="card form" onSubmit={submitTicket}>
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

      <div className="stack">
        {visibleTickets.map((ticket) => {
          const supportCanAssign = activeRole === 'support' && ticket.status === 'new'
          const adminCanProgress =
            ['admin', 'superadmin'].includes(activeRole) &&
            ['assigned', 'in-process'].includes(ticket.status)

          return (
            <article key={ticket.id} className="card">
              <div className="card-header">
                <h3>
                  {ticket.id} • {ticket.title}
                </h3>
                <span className="badge">{ticket.status}</span>
              </div>
              <p>
                Category: {ticket.category} | Logged: {ticket.loggedDate} | Created by:{' '}
                {ticket.createdBy}
              </p>
              <p>{ticket.problemDescription}</p>
              {ticket.solutionDescription && <p>Solution: {ticket.solutionDescription}</p>}

              <div className="inline-actions">
                {supportCanAssign && (
                  <button className="button" onClick={() => assignTicket(ticket.id)} disabled={isActionLoading}>
                    Assign to Admin
                  </button>
                )}

                {adminCanProgress && (
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
                          <div className="checkpoint-meta">{item.by} • {item.date}</div>
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
