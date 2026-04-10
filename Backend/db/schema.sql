CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  address TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  university_affiliation TEXT NOT NULL,
  major_field_of_study TEXT NOT NULL,
  student_status TEXT NOT NULL CHECK (student_status IN ('undergraduate', 'graduate')),
  year_of_study TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  aadhaar_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT,
  telephone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('support', 'admin', 'superadmin')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  representative_first_name TEXT NOT NULL,
  representative_last_name TEXT NOT NULL,
  representative_email TEXT NOT NULL,
  representative_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (university_id, name)
);

CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  semester TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_departments (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, department_id)
);

CREATE TABLE IF NOT EXISTS course_instructors (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, instructor_id)
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new', 'used')),
  purchase_option TEXT[] NOT NULL DEFAULT ARRAY['buy']::TEXT[],
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  isbn TEXT NOT NULL UNIQUE,
  publisher TEXT NOT NULL,
  publication_date DATE NOT NULL,
  edition_number TEXT NOT NULL,
  language TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('hardcover', 'softcover', 'electronic')),
  category TEXT NOT NULL,
  subcategories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rating NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_authors (
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (book_id, author_name)
);

CREATE TABLE IF NOT EXISTS book_keywords (
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  PRIMARY KEY (book_id, keyword)
);

CREATE TABLE IF NOT EXISTS course_books (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('required', 'recommended')),
  PRIMARY KEY (course_id, book_id)
);

CREATE TABLE IF NOT EXISTS trouble_tickets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('user profile', 'products', 'cart', 'orders', 'other')),
  created_by_type TEXT NOT NULL CHECK (created_by_type IN ('student', 'support')),
  created_by_id TEXT NOT NULL,
  title TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  solution_description TEXT NOT NULL DEFAULT '',
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  status TEXT NOT NULL CHECK (status IN ('new', 'assigned', 'in-process', 'completed', 'closed')),
  resolved_by_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id BIGSERIAL PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES trouble_tickets(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('new', 'assigned', 'in-process', 'completed', 'closed')),
  changed_by_type TEXT NOT NULL CHECK (changed_by_type IN ('student', 'support', 'admin', 'superadmin')),
  changed_by_id TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (cart_id, book_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  shipping_type TEXT NOT NULL CHECK (shipping_type IN ('standard', '2-day', '1-day')),
  credit_card_number TEXT NOT NULL,
  credit_card_expiration_date TEXT NOT NULL,
  credit_card_holder_name TEXT NOT NULL,
  credit_card_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'processed', 'awaiting shipping', 'shipped', 'canceled')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (order_id, book_id)
);
