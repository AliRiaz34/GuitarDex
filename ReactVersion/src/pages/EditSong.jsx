import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addSong, getNextSongId, getTotalMinutesPlayed, getTotalPracticeSessions } from '../utils/db';
import { xpThreshold } from '../utils/levelingSystem';
import './EditSong.css';

function EditSong() {
  const [songId] = useSearchParams();
  const [title, setTitle] = useSearchParams();
  const [artistName, setArtistName] = useSearchParams();
  const [difficulty, setDifficulty] = useSearchParams();
  const navigate = useNavigate();

  // Swipe gesture detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isSwiping = useRef(false);

  // Swipe gesture handlers
  useEffect(() => {
    const handleTouchStart = (e) => {
      // Ignore touches on interactive elements (inputs, buttons, etc.)
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' ||
          target.closest('button') || target.closest('input')) {
        isSwiping.current = false;
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = true;
    };

    const handleTouchMove = (e) => {
      if (!isSwiping.current) return;

      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current) return;

      const deltaX = touchStartX.current - touchEndX.current;
      const deltaY = touchStartY.current - touchEndY.current;
      const minSwipeDistance = 50;

      // Check if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Swipe left - navigate back to Library
        if (deltaX > 0) {
          navigate('/');
        }
      }

      isSwiping.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  // Pre-fill title from query parameter
  useEffect(() => {
    const titleParam = searchParams.get('title');
    if (titleParam) {
      setTitle(titleParam);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation (matching Flask version)
    if (title.length < 1) {
      alert("Title has to be longer than 1.");
      return;
    }

    if (artistName.length < 1) {
      alert("Artist name has to be longer than 1.");
      return;
    }

    try {
      const songId = await getNextSongId();
      const addDate = new Date().toISOString();
      const songDuration = null;

      let level, xp, highestLevelReached, lastDecayDate, lastPracticeDate;

      if (status === "seen") {
        level = null;
        xp = null;
        highestLevelReached = null;
        lastDecayDate = null;
        lastPracticeDate = null;
      } else if (status === "mastered") {
        level = 25; // MAX_LEVEL_BEFORE_MASTERY
        xp = 0;
        highestLevelReached = level;
        lastDecayDate = addDate;
        lastPracticeDate = addDate;
      } else if (status === "refined") {
        level = 10; // MAX_LEVEL_BEFORE_REFINED
        xp = 0;
        highestLevelReached = level;
        lastDecayDate = addDate;
        lastPracticeDate = addDate;
      }

      const newSong = {
        songId,
        status,
        title,
        artistName,
        level,
        xp,
        difficulty,
        songDuration,
        highestLevelReached,
        lastPracticeDate,
        lastDecayDate,
        addDate
      };

      await addSong(newSong);

      // Add calculated fields for non-seen songs
      if (status !== "seen") {
        newSong.xpThreshold = xpThreshold(newSong.level);
        newSong.totalMinPlayed = await getTotalMinutesPlayed(songId);
        newSong.totalSessions = await getTotalPracticeSessions(songId);
      }

      // Navigate back to library with the new song
      navigate('/', { state: { newSong } });
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding song");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <form id="song-form" onSubmit={handleSubmit}>
        <div id="add-input-div">
          <div id="title-input-div">
            <label htmlFor="title-input" className="form-label">the song's name</label>
            <div className="input-group">
              <p className="input-arrow">{'> '}</p>
              <input
                type="text"
                className="song-input"
                id="title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={45}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>
          <div id="artistName-input-div">
            <label htmlFor="artistName-input" className="form-label">the artist</label>
            <div className="input-group">
              <p className="input-arrow">{'> '}</p>
              <input
                type="text"
                className="song-input"
                id="artistName-input"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                maxLength={45}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>
          <label id="buttons-menu-1-label" className="form-label">select difficulty</label>
          <div id="buttons-menu-1">
              <button
                type="button"
                value="easy"
                className={difficulty === "easy" ? "selected" : ""}
                onClick={() => setDifficulty("easy")}
              >
                Easy
              </button>
              <button
                type="button"
                value="normal"
                className={difficulty === "normal" ? "selected" : ""}
                onClick={() => setDifficulty("normal")}
              >
                Normal
              </button>
              <button
                type="button"
                value="hard"
                className={difficulty === "hard" ? "selected" : ""}
                onClick={() => setDifficulty("hard")}
              >
                Hard
              </button>
          </div>
          <label id="buttons-menu-1-label" className="form-label">select current status</label>
          <div id="buttons-menu-2">
            <button
              type="button"
              value="new"
              className={status === "seen" ? "selected" : "status-button"}
              onClick={() => setStatus("seen")}
            >
              New
            </button>
            <button
              type="button"
              value="refined"
              className={status === "refined" ? "selected" : "status-button"}
              onClick={() => setStatus("refined")}
            >
              Refined
            </button>
            <button
              type="button"
              value="mastered"
              className={status === "mastered" ? "selected" : "status-button"}
              onClick={() => setStatus("mastered")}
            >
              Mastered
            </button>
          </div>
        </div>
        <button id="song-add-save" type="submit" className="form__button">
          Save
        </button>
      </form>
    </motion.div>
  )
}

export default EditSong;