import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import './App.css'
import Navbar from './Nav'
import Library from './pages/Library'
import AddSong from './pages/AddSong'
import { getAllSongs } from './utils/db'

function AnimatedRoutes({ setHasSongs }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Library onSongsChange={setHasSongs} />} />
        <Route path="/library" element={<Library onSongsChange={setHasSongs} />} />
        <Route path="/songs/add" element={<AddSong />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  const [hasSongs, setHasSongs] = useState(false)

  // Check if user has songs on initial load
  useEffect(() => {
    async function checkSongs() {
      try {
        const songs = await getAllSongs()
        setHasSongs(songs.length > 0)
      } catch (error) {
        console.error('Error checking songs:', error)
      }
    }
    checkSongs()
  }, [])

  return (
    <BrowserRouter>
      <main>
        <AnimatedRoutes setHasSongs={setHasSongs} />
      </main>
      {hasSongs && <Navbar />}
    </BrowserRouter>
  )
}

export default App
