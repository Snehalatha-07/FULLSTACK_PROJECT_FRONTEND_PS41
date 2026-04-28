import apiClient from './apiClient'

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload)
}

export const adminApi = {
  getStats: (adminId) => apiClient.get(`/admin/stats?adminId=${adminId}`),
  getUsers: () => apiClient.get('/admin/users'),
  getTeachers: () => apiClient.get('/admin/teachers'),
  getStudents: () => apiClient.get('/admin/students'),
  addTeacher: (adminId, payload) => apiClient.post(`/admin/teachers?adminId=${adminId}`, payload),
  removeTeacher: (adminId, teacherId) => apiClient.delete(`/admin/teachers/${teacherId}?adminId=${adminId}`),
  removeStudent: (adminId, studentId) => apiClient.delete(`/admin/students/${studentId}?adminId=${adminId}`)
}

export const workshopApi = {
  create: (payload) => apiClient.post('/workshops', payload),
  update: (id, payload) => apiClient.put(`/workshops/${id}`, payload),
  listAll: (params = {}) => apiClient.get('/workshops', { params }),
  listApproved: (params = {}) => apiClient.get('/workshops/approved', { params }),
  listByTeacher: (teacherId, params = {}) => apiClient.get(`/workshops/teacher/${teacherId}`, { params }),
  approveOrReject: (id, payload) => apiClient.patch(`/workshops/${id}/approval`, payload),
  complete: (id, teacherId) => apiClient.patch(`/workshops/${id}/complete?teacherId=${teacherId}`)
}

export const registrationApi = {
  create: (payload) => apiClient.post('/registrations', payload),
  listByUser: (userId) => apiClient.get(`/registrations/user/${userId}`),
  listByWorkshop: (workshopId) => apiClient.get(`/registrations/workshop/${workshopId}`)
}

export const materialApi = {
  create: (payload) => apiClient.post('/materials', payload),
  listByWorkshop: (workshopId) => apiClient.get(`/materials/workshop/${workshopId}`)
}

export const attendanceApi = {
  mark: (payload) => apiClient.post('/attendance', payload),
  listByWorkshop: (workshopId) => apiClient.get(`/attendance/workshop/${workshopId}`)
}

export const feedbackApi = {
  submit: (payload) => apiClient.post('/feedback', payload),
  listByWorkshop: (workshopId) => apiClient.get(`/feedback/workshop/${workshopId}`),
  listByStudent: (studentId) => apiClient.get(`/feedback/student/${studentId}`)
}
