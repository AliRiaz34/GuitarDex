import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import './App.css'
import Navbar from './Nav'
import Library from './pages/Library'
import AddSong from './pages/AddSong'

function AnimatedRoutes() {
  const location = useLocation()

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
