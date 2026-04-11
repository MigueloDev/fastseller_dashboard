'use client'

import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#fff',
          color: '#111827',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          fontSize: '13px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        },
      }}
    />
  )
}
