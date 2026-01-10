import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteSong } from '../../utils/db';
import './Library.css';

function SongDetailView({ song, onBack, onPractice, onEdit, onDelete, onNavigate, hasPrevious, hasNext, entryDirection, decks, onToggleDeck, onUpgrade }) {
  const [showHours, setShowHours] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addToDeckMenuOpen, setAddToDeckMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const [touchEndY, setTouchEndY] = useState(null);
  const [exitDirection, setExitDirection] = useState(null); // 'up', 'down', 'right'
  const menuRef = useRef(null);
  const addToDeckMenuRef = useRef(null);


  const previousXp = song._previousXp ?? song.xp;
  const previousLevel = song._previousLevel ?? song.level;
  const [displayXp, setDisplayXp] = useState(previousXp);
  const [displayLevel, setDisplayLevel] = useState(previousLevel);
  const [xpGain, setXpGain] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const xpPercent = song.level != null
    ? Math.min((displayXp / song.xpThreshold) * 100, 100)
    : 0;

  const formatTuning = (tuning) => {
    if (!tuning) return 'EADGBE';
    return tuning.map((note, i) => {
      if (note.includes('#')) {
        const [base] = note.split('#');
        return <span key={i} className="tuning-note-detail">{base}<sup>#</sup></span>;
      }
      return <span key={i} className="tuning-note-detail">{note}</span>;
    });
  };

  useEffect(() => {
    setExitDirection(null);
  }, [song.songId]);

  useEffect(() => {
    document.body.style.cursor = 'auto';
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  useEffect(() => {
    setXpGain(null);
    setShowLevelUp(false);

    const levelChanged = song._previousLevel != null && song._previousLevel !== song.level;
    const xpChanged = song._previousXp != null && song._previousXp !== song.xp;

    if ((xpChanged || levelChanged) && song.xp != null) {
      const xpDiff = (song.xp ?? 0) - (song._previousXp ?? 0);

      if (song._xpGain != null) {
        setXpGain(Math.floor(song._xpGain));
        setTimeout(() => setXpGain(null), 2000);
      } else if (xpDiff > 0) {
        setXpGain(Math.floor(xpDiff));
        setTimeout(() => setXpGain(null), 2000);
      }

      if (levelChanged && song.level > song._previousLevel) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }

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
      setDisplayXp(song.xp);
      setDisplayLevel(song.level);
    }
  }, [song.songId, song.xp, song.level, song._previousXp, song._previousLevel, song._xpGain]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (addToDeckMenuRef.current && !addToDeckMenuRef.current.contains(event.target)) {
        setAddToDeckMenuOpen(false);
      }
    };

    if (menuOpen || addToDeckMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen, addToDeckMenuOpen]);

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
    onBack();
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchStartY || !touchEndX || !touchEndY) return;

    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;

    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      const isRightSwipe = distanceX < -minSwipeDistance;
      if (isRightSwipe) {
        handleBack();
      }
    } else {
      const isUpSwipe = distanceY > minSwipeDistance;
      const isDownSwipe = distanceY < -minSwipeDistance;

      if (isUpSwipe && hasNext && onNavigate) {
        setExitDirection('up');
        onNavigate(1); 
      } else if (isDownSwipe && hasPrevious && onNavigate) {
        setExitDirection('down');
        onNavigate(-1); 
      }
    }
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    onEdit();
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteSong(song.songId);
      setShowDeleteConfirm(false);
      onDelete(song.songId);
    } catch (error) {
      alert('Error deleting song');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const getExitAnimation = () => {
    if (exitDirection === 'up') {
      return { opacity: 0, y: '-100%' };
    } else if (exitDirection === 'down') {
      return { opacity: 0, y: '100%' }; 
    } else if (exitDirection === 'right') {
      return { opacity: 0, x: '100%' };
    }
    return { opacity: 0, y: 20 };
  };

  const getInitialAnimation = () => {
    if (song._fromPractice) {
      return { opacity: 0, x: -20 }; 
    }
    if (entryDirection === 'up') {
      return { opacity: 0, y: '100%' }; 
    } else if (entryDirection === 'down') {
      return { opacity: 0, y: '-100%' }; 
    }
    return { opacity: 0, y: 20 };
  };

  return (
    <>
      <AnimatePresence>
        {(addToDeckMenuOpen || menuOpen || showDeleteConfirm) && (
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setAddToDeckMenuOpen(false);
              setMenuOpen(false);
              if (showDeleteConfirm) {
                setShowDeleteConfirm(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={song.songId}
        id="song-view"
        initial={getInitialAnimation()}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={getExitAnimation()}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div id="song-top-div">
          <div id="song-head-div-1">
            <p className="song-back-icon" onClick={handleBack}>{'<'}</p>
            <div id="song-icons-container" ref={addToDeckMenuRef}>
              <AnimatePresence>
                {song.status !== 'mastered' && song.level != null && (
                  <motion.img
                    id="song-upgrade-icon"
                    onClick={onUpgrade}
                    src='./images/upgrade.png'
                    alt="Upgrade"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
              <img
                id="song-addToDeck-icon"
                 onClick={() => setAddToDeckMenuOpen(!addToDeckMenuOpen)}
                src='./images/addToDeckIcon.png'
                >
              </img>
              <AnimatePresence>
                {addToDeckMenuOpen && (
                  <motion.div
                    id="addToDeck-menu-dropdown"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    {decks && decks.length > 0 ? (
                      decks.map(deck => (
                        <div
                          key={deck.deckId}
                          className="deck-menu-item"
                          onClick={() => onToggleDeck(deck.deckId, song.songId, deck.containsSong)}
                        >
                          <span className="deck-menu-title">{deck.title}</span>
                          <img
                            src={deck.containsSong ? './images/addedIcon.png' : './images/addToDeckIcon.png'}
                            alt={deck.containsSong ? 'Remove' : 'Add'}
                            className="deck-menu-icon"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="deck-menu-empty">No decks yet</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div id="song-menu-container" ref={menuRef}>
                <img
                  id="song-menu-icon"
                  onClick={() => setMenuOpen(!menuOpen)}
                  src='./images/menu.png'
                >
                </img>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      id="song-menu-dropdown"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="song-menu-option" onClick={handleEditClick}>edit</p>
                      <p className="song-menu-option" onClick={handleDeleteClick}>delete</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
            <>
              <p id="empty-info-p">learn the song to get stats</p>
              <p id="empty-info-arrow">↓</p>
            </>
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
                <span className="stat-label">capo </span>
                <span className="stat-value">
                  {song.capo || 0}
                </span>
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

            <div className="song-tuning-display">
              {formatTuning(song.tuning)}
            </div>
          </>
        )}

        <AnimatePresence>
          {showDeleteConfirm && (
            <div id="delete-confirm-overlay">
              <motion.div
                id="delete-confirm-widget"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <p id="delete-confirm-text">Delete {song.title}?</p>
                <div id="delete-confirm-buttons">
                  <button className="delete-confirm-btn cancel-btn" onClick={handleDeleteCancel}>
                    cancel
                  </button>
                  <button className="delete-confirm-btn confirm-btn" onClick={handleDeleteConfirm}>
                    confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <button id="practice-button" onClick={onPractice}>PRACTICE</button>
      </motion.div>
    </>
  );
}

export default SongDetailView;
