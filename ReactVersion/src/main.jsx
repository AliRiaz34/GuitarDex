import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDB } from './utils/db'

// Prevent swipe-back navigation gesture
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;

  // Prevent gesture if starting from the very edge
  if (touchStartX < 10 || touchStartX > window.innerWidth - 10) {
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  const touchMoveX = e.touches[0].clientX;
  const touchMoveY = e.touches[0].clientY;
  const deltaX = Math.abs(touchMoveX - touchStartX);
  const deltaY = Math.abs(touchMoveY - touchStartY);

  // Prevent horizontal swipe navigation from edges
  if (deltaX > deltaY && (touchStartX < 20 || touchStartX > window.innerWidth - 20)) {
    e.preventDefault();
  }
}, { passive: false });

// Initialize IndexedDB before rendering the app
initDB().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Hide loading screen after app renders
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => {
        loadingScreen.remove();
      }, 300);
    }
  }, 800);
}).catch(error => {
  console.error('Failed to initialize database:', error);
  alert('Failed to initialize database. Please try refreshing the page.');
});
