import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import './App.css'
import Navbar from './Nav'
import Library from './pages/Library'
import AddSong from './pages/AddSong'


function AnimatedRoutes() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Replace current route to prevent swipe-back navigation
    const path = window.location.pathname + (window.location.search || '')
    navigate(path, { replace: true })
  }, [navigate])

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Library />} />
        <Route path="/library" element={<Library />} />
        <Route path="/songs/add" element={<AddSong />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <main>
        <AnimatedRoutes />
      </main>
      <Navbar />
    </BrowserRouter>
  )
}

export default App
