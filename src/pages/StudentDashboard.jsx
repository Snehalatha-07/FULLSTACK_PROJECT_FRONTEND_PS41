import { useEffect, useState } from 'react'
import { feedbackApi, materialApi, registrationApi, workshopApi } from '../api/services'
import { notifyError, notifySuccess } from '../utils/toast'

function StudentDashboard({ user }) {
  const [approved, setApproved] = useState([])
  const [myRegistrations, setMyRegistrations] = useState([])
  const [materials, setMaterials] = useState({})
  const [myFeedback, setMyFeedback] = useState([])
  const [feedbackForm, setFeedbackForm] = useState({ workshopId: '', rating: 5, comments: '' })
  const [completed, setCompleted] = useState([])
  const [workshopSearch, setWorkshopSearch] = useState('')
  const [debouncedWorkshopSearch, setDebouncedWorkshopSearch] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [approvedRes, regRes] = await Promise.all([
        workshopApi.listApproved({ search: debouncedWorkshopSearch }),
        registrationApi.listByUser(user.id)
      ])
      setApproved(approvedRes.data)
      setMyRegistrations(regRes.data)
      setCompleted(regRes.data.map((r) => r.workshop).filter((w) => w.status === 'COMPLETED'))

      const materialResponses = await Promise.all(
        regRes.data.map((reg) =>
          materialApi.listByWorkshop(reg.workshop.id).then((m) => ({ workshopId: reg.workshop.id, rows: m.data }))
        )
      )
      const materialMap = {}
      materialResponses.forEach(({ workshopId, rows }) => {
        materialMap[workshopId] = rows
      })
      setMaterials(materialMap)

      const feedbackRes = await feedbackApi.listByStudent(user.id)
      setMyFeedback(feedbackRes.data)
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to load student dashboard data')
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

  const registerWorkshop = async (workshopId) => {
    try {
      await registrationApi.create({ workshopId, userId: user.id })
      notifySuccess('Registered for workshop successfully')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to register for workshop')
    }
  }

  const submitFeedback = async (e) => {
    e.preventDefault()
    try {
      await feedbackApi.submit({
        workshopId: Number(feedbackForm.workshopId),
        studentId: user.id,
        rating: Number(feedbackForm.rating),
        comments: feedbackForm.comments
      })
      setFeedbackForm({ workshopId: '', rating: 5, comments: '' })
      notifySuccess('Feedback submitted successfully')
      await loadData()
    } catch (err) {
      notifyError(err?.response?.data?.error || 'Failed to submit feedback')
    }
  }

  const isRegistered = (workshopId) => myRegistrations.some((r) => r.workshop.id === workshopId)
  const totalRegistered = myRegistrations.length
  const totalCompleted = completed.length
  const completionRate = totalRegistered === 0 ? 0 : Math.round((totalCompleted / totalRegistered) * 100)

  const getWorkshopTitle = (row) => row.workshop?.title || completed.find((w) => w.id === row.workshopId)?.title || `Workshop #${row.workshopId}`

  const getFilteredMaterials = (workshopId) => {
    const workshopMaterials = materials[workshopId] || []
    if (resourceTypeFilter === 'ALL') {
      return workshopMaterials
    }
    return workshopMaterials.filter((m) => m.type === resourceTypeFilter)
  }

  return (
    <section className="stack">
      <h2>Student Dashboard</h2>
      {loading && <div className="loading-inline"><span className="spinner"></span>Loading student data...</div>}

      <div className="stats-grid">
        <article className="card stat"><h3>Registered</h3><p>{totalRegistered}</p></article>
        <article className="card stat"><h3>Completed</h3><p>{totalCompleted}</p></article>
        <article className="card stat"><h3>Completion Rate</h3><p>{completionRate}%</p></article>
        <article className="card stat"><h3>Feedback Submitted</h3><p>{myFeedback.length}</p></article>
      </div>

      <article className="card">
        <h3>Approved Workshops</h3>
        <input
          value={workshopSearch}
          onChange={(e) => setWorkshopSearch(e.target.value)}
          placeholder="Search approved workshops"
        />
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Teacher</th>
              <th>Google Meet</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((w) => (
              <tr key={w.id}>
                <td>{w.title}</td>
                <td>{w.sessionDate} {w.sessionTime}</td>
                <td>{w.teacher?.name}</td>
                <td>
                  {w.meetingLink ? (
                    <a href={w.meetingLink} target="_blank" rel="noreferrer">Join Meet</a>
                  ) : (
                    <span>Link pending</span>
                  )}
                </td>
                <td>
                  <button disabled={isRegistered(w.id)} onClick={() => registerWorkshop(w.id)}>
                    {isRegistered(w.id) ? 'Registered' : 'Register'}
                  </button>
                </td>
              </tr>
            ))}
            {approved.length === 0 && (
              <tr>
                <td colSpan="5">No approved workshops found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>My Workshops and Resources</h3>
        <div className="row-actions">
          <select value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)}>
            <option value="ALL">All Resource Types</option>
            <option value="PDF">PDF</option>
            <option value="PPT">PPT</option>
            <option value="LINK">LINK</option>
            <option value="RECORDING">RECORDING</option>
          </select>
        </div>
        <ul className="list">
          {myRegistrations.map((r) => (
            <li key={r.id}>
              <strong>{r.workshop.title}</strong>
              {r.workshop.meetingLink ? (
                <a href={r.workshop.meetingLink} target="_blank" rel="noreferrer">Join Meet</a>
              ) : (
                <span>Link pending</span>
              )}
              <span>Resources:</span>
              <div className="resources">
                {getFilteredMaterials(r.workshop.id).map((m) => (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer">{m.title} ({m.type})</a>
                ))}
                {getFilteredMaterials(r.workshop.id).length === 0 && <span>No matching resources.</span>}
              </div>
            </li>
          ))}
          {myRegistrations.length === 0 && <li>You are not registered to any workshop yet.</li>}
        </ul>
      </article>

      <article className="card">
        <h3>Submit Feedback</h3>
        <form onSubmit={submitFeedback} className="grid-form">
          <select value={feedbackForm.workshopId} onChange={(e) => setFeedbackForm({ ...feedbackForm, workshopId: e.target.value })} required>
            <option value="">Select Completed Workshop</option>
            {completed.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
          <select value={feedbackForm.rating} onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
          <textarea placeholder="Comments" value={feedbackForm.comments} onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })} required />
          <button type="submit">Submit Feedback</button>
        </form>
      </article>

      <article className="card">
        <h3>Completed Workshops</h3>
        <ul className="list">
          {completed.map((w) => (
            <li key={w.id}>{w.title} - {w.sessionDate}</li>
          ))}
          {completed.length === 0 && <li>No completed workshops yet.</li>}
        </ul>
      </article>

      <article className="card">
        <h3>My Feedback History</h3>
        <ul className="list">
          {myFeedback.map((f) => (
            <li key={f.id}>{getWorkshopTitle(f)}: {f.rating}/5 - {f.comments}</li>
          ))}
          {myFeedback.length === 0 && <li>No feedback submitted yet.</li>}
        </ul>
      </article>
    </section>
  )
}

export default StudentDashboard
