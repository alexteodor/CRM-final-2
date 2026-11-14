import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { CrmProvider } from './store'

createRoot(document.getElementById('root')).render(
  <CrmProvider>
    <App />
  </CrmProvider>
)
