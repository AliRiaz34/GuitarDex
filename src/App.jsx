import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import Navbar from './Nav'
import Library from './pages/Library'
import AddSong from './pages/AddSong'
import Deck from './pages/Deck'
import Social from './pages/Social'
import Auth from './pages/Auth'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import ProtectedRoute from './components/ProtectedRoute'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={
          <ProtectedRoute><Library /></ProtectedRoute>
        } />
        <Route path="/library" element={
          <ProtectedRoute><Library /></ProtectedRoute>
        } />
        <Route path="/songs/add" element={
          <ProtectedRoute><AddSong /></ProtectedRoute>
        } />
        <Route path="/deck" element={
          <ProtectedRoute><Deck /></ProtectedRoute>
        } />
        <Route path="/social" element={
          <ProtectedRoute><Social /></ProtectedRoute>
        } />
      </Routes>
  )
}

function AppContent() {
  const { user, syncing } = useAuth()
  const location = useLocation()

  useEffect(() => {
    // Lock screen orientation to portrait (only in secure contexts)
    if (window.isSecureContext && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => {
        // Silently fail - orientation lock is a progressive enhancement
      })
    }
  }, [])

  const showNavbar = user && !syncing && location.pathname !== '/auth'

  return (
    <>
      <main>
        <AnimatedRoutes />
      </main>
      {showNavbar && <Navbar />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
