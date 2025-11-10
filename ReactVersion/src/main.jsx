import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDB } from './utils/db'

// Initialize IndexedDB before rendering the app
initDB().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(error => {
  console.error('Failed to initialize database:', error);
  alert('Failed to initialize database. Please try refreshing the page.');
});
