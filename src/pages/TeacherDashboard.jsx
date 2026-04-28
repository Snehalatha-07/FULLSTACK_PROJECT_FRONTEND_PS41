import { useEffect, useState } from 'react'
import { attendanceApi, feedbackApi, materialApi, registrationApi, workshopApi } from '../api/services'
import { notifyError, notifySuccess } from '../utils/toast'

function TeacherDashboard({ user }) {
  const [workshops, setWorkshops] = useState([])
  const [registrationCountByWorkshop, setRegistrationCountByWorkshop] = useState({})
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    sessionDate: '',
    sessionTime: '',
    durationMinutes: 60,
    meetingLink: ''
  })
  const [materialForm, setMaterialForm] = useState({ workshopId: '', title: '', type: 'PDF', url: '', postSession: false })
  const [attendanceForm, setAttendanceForm] = useState({ workshopId: '', studentId: '', present: true })
  const [recentAttendance, setRecentAttendance] = useState(null)
  const [registrationViewWorkshopId, setRegistrationViewWorkshopId] = useState('')
  const [selectedWorkshopRegistrations, setSelectedWorkshopRegistrations] = useState([])
  const [feedbackRows, setFeedbackRows] = useState([])
  const [workshopSearch, setWorkshopSearch] = useState('')
  const [debouncedWorkshopSearch, setDebouncedWorkshopSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await workshopApi.listByTeacher(user.id, { search: debouncedWorkshopSearch })
      setWorkshops(data)

      const registrationResults = await Promise.all(
        data.map((workshop) => registrationApi.listByWorkshop(workshop.id).then((res) => ({ id: workshop.id, count: res.data.length })))
      )
      const countMap = {}
      registrationResults.forEach((item) => {
        countMap[item.id] = item.count
      })
      setRegistrationCountByWorkshop(countMap)

      const feedbackResponses = await Promise.all(
        data.map((workshop) =>
          feedbackApi.listByWorkshop(workshop.id).then((f) => ({ title: workshop.title, rows: f.data }))
        )
      )
      const feedbackData = feedbackResponses.flatMap(({ title, rows }) =>
        rows.map((row) => ({ ...row, workshopTitle: title }))
      )
      setFeedbackRows(feedbackData)
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to load teacher dashboard data')
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

  const createWorkshop = async (e) => {
    e.preventDefault()
    try {
      await workshopApi.create({ ...createForm, teacherId: user.id, durationMinutes: Number(createForm.durationMinutes) })
      setCreateForm({ title: '', description: '', sessionDate: '', sessionTime: '', durationMinutes: 60, meetingLink: '' })
      notifySuccess('Workshop created and sent for approval')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to create workshop')
    }
  }

  const addMaterial = async (e) => {
    e.preventDefault()
    try {
      await materialApi.create({
        ...materialForm,
        workshopId: Number(materialForm.workshopId),
        teacherId: user.id
      })
      setMaterialForm({ workshopId: '', title: '', type: 'PDF', url: '', postSession: false })
      notifySuccess('Material uploaded successfully')
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to upload material')
    }
  }

  const markAttendance = async (e) => {
    e.preventDefault()
    try {
      const { data } = await attendanceApi.mark({
        workshopId: Number(attendanceForm.workshopId),
        teacherId: user.id,
        studentId: Number(attendanceForm.studentId),
        present: attendanceForm.present
      })
      setAttendanceForm({ workshopId: '', studentId: '', present: true })
      setRecentAttendance(data)
      notifySuccess('Attendance marked successfully')
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to mark attendance')
    }
  }

  const completeWorkshop = async (id) => {
    try {
      await workshopApi.complete(id, user.id)
      notifySuccess('Workshop marked as completed')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to complete workshop')
    }
  }

  const loadRegistrationsForWorkshop = async (workshopId) => {
    if (!workshopId) {
      setSelectedWorkshopRegistrations([])
      return
    }
    try {
      const { data } = await registrationApi.listByWorkshop(Number(workshopId))
      setSelectedWorkshopRegistrations(data)
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to load registrations')
    }
  }

  const filteredWorkshops = statusFilter === 'ALL'
    ? workshops
    : workshops.filter((w) => w.status === statusFilter)

  const totalRegistrations = Object.values(registrationCountByWorkshop).reduce((sum, value) => sum + value, 0)
  const completedCount = workshops.filter((w) => w.status === 'COMPLETED').length
  const approvedCount = workshops.filter((w) => w.status === 'APPROVED').length
  const pendingCount = workshops.filter((w) => w.status === 'PENDING').length

  return (
    <section className="stack">
      <h2>Teacher Dashboard</h2>
      {loading && <div className="loading-inline"><span className="spinner"></span>Loading teacher data...</div>}

      <div className="stats-grid">
        <article className="card stat"><h3>Total Workshops</h3><p>{workshops.length}</p></article>
        <article className="card stat"><h3>Total Registrations</h3><p>{totalRegistrations}</p></article>
        <article className="card stat"><h3>Completed</h3><p>{completedCount}</p></article>
        <article className="card stat"><h3>Approved</h3><p>{approvedCount}</p></article>
        <article className="card stat"><h3>Pending</h3><p>{pendingCount}</p></article>
        <article className="card stat"><h3>Feedback Entries</h3><p>{feedbackRows.length}</p></article>
      </div>

      <article className="card">
        <h3>Create Workshop</h3>
        <form onSubmit={createWorkshop} className="grid-form form-2">
          <input name="title" placeholder="Title" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required />
          <input name="durationMinutes" type="number" placeholder="Duration Minutes" value={createForm.durationMinutes} onChange={(e) => setCreateForm({ ...createForm, durationMinutes: e.target.value })} required />
          <textarea name="description" placeholder="Description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} required />
          <input name="meetingLink" placeholder="Google Meet Link (https://meet.google.com/...)" value={createForm.meetingLink} onChange={(e) => setCreateForm({ ...createForm, meetingLink: e.target.value })} required />
          <input name="sessionDate" type="date" value={createForm.sessionDate} onChange={(e) => setCreateForm({ ...createForm, sessionDate: e.target.value })} required />
          <input name="sessionTime" type="time" value={createForm.sessionTime} onChange={(e) => setCreateForm({ ...createForm, sessionTime: e.target.value })} required />
          <button type="submit">Create</button>
        </form>
      </article>

      <div className="grid-2">
        <article className="card">
          <h3>Upload Materials</h3>
          <form onSubmit={addMaterial} className="grid-form">
            <select value={materialForm.workshopId} onChange={(e) => setMaterialForm({ ...materialForm, workshopId: e.target.value })} required>
              <option value="">Select Workshop</option>
              {workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
            <input placeholder="Title" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} required />
            <select value={materialForm.type} onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}>
              <option value="PDF">PDF</option>
              <option value="PPT">PPT</option>
              <option value="LINK">LINK</option>
              <option value="RECORDING">RECORDING</option>
            </select>
            <input placeholder="URL" value={materialForm.url} onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })} required />
            <label className="inline-check">
              <input type="checkbox" checked={materialForm.postSession} onChange={(e) => setMaterialForm({ ...materialForm, postSession: e.target.checked })} />
              Post Session Resource
            </label>
            <button type="submit">Upload</button>
          </form>
        </article>

        <article className="card">
          <h3>Mark Attendance</h3>
          <form onSubmit={markAttendance} className="grid-form">
            <select value={attendanceForm.workshopId} onChange={(e) => setAttendanceForm({ ...attendanceForm, workshopId: e.target.value })} required>
              <option value="">Select Workshop</option>
              {workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
            <input placeholder="Student ID" value={attendanceForm.studentId} onChange={(e) => setAttendanceForm({ ...attendanceForm, studentId: e.target.value })} required />
            <select value={String(attendanceForm.present)} onChange={(e) => setAttendanceForm({ ...attendanceForm, present: e.target.value === 'true' })}>
              <option value="true">Present</option>
              <option value="false">Absent</option>
            </select>
            <button type="submit">Save Attendance</button>
          </form>
        </article>
      </div>

      {recentAttendance && (
        <article className="card">
          <h3>Latest Attendance Saved</h3>
          <p>
            <strong>{recentAttendance.student?.name || 'Student'}</strong> was marked{' '}
            <strong>{recentAttendance.present ? 'present' : 'absent'}</strong> for{' '}
            <strong>{recentAttendance.workshop?.title || 'Workshop'}</strong>.
          </p>
          {recentAttendance.markedAt && (
            <p className="muted">Saved at {new Date(recentAttendance.markedAt).toLocaleString()}</p>
          )}
        </article>
      )}

      <article className="card">
        <h3>Registered Users</h3>
        <div className="row-actions">
          <select
            value={registrationViewWorkshopId}
            onChange={(e) => {
              const value = e.target.value
              setRegistrationViewWorkshopId(value)
              loadRegistrationsForWorkshop(value)
            }}
          >
            <option value="">Select Workshop</option>
            {workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </div>

        {registrationViewWorkshopId && (
          <ul className="list">
            {selectedWorkshopRegistrations.map((r) => (
              <li key={r.id}>
                <span>{r.user?.name} ({r.user?.email})</span>
                <small>{new Date(r.registeredAt).toLocaleString()}</small>
              </li>
            ))}
            {selectedWorkshopRegistrations.length === 0 && <li>No users registered for this workshop yet.</li>}
          </ul>
        )}

        {!registrationViewWorkshopId && <p>Select a workshop to view registered users.</p>}
      </article>

      <article className="card">
        <h3>My Workshops</h3>
        <div className="row-actions">
          <input
            value={workshopSearch}
            onChange={(e) => setWorkshopSearch(e.target.value)}
            placeholder="Search my workshops"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Status</th>
              <th>Google Meet</th>
              <th>Registered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkshops.map((w) => (
              <TeacherWorkshopRow
                key={w.id}
                workshop={w}
                registered={registrationCountByWorkshop[w.id] ?? 0}
                onComplete={completeWorkshop}
              />
            ))}
            {filteredWorkshops.length === 0 && (
              <tr>
                <td colSpan="6">No workshops found for selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>Feedback</h3>
        <ul className="list">
          {feedbackRows.map((f) => (
            <li key={f.id}>{f.workshopTitle}: {f.rating}/5 - {f.comments}</li>
          ))}
          {feedbackRows.length === 0 && <li>No feedback yet.</li>}
        </ul>
      </article>
    </section>
  )
}

function TeacherWorkshopRow({ workshop, registered, onComplete }) {

  return (
    <tr>
      <td>{workshop.title}</td>
      <td>{workshop.sessionDate} {workshop.sessionTime}</td>
      <td>{workshop.status}</td>
      <td>
        {workshop.meetingLink ? (
          <a href={workshop.meetingLink} target="_blank" rel="noreferrer">Open Meet</a>
        ) : (
          <span>No link added</span>
        )}
      </td>
      <td>{registered}</td>
      <td><button onClick={() => onComplete(workshop.id)}>Mark Completed</button></td>
    </tr>
  )
}

export default TeacherDashboard
