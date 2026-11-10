'use client'

import { ToastContainer } from 'react-toastify'
import { useTheme } from 'next-themes'
import 'react-toastify/dist/ReactToastify.css'

export function ToastProvider() {
  const { resolvedTheme } = useTheme()

  return (
    <ToastContainer
      position="top-center"
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      autoClose={2500}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
  )
}
