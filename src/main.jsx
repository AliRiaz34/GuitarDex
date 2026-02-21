import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initDB } from './utils/db'
import './utils/supabaseClient'

// iOS PWA keyboard fix - force focus on input tap
// iOS standalone PWAs have a bug where tapping inputs doesn't trigger keyboard
const isIOSPWA = ('standalone' in navigator) && navigator.standalone;
if (isIOSPWA) {
  document.addEventListener('touchend', (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      target.focus();
    }
  });
}

// Prevent swipe-back navigation gesture
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;

  // Prevent gesture if starting from the very edge
  // But don't prevent default on input elements - this breaks keyboard focus on some devices
  const target = e.target;
  const isInputElement = target.tagName === 'INPUT' ||
                         target.tagName === 'TEXTAREA' ||
                         target.tagName === 'SELECT' ||
                         target.isContentEditable;

  if (!isInputElement && (touchStartX < 10 || touchStartX > window.innerWidth - 10)) {
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  const touchMoveX = e.touches[0].clientX;
  const touchMoveY = e.touches[0].clientY;
  const deltaX = Math.abs(touchMoveX - touchStartX);
  const deltaY = Math.abs(touchMoveY - touchStartY);

  // Prevent horizontal swipe navigation from edges
  if (deltaX > deltaY && (touchStartX < 30 || touchStartX > window.innerWidth - 30)) {
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
