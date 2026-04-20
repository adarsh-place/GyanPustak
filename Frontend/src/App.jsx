import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { roles } from './data/mockData'
import { GyanPustakProvider, useGyanPustak } from './context/GyanPustakContext'
import './App.css'
import LoadingBlock from './components/LoadingBlock'
import BookDetailsPage from './pages/BookDetailsPage'
import BooksPage from './pages/BooksPage'
import CartPage from './pages/CartPage'
import CoursesPage from './pages/CoursesPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import InstructorsPage from './pages/InstructorsPage'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import SignupPage from './pages/SignupPage'
import StudentsPage from './pages/StudentsPage'
import TicketsPage from './pages/TicketsPage'
import UniversitiesPage from './pages/UniversitiesPage'
import './App.css'

const visibleNavLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/books', label: 'Books', supportBlocked: true },
  { to: '/universities', label: 'Universities', supportBlocked: true },
  { to: '/courses', label: 'Courses', supportBlocked: true },
  { to: '/instructors', label: 'Instructors', supportBlocked: true },
  { to: '/tickets', label: 'Tickets' },
  { to: '/orders', label: 'Orders', staffOnly: true },
  { to: '/students', label: 'Students', adminOnly: true },
  { to: '/employees', label: 'Employees', staffOnly: true },
]

function App() {
  return (
    <GyanPustakProvider>
      <AppContent />
    </GyanPustakProvider>
  )
}

function AppContent() {
  const {
    isAuthenticated,
    activeRole,
    logout,
    isLoading,
    isCheckingAuth,
    error,
  } = useGyanPustak()

  const roleLabel = roles.find((role) => role.id === activeRole)?.label || activeRole
  const allowedNavLinks = visibleNavLinks.filter((link) => {
    if (link.studentOnly && activeRole !== 'student') return false
    if (link.adminOnly && activeRole !== 'admin' && activeRole !== 'superadmin') return false
    if (link.supportBlocked && activeRole === 'support') return false
    if (link.to === '/orders' && ['admin', 'superadmin'].includes(activeRole)) return false
    if (link.staffOnly && !['support', 'admin', 'superadmin'].includes(activeRole)) return false
    return true
  })

  if (isCheckingAuth) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>GyanPustak</h1>
            <p>Buy, rent and manage college textbooks</p>
          </div>
        </header>
        <main className="page-content">
          <article className="card">Checking authentication...</article>
        </main>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>GyanPustak</h1>
            <p>Buy, rent and manage college textbooks</p>
          </div>

          {isAuthenticated && (
            <div className="role-pill-wrap">
              {/* <p className="role-pill-label">Role</p>  */}
              <p className="role-pill-value">{roleLabel}</p>
              <button className="button button-secondary logout-button" onClick={logout} type="button">
                Logout
              </button>
            </div>
          )}
        </header>

        {isAuthenticated && (
          <nav className="nav-links">
            <div className="nav-links-main">
              {allowedNavLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {activeRole === 'student' && (
              <div className="nav-right-actions">
                <NavLink
                  to="/cart"
                  className={({ isActive }) =>
                    isActive ? 'nav-link nav-icon-link active' : 'nav-link nav-icon-link'
                  }
                  aria-label="Cart"
                  title="Cart"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M3 4h2l2.4 9.6A2 2 0 0 0 9.34 15h8.92a2 2 0 0 0 1.92-1.44L22 7H7.1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="20" r="1.5" fill="currentColor" />
                    <circle cx="18" cy="20" r="1.5" fill="currentColor" />
                  </svg>
                </NavLink>
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    isActive ? 'nav-link nav-text-link active' : 'nav-link nav-text-link'
                  }
                >
                  Orders
                </NavLink>
              </div>
            )}
          </nav>
        )}

        <main className="page-content">
          {error && <article className="card">Backend error: {error}</article>}
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : isLoading ? (
              <Route
                path="*"
                element={<LoadingBlock message="Loading Data..." />}
              />
            ) : (
              <>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/books" element={activeRole !== 'support' ? <BooksPage /> : <Navigate to="/" replace />} />
                <Route path="/books/:id" element={activeRole !== 'support' ? <BookDetailsPage /> : <Navigate to="/" replace />} />
                <Route path="/universities" element={activeRole !== 'support' ? <UniversitiesPage /> : <Navigate to="/" replace />} />
                <Route path="/courses" element={activeRole !== 'support' ? <CoursesPage /> : <Navigate to="/" replace />} />
                <Route path="/instructors" element={activeRole !== 'support' ? <InstructorsPage /> : <Navigate to="/" replace />} />
                <Route path="/tickets" element={<TicketsPage />} />
                <Route
                  path="/cart"
                  element={activeRole === 'student' ? <CartPage /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/orders"
                  element={
                    activeRole === 'student' ||
                    activeRole === 'support' ||
                    activeRole === 'admin' ||
                    activeRole === 'superadmin' ? (
                      <OrdersPage />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/students"
                  element={
                    activeRole === 'support' || activeRole === 'admin' || activeRole === 'superadmin' ? (
                      <StudentsPage />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
