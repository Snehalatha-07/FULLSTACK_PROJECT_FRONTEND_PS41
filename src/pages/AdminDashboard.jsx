import { useEffect, useState } from 'react'
import { adminApi, feedbackApi, registrationApi, workshopApi } from '../api/services'
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LineChart, Line } from 'recharts'
import { notifyError, notifySuccess } from '../utils/toast'

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [workshopMetrics, setWorkshopMetrics] = useState([])
  const [registrationCountByWorkshop, setRegistrationCountByWorkshop] = useState({})
  const [feedbackRows, setFeedbackRows] = useState([])
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [workshopSearch, setWorkshopSearch] = useState('')
  const [debouncedWorkshopSearch, setDebouncedWorkshopSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [addTeacherLoading, setAddTeacherLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [removingTeacherId, setRemovingTeacherId] = useState(null)
  const [removingStudentId, setRemovingStudentId] = useState(null)
  const [approvalLoadingKey, setApprovalLoadingKey] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, workshopsRes] = await Promise.all([
        adminApi.getStats(user.id),
        adminApi.getUsers(),
        workshopApi.listAll({ search: debouncedWorkshopSearch })
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
      setWorkshops(workshopsRes.data)

      const registrationResults = await Promise.all(
        workshopsRes.data.map((workshop) =>
          registrationApi.listByWorkshop(workshop.id).then((res) => ({ workshop, registrations: res.data.length }))
        )
      )

      const countMap = {}
      const metrics = registrationResults.map(({ workshop, registrations }) => {
        countMap[workshop.id] = registrations
        return {
          id: workshop.id,
          title: workshop.title.length > 24 ? `${workshop.title.slice(0, 24)}...` : workshop.title,
          fullTitle: workshop.title,
          registrations,
          status: workshop.status
        }
      })

      setRegistrationCountByWorkshop(countMap)
      setWorkshopMetrics(metrics)

      const feedbackResponses = await Promise.all(
        workshopsRes.data.map((workshop) =>
          feedbackApi.listByWorkshop(workshop.id).then((res) => ({ title: workshop.title, rows: res.data }))
        )
      )
      const feedbackData = feedbackResponses.flatMap(({ title, rows }) =>
        rows.map((f) => ({ ...f, workshopTitle: title }))
      )
      setFeedbackRows(feedbackData)
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to load admin dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedWorkshopSearch(workshopSearch)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [workshopSearch])

  useEffect(() => {
    loadData()
  }, [debouncedWorkshopSearch])

  const updateWorkshopStatus = async (workshopId, status) => {
    const loadingKey = `${workshopId}-${status}`
    setApprovalLoadingKey(loadingKey)
    try {
      await workshopApi.approveOrReject(workshopId, { adminId: user.id, status })
      notifySuccess(`Workshop ${status.toLowerCase()} successfully`)
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to update workshop status')
    } finally {
      setApprovalLoadingKey('')
    }
  }

  const onTeacherChange = (e) => {
    setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value })
  }

  const addTeacher = async (e) => {
    e.preventDefault()
    setAddTeacherLoading(true)
    try {
      await adminApi.addTeacher(user.id, { ...teacherForm, role: 'TEACHER' })
      setTeacherForm({ name: '', email: '', password: '' })
      setMessage('Teacher added')
      notifySuccess('Teacher added successfully')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to add teacher')
    } finally {
      setAddTeacherLoading(false)
    }
  }

  const removeTeacher = async (teacherId) => {
    setRemovingTeacherId(teacherId)
    try {
      await adminApi.removeTeacher(user.id, teacherId)
      notifySuccess('Teacher removed successfully')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to remove teacher')
    } finally {
      setRemovingTeacherId(null)
    }
  }

  const removeStudent = async (studentId) => {
    setRemovingStudentId(studentId)
    try {
      await adminApi.removeStudent(user.id, studentId)
      notifySuccess('Student removed successfully')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to remove student')
    } finally {
      setRemovingStudentId(null)
    }
  }

  const exportUsersCsv = () => {
    setExportLoading(true)
    const csvRows = [
      'id,name,email,role',
      ...users.map((u) => `${u.id},"${u.name}","${u.email}",${u.role}`)
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'users-export.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    window.setTimeout(() => setExportLoading(false), 250)
  }

  const filteredUsers = userRoleFilter === 'ALL' ? users : users.filter((u) => u.role === userRoleFilter)
  const teachers = users.filter((u) => u.role === 'TEACHER')
  const students = users.filter((u) => u.role === 'USER')
  const topWorkshop = workshopMetrics.length > 0
    ? workshopMetrics.reduce((best, current) => (current.registrations > best.registrations ? current : best), workshopMetrics[0])
    : null

  return (
    <section className="stack">
      <h2>Admin Dashboard</h2>
      {loading && <div className="loading-inline"><span className="spinner"></span>Loading admin data...</div>}

      {stats && (
        <div className="stats-grid">
          <article className="card stat"><h3>Total Users</h3><p>{stats.totalUsers}</p></article>
          <article className="card stat"><h3>Total Teachers</h3><p>{stats.totalTeachers}</p></article>
          <article className="card stat"><h3>Total Students</h3><p>{stats.totalStudents}</p></article>
          <article className="card stat"><h3>Workshops</h3><p>{stats.totalWorkshops}</p></article>
          <article className="card stat"><h3>Approved</h3><p>{stats.totalApproved}</p></article>
          <article className="card stat"><h3>Pending</h3><p>{stats.totalPending}</p></article>
        </div>
      )}

      {stats && <AdminCharts stats={stats} workshopMetrics={workshopMetrics} />}

      {topWorkshop && (
        <article className="card">
          <h3>Top Performing Workshop</h3>
          <p><strong>{topWorkshop.fullTitle}</strong> has {topWorkshop.registrations} registrations.</p>
        </article>
      )}

      <div className="grid-2">
        <article className="card">
          <h3>Add Teacher</h3>
          <form onSubmit={addTeacher} className="grid-form">
            <input name="name" placeholder="Name" value={teacherForm.name} onChange={onTeacherChange} required />
            <input name="email" placeholder="Email" value={teacherForm.email} onChange={onTeacherChange} required />
            <input name="password" type="password" placeholder="Password" value={teacherForm.password} onChange={onTeacherChange} required />
            <button type="submit" disabled={addTeacherLoading}>
              {addTeacherLoading ? <span className="button-content"><span className="spinner button-spinner"></span>Adding...</span> : 'Add Teacher'}
            </button>
          </form>
          {message && <p className="success">{message}</p>}
          <h4>Teacher List</h4>
          <ul className="list">
            {teachers.map((teacher) => (
              <li key={teacher.id}>
                <span>{teacher.name} ({teacher.email})</span>
                <button onClick={() => removeTeacher(teacher.id)} className="danger" disabled={removingTeacherId === teacher.id}>
                  {removingTeacherId === teacher.id ? <span className="button-content"><span className="spinner button-spinner"></span>Removing...</span> : 'Remove'}
                </button>
              </li>
            ))}
            {teachers.length === 0 && <li>No teachers found.</li>}
          </ul>
          <h4>Student List</h4>
          <ul className="list">
            {students.map((student) => (
              <li key={student.id}>
                <span>{student.name} ({student.email})</span>
                <button onClick={() => removeStudent(student.id)} className="danger" disabled={removingStudentId === student.id}>
                  {removingStudentId === student.id ? <span className="button-content"><span className="spinner button-spinner"></span>Removing...</span> : 'Remove'}
                </button>
              </li>
            ))}
            {students.length === 0 && <li>No students found.</li>}
          </ul>
        </article>

        <article className="card">
          <h3>All Users</h3>
          <div className="row-actions">
            <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
              <option value="USER">Student</option>
            </select>
            <button onClick={exportUsersCsv} disabled={exportLoading}>
              {exportLoading ? <span className="button-content"><span className="spinner button-spinner"></span>Exporting...</span> : 'Export CSV'}
            </button>
          </div>
          <ul className="list">
            {filteredUsers.map((u) => (
              <li key={u.id}>{u.name} ({u.email}) - {u.role}</li>
            ))}
            {filteredUsers.length === 0 && <li>No users found for selected role.</li>}
          </ul>
        </article>
      </div>

      <article className="card">
        <h3>Workshop Approvals</h3>
        <input
          value={workshopSearch}
          onChange={(e) => setWorkshopSearch(e.target.value)}
          placeholder="Search workshops by title, teacher, or description"
        />
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Teacher</th>
              <th>Status</th>
              <th>Registrations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workshops.map((w) => (
              <AdminWorkshopRow
                key={w.id}
                workshop={w}
                registrationCount={registrationCountByWorkshop[w.id] ?? 0}
                onStatusChange={updateWorkshopStatus}
                approvalLoadingKey={approvalLoadingKey}
              />
            ))}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>Feedback Reports</h3>
        <ul className="list">
          {feedbackRows.map((f) => (
            <li key={f.id}>{f.workshopTitle}: {f.rating}/5 - {f.comments}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

function AdminCharts({ stats, workshopMetrics }) {
  const roleData = [
    { name: 'Admins', value: Math.max(0, stats.totalUsers - stats.totalTeachers - stats.totalStudents) },
    { name: 'Teachers', value: stats.totalTeachers },
    { name: 'Students', value: stats.totalStudents }
  ]

  const workshopData = [
    { name: 'Approved', value: stats.totalApproved },
    { name: 'Pending', value: stats.totalPending },
    { name: 'Other', value: Math.max(0, stats.totalWorkshops - stats.totalApproved - stats.totalPending) }
  ]

  const activityData = [
    { name: 'Workshops', count: stats.totalWorkshops },
    { name: 'Registrations', count: stats.totalRegistrations },
    { name: 'Users', count: stats.totalUsers }
  ]

  const pieColors = ['#8b6f47', '#d4a574', '#c9a961']

  return (
    <div className="grid-2">
      <article className="card">
        <h3>User Roles Distribution</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" outerRadius={90} label>
                {roleData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card">
        <h3>Workshop Status Distribution</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={workshopData} dataKey="value" nameKey="name" outerRadius={90} label>
                {workshopData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card" style={{ gridColumn: 'span 2' }}>
        <h3>Platform Activity</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd3" />
              <XAxis dataKey="name" stroke="#6b6454" />
              <YAxis stroke="#6b6454" />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5dfd3', borderRadius: '8px', boxShadow: '0 4px 12px rgba(45, 36, 22, 0.12)' }} />
              <Bar dataKey="count" fill="#8b6f47" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card" style={{ gridColumn: 'span 2' }}>
        <h3>Workshop Registrations Overview</h3>
        {workshopMetrics.length === 0 ? (
          <p>No workshop data available yet.</p>
        ) : (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={workshopMetrics} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd3" />
                <XAxis
                  dataKey="title"
                  stroke="#6b6454"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={65}
                />
                <YAxis stroke="#6b6454" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5dfd3', borderRadius: '8px', boxShadow: '0 4px 12px rgba(45, 36, 22, 0.12)' }}
                  formatter={(value, name, props) => [value, props.payload.fullTitle]}
                />
                <Line type="monotone" dataKey="registrations" stroke="#8b6f47" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </div>
  )
}

function AdminWorkshopRow({ workshop, registrationCount, onStatusChange, approvalLoadingKey }) {

  return (
    <tr>
      <td>{workshop.title}</td>
      <td>{workshop.teacher?.name}</td>
      <td>{workshop.status}</td>
      <td>{registrationCount}</td>
      <td>
        <div className="row-actions">
          <button
            onClick={() => onStatusChange(workshop.id, 'APPROVED')}
            disabled={approvalLoadingKey === `${workshop.id}-APPROVED` || approvalLoadingKey === `${workshop.id}-REJECTED`}
          >
            {approvalLoadingKey === `${workshop.id}-APPROVED`
              ? <span className="button-content"><span className="spinner button-spinner"></span>Approving...</span>
              : 'Approve'}
          </button>
          <button
            onClick={() => onStatusChange(workshop.id, 'REJECTED')}
            className="danger"
            disabled={approvalLoadingKey === `${workshop.id}-APPROVED` || approvalLoadingKey === `${workshop.id}-REJECTED`}
          >
            {approvalLoadingKey === `${workshop.id}-REJECTED`
              ? <span className="button-content"><span className="spinner button-spinner"></span>Rejecting...</span>
              : 'Reject'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default AdminDashboard
