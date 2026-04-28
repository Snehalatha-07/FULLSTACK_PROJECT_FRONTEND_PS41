const TOAST_EVENT = 'app-toast'

function emitToast(type, message) {
  if (!message || typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        id: Date.now() + Math.random(),
        type,
        message
      }
    })
  )
}

export function notifySuccess(message) {
  emitToast('success', message)
}

export function notifyError(message) {
  emitToast('error', message)
}

export function notifyInfo(message) {
  emitToast('info', message)
}

export { TOAST_EVENT }
