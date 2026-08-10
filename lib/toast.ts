import toast from 'react-hot-toast'

// Convención CLAUDE.md: una sola notificación visible a la vez
export const notify = {
  success(message: string) {
    toast.dismiss()
    toast.success(message)
  },
  error(message: string) {
    toast.dismiss()
    toast.error(message)
  },
  show(message: string) {
    toast.dismiss()
    toast(message)
  },
}
