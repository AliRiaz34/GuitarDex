import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Header from './Header'
import Navbar from './Nav'
import Library from './pages/Library'
import AddSong from './pages/AddSong'
import AddPractice from './pages/AddPractice'

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/library" element={<Library />} />
          <Route path="/songs/add" element={<AddSong />} />
          <Route path="/practices/add/:songId" element={<AddPractice />} />
        </Routes>
      </main>
      <Navbar />
    </BrowserRouter>
  )
}

export default App
