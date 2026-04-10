INSERT INTO students (id, first_name, last_name, email, address, phone_number, date_of_birth, university_affiliation, major_field_of_study, student_status, year_of_study)
VALUES
  ('S1001', 'Aarav', 'Sharma', 'aarav@college.edu', 'Delhi', '9000000001', '2003-05-14', 'National Tech University', 'Computer Science', 'undergraduate', '3rd Year')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, first_name, last_name, gender, salary, aadhaar_number, email, address, telephone_number, role)
VALUES
  ('E3001', 'Neha', 'Mishra', 'Female', 45000, '1111-2222-3333', 'neha.support@gyanpustak.com', 'Delhi', '9876543210', 'support'),
  ('E4001', 'Vikas', 'Rao', 'Male', 78000, '4444-5555-6666', 'vikas.admin@gyanpustak.com', 'Delhi', '9988776655', 'admin'),
  ('E5001', 'Asha', 'Kapoor', 'Female', 98000, '7777-8888-9999', 'asha.superadmin@gyanpustak.com', 'Delhi', '9012345678', 'superadmin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO universities (id, name, address, representative_first_name, representative_last_name, representative_email, representative_phone)
VALUES
  ('U01', 'National Tech University', 'Delhi, India', 'Ritika', 'Khanna', 'rep.ntu@univ.edu', '9990001112')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, university_id, name)
VALUES
  ('D01', 'U01', 'Computer Science'),
  ('D02', 'U01', 'Electronics')
ON CONFLICT (id) DO NOTHING;

INSERT INTO instructors (id, university_id, department_id, first_name, last_name)
VALUES
  ('I01', 'U01', 'D01', 'Ankit', 'Verma'),
  ('I02', 'U01', 'D02', 'Seema', 'Jain')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (id, university_id, name, year, semester)
VALUES
  ('CS301', 'U01', 'Advanced Databases', '2026', 'Spring'),
  ('CS201', 'U01', 'Data Structures', '2026', 'Spring')
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_departments (course_id, department_id)
VALUES
  ('CS301', 'D01'),
  ('CS201', 'D01')
ON CONFLICT DO NOTHING;

INSERT INTO course_instructors (course_id, instructor_id)
VALUES
  ('CS301', 'I01'),
  ('CS201', 'I01')
ON CONFLICT DO NOTHING;

INSERT INTO books (id, title, type, purchase_option, price, quantity, isbn, publisher, publication_date, edition_number, language, format, category, subcategories, rating)
VALUES
  ('B101', 'Database System Concepts', 'new', ARRAY['buy', 'rent'], 780, 15, '9780073523323', 'McGraw Hill', '2021-01-10', '7th', 'English', 'hardcover', 'Databases', ARRAY['SQL', 'RDBMS'], 4.6),
  ('B102', 'Operating System Principles', 'used', ARRAY['buy'], 420, 8, '9781118063330', 'Wiley', '2019-06-25', '9th', 'English', 'softcover', 'Operating Systems', ARRAY['Processes', 'Scheduling'], 4.2),
  ('B103', 'Data Structures in C++', 'new', ARRAY['buy', 'rent'], 320, 100, '9780132847377', 'Pearson', '2020-04-19', '4th', 'English', 'electronic', 'Programming', ARRAY['Data Structures'], 4.7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO book_authors (book_id, author_name, author_order)
VALUES
  ('B101', 'Silberschatz', 1),
  ('B101', 'Korth', 2),
  ('B102', 'Galvin', 1),
  ('B103', 'Mark Allen Weiss', 1)
ON CONFLICT DO NOTHING;

INSERT INTO book_keywords (book_id, keyword)
VALUES
  ('B101', 'database'),
  ('B101', 'sql'),
  ('B101', 'normalization'),
  ('B102', 'os'),
  ('B102', 'kernel'),
  ('B103', 'trees'),
  ('B103', 'graphs'),
  ('B103', 'algorithms')
ON CONFLICT DO NOTHING;

INSERT INTO course_books (course_id, book_id, relation)
VALUES
  ('CS301', 'B101', 'required'),
  ('CS301', 'B103', 'recommended'),
  ('CS201', 'B103', 'required')
ON CONFLICT DO NOTHING;

INSERT INTO trouble_tickets (id, category, created_by_type, created_by_id, title, problem_description, solution_description, logged_date, status)
VALUES
  ('T1001', 'products', 'student', 'S1001', 'Wrong book edition listed', 'The shown edition does not match the delivered copy.', '', '2026-04-01', 'new'),
  ('T1002', 'orders', 'support', 'E3001', 'Bulk cancellation request', 'A student requested cancellation for duplicate order.', 'Assigned to admin for validation.', '2026-03-28', 'assigned')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_status_history (ticket_id, status, changed_by_type, changed_by_id)
VALUES
  ('T1001', 'new', 'student', 'S1001'),
  ('T1002', 'new', 'support', 'E3001'),
  ('T1002', 'assigned', 'support', 'E3001')
ON CONFLICT DO NOTHING;

INSERT INTO carts (id, student_id)
VALUES
  ('C1001', 'S1001')
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO cart_items (cart_id, book_id, quantity)
VALUES
  ('C1001', 'B101', 1)
ON CONFLICT DO NOTHING;

INSERT INTO orders (id, student_id, shipping_type, credit_card_number, credit_card_expiration_date, credit_card_holder_name, credit_card_type, status)
VALUES
  ('O9001', 'S1001', '2-day', '**** **** **** 7621', '09/28', 'Aarav Sharma', 'Visa', 'awaiting shipping')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, book_id, quantity)
VALUES
  ('O9001', 'B101', 1)
ON CONFLICT DO NOTHING;
