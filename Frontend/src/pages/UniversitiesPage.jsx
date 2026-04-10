import { useGyanPustak } from '../context/GyanPustakContext'

function UniversitiesPage() {
  const { universities, courses } = useGyanPustak()

  return (
    <section className="section-stack">
      <h2>Universities, Departments, Instructors and Courses</h2>

      {universities.map((university) => (
        <article key={university.id} className="card">
          <h3>{university.name}</h3>
          <p>{university.address}</p>
          <p>
            Representative: {university.representative.firstName} {university.representative.lastName}{' '}
            ({university.representative.email})
          </p>
          <p>
            Departments: {university.departments.map((department) => department.name).join(', ')}
          </p>
          <p>
            Instructors:{' '}
            {university.instructors
              .map((instructor) => `${instructor.firstName} ${instructor.lastName}`)
              .join(', ')}
          </p>
        </article>
      ))}

      <article className="card">
        <h3>Course Catalog</h3>
        {courses.map((course) => (
          <p key={course.id}>
            {course.id} - {course.name} | University: {course.university} | Departments:{' '}
            {course.departments.join(', ')} | Instructors: {course.instructors.join(', ')}
          </p>
        ))}
      </article>
    </section>
  )
}

export default UniversitiesPage
