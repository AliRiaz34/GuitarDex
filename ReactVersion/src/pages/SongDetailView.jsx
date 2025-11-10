import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteSong } from '../utils/db';
import './Library.css';

function SongDetailView({ song, onBack, onPractice, onDelete, onNavigate, hasPrevious, hasNext, entryDirection }) {
  const [showHours, setShowHours] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const [touchEndY, setTouchEndY] = useState(null);
  const [exitDirection, setExitDirection] = useState(null); // 'up', 'down', 'right'
  const menuRef = useRef(null);

  // XP animation states
  const previousXp = song._previousXp ?? song.xp;
  const previousLevel = song._previousLevel ?? song.level;
  const [displayXp, setDisplayXp] = useState(previousXp);
  const [displayLevel, setDisplayLevel] = useState(previousLevel);
  const [xpGain, setXpGain] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const xpPercent = song.level != null
    ? Math.min((displayXp / song.xpThreshold) * 100, 100)
    : 0;

  // XP animation effect
  useEffect(() => {
    // Check if we have previous XP data (meaning we just came back from practice)
    if (song._previousXp != null && song._previousXp !== song.xp && song.xp != null) {
      const xpDiff = song.xp - song._previousXp;
      const levelChanged = song._previousLevel !== song.level;

      console.log('XP ANIMATION TRIGGERED!', {
        previousXp: song._previousXp,
        newXp: song.xp,
        xpDiff,
        levelChanged
      });

      // Show XP gain indicator
      if (xpDiff > 0) {
        setXpGain(Math.floor(xpDiff));
        setTimeout(() => setXpGain(null), 2000);
      }

      // Show level up animation
      if (levelChanged && song.level > song._previousLevel) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }

      // Animate XP counter
      const duration = 1000; // 1 second
      const steps = 30;
      const stepDuration = duration / steps;
      const xpStep = xpDiff / steps;
      const levelStep = levelChanged ? (song.level - song._previousLevel) / steps : 0;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayXp(song.xp);
          setDisplayLevel(song.level);
          clearInterval(interval);
        } else {
          setDisplayXp(song._previousXp + (xpStep * currentStep));
          if (levelChanged) {
            setDisplayLevel(Math.floor(song._previousLevel + (levelStep * currentStep)));
          }
        }
      }, stepDuration);

      return () => clearInterval(interval);
    } else {
      // No animation needed, just update to current values
      setDisplayXp(song.xp);
      setDisplayLevel(song.level);
    }
  }, [song.songId, song.xp, song.level, song._previousXp, song._previousLevel]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleBack = () => {
    setExitDirection('right');
    setTimeout(() => {
      onBack();
    }, 300);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchStartY || !touchEndX || !touchEndY) return;

    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;

    // Determine if swipe is more horizontal or vertical
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      // Horizontal swipe - check for back gesture
      const isRightSwipe = distanceX < -minSwipeDistance;
      if (isRightSwipe) {
        handleBack();
      }
    } else {
      // Vertical swipe - navigate between songs
      const isUpSwipe = distanceY > minSwipeDistance;
      const isDownSwipe = distanceY < -minSwipeDistance;

      if (isUpSwipe && hasNext && onNavigate) {
        setExitDirection('up');
        onNavigate(1); // Next song
        setExitDirection(null);
      } else if (isDownSwipe && hasPrevious && onNavigate) {
        setExitDirection('down');
        onNavigate(-1); // Previous song
        setExitDirection(null);
      }
    }
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteSong(song.songId);
      setShowDeleteConfirm(false);
      onDelete(song.songId);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting song');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const getExitAnimation = () => {
    if (exitDirection === 'up') {
      return { opacity: 0, y: '-100%' }; // Swipe up = current exits up
    } else if (exitDirection === 'down') {
      return { opacity: 0, y: '100%' }; // Swipe down = current exits down
    } else if (exitDirection === 'right') {
      return { opacity: 0, x: '100%' };
    }
    return { opacity: 0, y: 20 };
  };

  const getInitialAnimation = () => {
    if (entryDirection === 'up') {
      return { opacity: 0, y: '100%' }; // Swipe up = new enters from bottom
    } else if (entryDirection === 'down') {
      return { opacity: 0, y: '-100%' }; // Swipe down = new enters from top
    }
    return { opacity: 0, y: 20 }; // Default animation
  };

  return (
    <>
      <motion.div
        key={song.songId}
        id="song-view"
        initial={getInitialAnimation()}
        animate={{ opacity: 1, y: 0 }}
        exit={getExitAnimation()}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div id="song-top-div">
          <div id="song-head-div-1">
            <p className="song-back-icon" onClick={handleBack}>{'<'}</p>
            <div id="song-menu-container" ref={menuRef}>
              <img
                id="song-menu-icon"
                onClick={() => setMenuOpen(!menuOpen)}
                src='/images/menu.png'
              >
              </img>
              {menuOpen && (
                <div id="song-menu-dropdown">
                  <p className="song-menu-option" onClick={handleDeleteClick}>delete</p>
                </div>
              )}
            </div>
          </div>
          <h2 id="title">{song.title}</h2>
          <div id="song-head-div-2">
            <h3 id="artistName">{song.artistName}</h3>
            {song.songDuration != null && (
              <p id="duration">{song.songDuration} min</p>
            )}
          </div>
          {song.level == null && (
            <p id="empty-info-p">learn the song buddy</p>
          )}
        </div>

        {song.level != null && (
          <>
            <div id="song-xp-div" style={{ position: 'relative' }}>
              <p id="level">
                Lv {Math.floor(displayLevel)}
                {showLevelUp && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0, 1, 0, 1, 0] }}
                    transition={{ duration: 2, times: [0, 0.14, 0.28, 0.42, 0.56, 0.70, 1] }}
                  >
                    +
                  </motion.span>
                )}
              </p>
              <div id="xp-container">
                <div
                  id="xp-bar"
                  style={{
                    width: `${xpPercent}%`,
                    transition: 'width 1s ease-out'
                  }}
                ></div>
              </div>
              <p id="xp">XP {Math.floor(displayXp)} / {Math.floor(song.xpThreshold)}</p>

              {/* XP Gain Indicator */}
              <AnimatePresence>
                {xpGain && (
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -30 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      color: '#ffffffff',
                      pointerEvents: 'none',
                      fontSize: '0.8em'
                    }}
                  >
                    +{xpGain} XP
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            <div className="song-stats-grid">
              <div className="stat-item">
                <span className="stat-label"></span>
                <span className="stat-value">{song.status.toUpperCase()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label"></span>
                <span className="stat-value">{song.difficulty.toUpperCase()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {song.totalSessions}
                </span>
                <span className="stat-label"> {song.totalSessions === 1 ? 'drill' : 'drills'}</span>
              </div>
              <div className="stat-item" onClick={() => setShowHours(!showHours)} style={{ cursor: 'pointer' }}>
                <span className="stat-value">
                  {showHours
                    ? ((song.totalMinPlayed != null ? song.totalMinPlayed : 0) / 60).toFixed(1)
                    : (song.totalMinPlayed != null ? song.totalMinPlayed : 0)}
                </span>
                <span className="stat-label"> {showHours ? 'hr' : 'min'}</span>
              </div>
            </div>
          </>
        )}

        {showDeleteConfirm && (
          <div id="delete-confirm-overlay">
            <div id="delete-confirm-widget">
              <p id="delete-confirm-text">Delete {song.title}?</p>
              <div id="delete-confirm-buttons">
                <button className="delete-confirm-btn cancel-btn" onClick={handleDeleteCancel}>
                  cancel
                </button>
                <button className="delete-confirm-btn confirm-btn" onClick={handleDeleteConfirm}>
                  confirm
                </button>
              </div>
            </div>
          </div>
        )}
        <button id="practice-button" onClick={onPractice}>PRACTICE</button>
      </motion.div>
    </>
  );
}

export default SongDetailView;
