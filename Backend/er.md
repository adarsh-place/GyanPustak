# GyanPustak ER Diagram (Aligned with Current Schema)

```mermaid
erDiagram
    STUDENTS {
        TEXT email PK
        TEXT first_name
        TEXT last_name
        TEXT address
        TEXT phone_number
        DATE date_of_birth
        TEXT university_affiliation
        TEXT major_field_of_study
        TEXT student_status
        TEXT year_of_study
        TEXT password_hash
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    EMPLOYEES {
        TEXT id PK
        TEXT first_name
        TEXT last_name
        TEXT gender
        NUMERIC salary
        TEXT aadhaar_number UK
        TEXT email UK
        TEXT address
        TEXT telephone_number
        TEXT role
        TEXT password_hash
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    UNIVERSITIES {
        TEXT id PK
        TEXT name UK
        TEXT address
        TEXT representative_first_name
        TEXT representative_last_name
        TEXT representative_email
        TEXT representative_phone
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    DEPARTMENTS {
        TEXT university_id FK
        TEXT name
    }

    INSTRUCTORS {
        TEXT id PK
        TEXT university_id FK
        TEXT department_name
        TEXT first_name
        TEXT last_name
    }

    COURSES {
        TEXT id PK
        TEXT university_id FK
        TEXT name
        TEXT year
        TEXT semester
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    COURSE_DEPARTMENTS {
        TEXT course_id FK
        TEXT university_id FK
        TEXT department_name FK
    }

    COURSE_INSTRUCTORS {
        TEXT course_id FK
        TEXT instructor_id FK
    }

    BOOKS {
        TEXT isbn PK
        TEXT title
        TEXT type
        TEXT_ARRAY purchase_option
        NUMERIC price
        INTEGER quantity
        TEXT publisher
        DATE publication_date
        TEXT edition_number
        TEXT language
        TEXT format
        TEXT category
        TEXT_ARRAY subcategories
        NUMERIC rating
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    BOOK_AUTHORS {
        TEXT book_id FK
        TEXT author_name
        INTEGER author_order
    }

    BOOK_KEYWORDS {
        TEXT book_id FK
        TEXT keyword
    }

    COURSE_BOOKS {
        TEXT course_id FK
        TEXT book_id FK
        TEXT relation
    }

    BOOK_REVIEWS {
        TEXT id PK
        TEXT book_id FK
        TEXT student_id FK
        INTEGER rating
        TEXT review_text
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    TROUBLE_TICKETS {
        TEXT id PK
        TEXT category
        TEXT created_by_type
        TEXT created_by_id
        TEXT title
        TEXT problem_description
        TEXT solution_description
        DATE logged_date
        DATE completion_date
        TEXT status
        TEXT resolved_by_employee_id FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    TICKET_STATUS_HISTORY {
        BIGSERIAL id PK
        TEXT ticket_id FK
        TEXT status
        TEXT changed_by_type
        TEXT changed_by_id
        TIMESTAMPTZ changed_at
    }

    CARTS {
        TEXT id PK
        TEXT student_id FK UK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    CART_ITEMS {
        TEXT cart_id FK
        TEXT book_id FK
        INTEGER quantity
        TEXT purchase_option
    }

    ORDERS {
        TEXT id PK
        TEXT student_id FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ fulfilled_at
        TEXT shipping_type
        TEXT credit_card_number
        TEXT credit_card_expiration_date
        TEXT credit_card_holder_name
        TEXT credit_card_type
        TEXT status
        TIMESTAMPTZ updated_at
    }

    ORDER_ITEMS {
        TEXT order_id FK
        TEXT book_id FK
        INTEGER quantity
    }

    UNIVERSITIES ||--o{ DEPARTMENTS : has
    UNIVERSITIES ||--o{ INSTRUCTORS : has
    UNIVERSITIES ||--o{ COURSES : offers

    DEPARTMENTS o|--o{ INSTRUCTORS : optional_assignment
    COURSES ||--o{ COURSE_DEPARTMENTS : mapped
    DEPARTMENTS ||--o{ COURSE_DEPARTMENTS : mapped

    COURSES ||--o{ COURSE_INSTRUCTORS : assigned
    INSTRUCTORS ||--o{ COURSE_INSTRUCTORS : teaches

    COURSES ||--o{ COURSE_BOOKS : requires_or_recommends
    BOOKS ||--o{ COURSE_BOOKS : linked

    BOOKS ||--o{ BOOK_AUTHORS : has
    BOOKS ||--o{ BOOK_KEYWORDS : tagged

    STUDENTS ||--|| CARTS : owns_one
    CARTS ||--o{ CART_ITEMS : contains
    BOOKS ||--o{ CART_ITEMS : includes

    STUDENTS ||--o{ ORDERS : places
    ORDERS ||--o{ ORDER_ITEMS : contains
    BOOKS ||--o{ ORDER_ITEMS : includes

    BOOKS ||--o{ BOOK_REVIEWS : receives
    STUDENTS ||--o{ BOOK_REVIEWS : writes

    TROUBLE_TICKETS ||--o{ TICKET_STATUS_HISTORY : has
    EMPLOYEES o|--o{ TROUBLE_TICKETS : resolves
```

## Notes

- Primary keys: STUDENTS uses email, BOOKS uses isbn, DEPARTMENTS uses composite key (university_id, name).
- COURSE_DEPARTMENTS uses composite key (course_id, university_id, department_name) to reference DEPARTMENTS(university_id, name).
- Junction tables: COURSE_DEPARTMENTS, COURSE_INSTRUCTORS, COURSE_BOOKS, CART_ITEMS, ORDER_ITEMS.
- BOOK_REVIEWS enforces one review per student per book via UNIQUE (book_id, student_id).
- CARTS enforces one cart per student via UNIQUE (student_id).
- TROUBLE_TICKETS and TICKET_STATUS_HISTORY use polymorphic actor columns (created_by_type/changed_by_type + *_id).
- BOOKS stores purchase_option and subcategories as PostgreSQL TEXT arrays.

## ER to Relational Schema Conversion

The schema is converted from ER design to relational tables using standard mapping rules:

1. Strong entities become base tables with primary keys.
- STUDENTS -> students(email)
- EMPLOYEES -> employees(id)
- UNIVERSITIES -> universities(id)
- INSTRUCTORS -> instructors(id)
- COURSES -> courses(id)
- BOOKS -> books(isbn)
- BOOK_REVIEWS -> book_reviews(id)
- TROUBLE_TICKETS -> trouble_tickets(id)
- TICKET_STATUS_HISTORY -> ticket_status_history(id)
- CARTS -> carts(id)
- ORDERS -> orders(id)

2. One-to-many relationships are represented by foreign keys on the many side.
- departments.university_id references universities.id
- instructors.university_id references universities.id
- courses.university_id references universities.id
- orders.student_id references students.email

3. One-to-one relationships are represented by foreign key plus unique constraint.
- carts.student_id references students.email and is UNIQUE.

4. Many-to-many relationships are converted into junction tables.
- course_departments(course_id, university_id, department_name)
- course_instructors(course_id, instructor_id)
- course_books(course_id, book_id, relation)
- cart_items(cart_id, book_id, quantity, purchase_option)
- order_items(order_id, book_id, quantity)

5. Multi-valued or repeating business attributes are modeled through child tables or arrays.
- book_authors(book_id, author_name, author_order)
- book_keywords(book_id, keyword)
- ticket_status_history(ticket_id, status, changed_by_type, changed_by_id, changed_at)
- books.purchase_option and books.subcategories are TEXT arrays

6. Relationship-specific constraints are encoded with keys and checks.
- book_reviews has UNIQUE (book_id, student_id) to enforce one review per student per book.
- check constraints enforce valid domains such as role, relation, status, rating, purchase_option, and shipping_type.

## Constraint Domains

- students.student_status: undergraduate, graduate
- employees.role: support, admin, superadmin
- books.type: new, used
- books.format: hardcover, softcover, electronic
- course_books.relation: required, recommended
- trouble_tickets.category: user profile, products, cart, orders, other
- trouble_tickets.status: new, assigned, in-process, completed, closed
- ticket_status_history.status: new, assigned, in-process, completed, closed
- ticket_status_history.changed_by_type: student, support, admin, superadmin
- orders.shipping_type: standard, 2-day, 1-day
- orders.status: new, processed, awaiting shipping, shipped, canceled
- cart_items.purchase_option: buy, rent
- book_reviews.rating: 1 to 5

## Normalization Summary

The design is normalized to reduce redundancy and update anomalies.

### First Normal Form (1NF)

- Atomic columns are used and repeating groups are split.
- Authors and keywords are not stored as delimited values in BOOKS.

### Second Normal Form (2NF)

- For composite-key tables, all non-key attributes depend on the full key.
- cart_items(quantity, purchase_option) depends on (cart_id, book_id).
- order_items(quantity) depends on (order_id, book_id).

### Third Normal Form (3NF)

- Non-key attributes do not transitively depend on another non-key attribute.
- University metadata stays in UNIVERSITIES and is referenced by FKs.
- Ticket status progression is separated into TICKET_STATUS_HISTORY.

## Why This Normalization Helps

- Reduces duplicate data entry.
- Prevents inconsistency during updates.
- Improves integrity with FK, UNIQUE, and CHECK constraints.
- Supports scalable reporting and filtering queries.

## API Business Rules Reflected in Data Model

- Once an order is canceled, status transitions are blocked by API logic.
- Cart item quantity must be positive, and purchase option is buy or rent.
- Ticket history stores every status change with actor and timestamp.
