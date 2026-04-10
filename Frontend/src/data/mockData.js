export const roles = [
  { id: 'student', label: 'Student' },
  { id: 'support', label: 'Customer Support' },
  { id: 'admin', label: 'Administrator' },
  { id: 'superadmin', label: 'Super Administrator' },
]

export const students = [
  {
    id: 'S1001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: 'aarav@college.edu',
    university: 'National Tech University',
    major: 'Computer Science',
    status: 'Undergraduate',
    yearOfStudy: '3rd Year',
  },
]

export const employees = [
  {
    id: 'E3001',
    firstName: 'Neha',
    lastName: 'Mishra',
    role: 'support',
    gender: 'Female',
    salary: 45000,
    aadhaar: '1111-2222-3333',
    email: 'neha.support@gyanpustak.com',
    phone: '9876543210',
  },
  {
    id: 'E4001',
    firstName: 'Vikas',
    lastName: 'Rao',
    role: 'admin',
    gender: 'Male',
    salary: 78000,
    aadhaar: '4444-5555-6666',
    email: 'vikas.admin@gyanpustak.com',
    phone: '9988776655',
  },
]

export const books = [
  {
    id: 'B101',
    title: 'Database System Concepts',
    authors: ['Silberschatz', 'Korth'],
    isbn: '9780073523323',
    publisher: 'McGraw Hill',
    publicationDate: '2021-01-10',
    edition: '7th',
    language: 'English',
    format: 'Hardcover',
    type: 'new',
    purchaseOption: ['buy', 'rent'],
    price: 780,
    quantity: 15,
    category: 'Databases',
    subcategories: ['SQL', 'RDBMS'],
    keywords: ['database', 'sql', 'normalization'],
    rating: 4.6,
  },
  {
    id: 'B102',
    title: 'Operating System Principles',
    authors: ['Galvin'],
    isbn: '9781118063330',
    publisher: 'Wiley',
    publicationDate: '2019-06-25',
    edition: '9th',
    language: 'English',
    format: 'Softcover',
    type: 'used',
    purchaseOption: ['buy'],
    price: 420,
    quantity: 8,
    category: 'Operating Systems',
    subcategories: ['Processes', 'Scheduling'],
    keywords: ['os', 'kernel', 'threads'],
    rating: 4.2,
  },
  {
    id: 'B103',
    title: 'Data Structures in C++',
    authors: ['Mark Allen Weiss'],
    isbn: '9780132847377',
    publisher: 'Pearson',
    publicationDate: '2020-04-19',
    edition: '4th',
    language: 'English',
    format: 'Electronic',
    type: 'new',
    purchaseOption: ['buy', 'rent'],
    price: 320,
    quantity: 100,
    category: 'Programming',
    subcategories: ['Data Structures'],
    keywords: ['trees', 'graphs', 'algorithms'],
    rating: 4.7,
  },
]

export const universities = [
  {
    id: 'U01',
    name: 'National Tech University',
    address: 'Delhi, India',
    representative: {
      firstName: 'Ritika',
      lastName: 'Khanna',
      email: 'rep.ntu@univ.edu',
      phone: '9990001112',
    },
    departments: [
      {
        name: 'Computer Science',
        courses: ['CS201', 'CS301'],
      },
      {
        name: 'Electronics',
        courses: ['EC110'],
      },
    ],
    instructors: [
      { firstName: 'Ankit', lastName: 'Verma', department: 'Computer Science' },
      { firstName: 'Seema', lastName: 'Jain', department: 'Electronics' },
    ],
  },
]

export const courses = [
  {
    id: 'CS301',
    name: 'Advanced Databases',
    departments: ['Computer Science'],
    university: 'National Tech University',
    year: '2026',
    semester: 'Spring',
    instructors: ['Ankit Verma'],
    books: [
      { bookId: 'B101', relation: 'required' },
      { bookId: 'B103', relation: 'recommended' },
    ],
  },
]

export const initialTickets = [
  {
    id: 'T1001',
    category: 'products',
    loggedDate: '2026-04-01',
    createdBy: 'student',
    createdById: 'S1001',
    title: 'Wrong book edition listed',
    problemDescription: 'The shown edition does not match the delivered copy.',
    solutionDescription: '',
    completionDate: '',
    status: 'new',
    resolvedBy: '',
    history: [{ status: 'new', by: 'student', date: '2026-04-01' }],
  },
  {
    id: 'T1002',
    category: 'orders',
    loggedDate: '2026-03-28',
    createdBy: 'support',
    createdById: 'E3001',
    title: 'Bulk cancellation request',
    problemDescription: 'A student requested cancellation for duplicate order.',
    solutionDescription: 'Assigned to admin for validation.',
    completionDate: '',
    status: 'assigned',
    resolvedBy: '',
    history: [
      { status: 'new', by: 'support', date: '2026-03-28' },
      { status: 'assigned', by: 'support', date: '2026-03-29' },
    ],
  },
]

export const initialOrders = [
  {
    orderId: 'O9001',
    studentId: 'S1001',
    dateCreated: '2026-04-02',
    dateFulfilled: '',
    items: ['B101'],
    shippingType: '2-day',
    cardNumber: '**** **** **** 7621',
    cardExpiry: '09/28',
    cardHolderName: 'Aarav Sharma',
    cardType: 'Visa',
    status: 'awaiting shipping',
  },
]
