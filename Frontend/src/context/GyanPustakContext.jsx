import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client'

const GyanPustakContext = createContext(null)

function toDisplayDate(value) {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function mapStudent(studentRow) {
  return {
    id: studentRow.id,
    firstName: studentRow.first_name,
    lastName: studentRow.last_name,
    email: studentRow.email,
    address: studentRow.address,
    phoneNumber: studentRow.phone_number,
    dateOfBirth: studentRow.date_of_birth,
    university: studentRow.university_name || studentRow.university_affiliation,
    universityId: studentRow.university_affiliation,
    universityName: studentRow.university_name || studentRow.university_affiliation,
    major: studentRow.major_field_of_study,
    status: studentRow.student_status,
    yearOfStudy: studentRow.year_of_study,
  }
}

function mapEmployee(employeeRow) {
  return {
    id: employeeRow.id,
    firstName: employeeRow.first_name,
    lastName: employeeRow.last_name,
    role: employeeRow.role,
    gender: employeeRow.gender,
    salary: employeeRow.salary,
    aadhaar: employeeRow.aadhaar_number,
    email: employeeRow.email,
    address: employeeRow.address,
    phone: employeeRow.telephone_number,
  }
}

function mapBook(bookRow) {
  return {
    id: bookRow.id,
    title: bookRow.title,
    type: bookRow.type,
    purchaseOption: bookRow.purchaseOption || bookRow.purchase_option || [],
    price: Number(bookRow.price),
    quantity: Number(bookRow.quantity),
    isbn: bookRow.isbn,
    publisher: bookRow.publisher,
    publicationDate: toDisplayDate(bookRow.publicationDate || bookRow.publication_date),
    edition: bookRow.edition || bookRow.edition_number,
    language: bookRow.language,
    format: bookRow.format,
    category: bookRow.category,
    subcategories: bookRow.subcategories || [],
    rating: Number(bookRow.rating),
    authors: bookRow.authors || [],
    keywords: bookRow.keywords || [],
    courseLinks: bookRow.courseLinks || [],
  }
}

function mapUniversity(universityRow) {
  return {
    id: universityRow.id,
    name: universityRow.name,
    address: universityRow.address,
    representative: {
      firstName: universityRow.representative.firstName,
      lastName: universityRow.representative.lastName,
      email: universityRow.representative.email,
      phone: universityRow.representative.phone,
    },
    departments: universityRow.departments || [],
    instructors: universityRow.instructors || [],
  }
}

function mapCourse(courseRow, universityName) {
  return {
    id: courseRow.id,
    name: courseRow.name,
    university: universityName || courseRow.universityId,
    year: courseRow.year,
    semester: courseRow.semester,
    departments: (courseRow.departments || []).map((department) => department.name),
    instructors: courseRow.instructors || [],
    books: courseRow.books || [],
  }
}

function mapCourses(courseRows, universitiesList) {
  const universityById = new Map(universitiesList.map((university) => [university.id, university.name]))
  return (courseRows || []).map((courseRow) => mapCourse(courseRow, universityById.get(courseRow.universityId)))
}

function mapTicket(ticketRow) {
  return {
    id: ticketRow.id,
    category: ticketRow.category,
    createdBy: ticketRow.createdBy,
    createdById: ticketRow.createdById,
    createdByName: ticketRow.createdByName,
    title: ticketRow.title,
    problemDescription: ticketRow.problemDescription,
    solutionDescription: ticketRow.solutionDescription,
    loggedDate: toDisplayDate(ticketRow.loggedDate),
    completionDate: toDisplayDate(ticketRow.completionDate),
    status: ticketRow.status,
    resolvedBy: ticketRow.resolvedBy,
    resolvedByName: ticketRow.resolvedByName,
    history: (ticketRow.history || []).map((historyEntry) => ({
      status: historyEntry.status,
      by: historyEntry.by,
      date: toDisplayDate(historyEntry.date),
      byId: historyEntry.byId,
      byName: historyEntry.byName,
    })),
  }
}

function mapCart(cartRow) {
  return {
    id: cartRow.id,
    studentId: cartRow.studentId,
    createdAt: toDisplayDate(cartRow.createdAt),
    updatedAt: toDisplayDate(cartRow.updatedAt),
    items: (cartRow.items || []).map((item) => ({
      id: item.bookId,
      title: item.title,
      price: Number(item.price),
      format: item.format,
      type: item.type,
      quantity: Number(item.quantity),
      purchaseOption: item.purchaseOption,
    })),
  }
}

function mapOrder(orderRow) {
  return {
    orderId: orderRow.id,
    studentId: orderRow.studentId,
    dateCreated: toDisplayDate(orderRow.createdAt),
    dateFulfilled: toDisplayDate(orderRow.fulfilledAt),
    items: (orderRow.items || []).map((item) => item.bookId),
    shippingType: orderRow.shippingType,
    cardNumber: orderRow.creditCardNumber,
    cardExpiry: orderRow.creditCardExpirationDate,
    cardHolderName: orderRow.creditCardHolderName,
    cardType: orderRow.creditCardType,
    status: orderRow.status,
  }
}

function mapInstructor(instructorRow) {
  return {
    id: instructorRow.id,
    firstName: instructorRow.first_name,
    lastName: instructorRow.last_name,
    universityId: instructorRow.university_id,
    departmentId: instructorRow.department_id,
    universityName: instructorRow.university_name,
    departmentName: instructorRow.department_name,
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected error'
}

export function GyanPustakProvider({ children }) {
  const [activeRole, setActiveRole] = useState('student')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [books, setBooks] = useState([])
  const [universities, setUniversities] = useState([])
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [employees, setEmployees] = useState([])
  const [tickets, setTickets] = useState([])
  const [cart, setCart] = useState({ id: '', studentId: '', createdAt: '', updatedAt: '', items: [] })
  const [orders, setOrders] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const primaryStudent = students[0];

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      setIsCheckingAuth(true)

      try {
        const response = await apiClient.getSession()
        const session = response?.data

        if (!isMounted) {
          return
        }

        if (session?.authenticated) {
          setIsAuthenticated(true)
          setActiveRole(session.role || 'student')
        } else {
          setIsAuthenticated(false)
          setActiveRole('student')
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setIsAuthenticated(false)
        setActiveRole('student')
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [booksResponse, universitiesResponse, coursesResponse, studentsResponse, employeesResponse, ticketsResponse, instructorsResponse] = await Promise.all([
        apiClient.getBooks(),
        apiClient.getUniversities(),
        apiClient.getCourses(),
        apiClient.getStudents(),
        apiClient.getEmployees(),
        apiClient.getTickets(),
        apiClient.getInstructors(),
      ])

      const loadedUniversities = (universitiesResponse.data || []).map(mapUniversity)
      const universityById = new Map(loadedUniversities.map((university) => [university.id, university.name]))

      setBooks((booksResponse.data || []).map(mapBook))
      setUniversities(loadedUniversities)
      setCourses(mapCourses(coursesResponse.data || [], loadedUniversities))
      setStudents((studentsResponse.data || []).map(mapStudent))
      setEmployees((employeesResponse.data || []).map(mapEmployee))
      setTickets((ticketsResponse.data || []).map(mapTicket))
      setInstructors((instructorsResponse.data || []).map(mapInstructor))

      if (activeRole === 'student') {
        const [cartResponse, ordersResponse] = await Promise.all([
          apiClient.getCart(),
          apiClient.getOrders(),
        ])

        setCart(mapCart(cartResponse.data || { items: [] }))
        setOrders((ordersResponse.data || []).map(mapOrder))
      } else {
        setCart(mapCart({ items: [] }))
        setOrders([])
      }
    } catch (fetchError) {
      const message = getErrorMessage(fetchError)
      setError(message)

      if (message.toLowerCase().includes('authentication required')) {
        setIsAuthenticated(false)
        setActiveRole('student')
      }
    } finally {
      setIsLoading(false)
    }
  }, [activeRole])

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    loadData()
  }, [isAuthenticated, loadData])

  const loginAsRole = useCallback(async (credentials) => {
    const response = await apiClient.login(credentials)
    setActiveRole(response?.data?.role || credentials.role)
    setIsAuthenticated(true)
    setIsCheckingAuth(false)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsAuthenticated(false)
      setActiveRole('student')
      setIsCheckingAuth(false)
    }
  }, [])

  const cartBooks = useMemo(() => cart.items, [cart.items])
  const reloadBooks = useCallback(async () => {
    const booksResponse = await apiClient.getBooks()
    setBooks((booksResponse.data || []).map(mapBook))
  }, [])

  const reloadUniversities = useCallback(async () => {
    const universitiesResponse = await apiClient.getUniversities()
    setUniversities((universitiesResponse.data || []).map(mapUniversity))
  }, [])

  const reloadCourses = useCallback(async () => {
    const [coursesResponse, universitiesResponse] = await Promise.all([
      apiClient.getCourses(),
      apiClient.getUniversities(),
    ])

    const loadedUniversities = (universitiesResponse.data || []).map(mapUniversity)
    setUniversities(loadedUniversities)
    setCourses(mapCourses(coursesResponse.data || [], loadedUniversities))
  }, [])

  const reloadTickets = useCallback(async () => {
    const ticketsResponse = await apiClient.getTickets()
    setTickets((ticketsResponse.data || []).map(mapTicket))
  }, [])

  const reloadEmployees = useCallback(async () => {
    const employeesResponse = await apiClient.getEmployees()
    setEmployees((employeesResponse.data || []).map(mapEmployee))
  }, [])

  const reloadCart = useCallback(async () => {
    if (activeRole !== 'student') {
      setCart(mapCart({ items: [] }))
      return
    }

    const cartResponse = await apiClient.getCart()
    setCart(mapCart(cartResponse.data || { items: [] }))
  }, [activeRole])

  const reloadOrders = useCallback(async () => {
    if (activeRole !== 'student') {
      setOrders([])
      return
    }

    const ordersResponse = await apiClient.getOrders()
    setOrders((ordersResponse.data || []).map(mapOrder))
  }, [activeRole])

  const reloadStudents = useCallback(async () => {
    const studentsResponse = await apiClient.getStudents()
    setStudents((studentsResponse.data || []).map(mapStudent))
  }, [])

  const reloadInstructors = useCallback(async () => {
    const instructorsResponse = await apiClient.getInstructors()
    setInstructors((instructorsResponse.data || []).map(mapInstructor))
  }, [])

  const value = {
    isAuthenticated,
    activeRole,
    loginAsRole,
    logout,
    student: primaryStudent,
    books,
    universities,
    courses,
    students,
    tickets,
    cart,
    cartBooks,
    orders,
    employees,
    instructors,
    setIsLoading,
    isLoading,
    isCheckingAuth,
    error,
    reloadBooks,
    reloadUniversities,
    reloadCourses,
    reloadTickets,
    reloadStudents,
    reloadEmployees,
    reloadCart,
    reloadOrders,
    reloadInstructors,
  }

  return <GyanPustakContext.Provider value={value}>{children}</GyanPustakContext.Provider>
}

export function useGyanPustak() {
  const context = useContext(GyanPustakContext)
  if (!context) {
    throw new Error('useGyanPustak must be used within GyanPustakProvider')
  }
  return context
}
