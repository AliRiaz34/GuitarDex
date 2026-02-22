import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addSong, getNextSongId, getTotalMinutesPlayed, getTotalPracticeSessions } from '../../utils/supabaseDb';
import { xpThreshold } from '../../utils/levelingSystem';
import { useData } from '../../contexts/DataContext';
import './AddSong.css';

function AddSong() {
  const [searchParams] = useSearchParams();
  const { setSongs } = useData();
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [status, setStatus] = useState("seen");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState({ field: '', msg: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const titleParam = searchParams.get('title');
    if (titleParam) {
      setTitle(titleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (error.field) {
      const timer = setTimeout(() => setError({ field: '', msg: '' }), 1200);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (title.length < 1) {
      setError({ field: 'title', msg: 'enter song name' });
      setIsSubmitting(false);
      return;
    }

    if (artistName.length < 1) {
      setError({ field: 'artist', msg: 'enter artist' });
      setIsSubmitting(false);
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
        level = 20; // MAX_LEVEL_BEFORE_MASTERY
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
      } else if (status === "stale") {
        level = 1;
        xp = 0;
        // stale songs are assumed to have been refined before initially
        highestLevelReached =  10; // MAX_LEVEL_BEFORE_REFINED
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
        practiceStreak: status === "seen" ? null : 0,
        lastPracticeDate,
        lastDecayDate,
        addDate,
        tuning: ['E', 'A', 'D', 'G', 'B', 'E'], // Standard tuning
        capo: 0,
        lyrics: ''
      };

      await addSong(newSong);

      if (status !== "seen") {
        newSong.xpThreshold = xpThreshold(newSong.level);
        newSong.totalMinPlayed = await getTotalMinutesPlayed(songId);
        newSong.totalSessions = await getTotalPracticeSessions(songId);
      }

      setSongs(prevSongs => [newSong, ...prevSongs]);
      navigate('/', { state: { newSong } });
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding song");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <form id="song-form" onSubmit={handleSubmit}>
        <div className="add-form-content">
        <div id="add-input-div">
          <div className="add-field">
            <label htmlFor="title-input" className="form-label">song name</label>
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
            />
            <AnimatePresence>
              {error.field === 'title' && (
                <motion.div
                  className="error-bubble"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="error-bubble-arrow" />
                  {error.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="add-field">
            <label htmlFor="artistName-input" className="form-label">artist</label>
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
            />
            <AnimatePresence>
              {error.field === 'artist' && (
                <motion.div
                  className="error-bubble"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="error-bubble-arrow" />
                  {error.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="button-rows">
            <div className="button-row">
              <button type="button" className={difficulty === "easy" ? "selected" : ""} onClick={() => setDifficulty("easy")}>Easy</button>
              <button type="button" className={difficulty === "normal" ? "selected" : ""} onClick={() => setDifficulty("normal")}>Normal</button>
              <button type="button" className={difficulty === "hard" ? "selected" : ""} onClick={() => setDifficulty("hard")}>Hard</button>
            </div>
            <div className="button-row" style={{ marginTop: '20px' }}>
              <button type="button" className={status === "seen" ? "selected" : ""} onClick={() => setStatus("seen")}>New</button>
              <button type="button" className={status === "stale" ? "selected" : ""} onClick={() => setStatus("stale")}>Stale</button>
            </div>
            <div className="button-row">
              <button type="button" className={status === "refined" ? "selected" : ""} onClick={() => setStatus("refined")}>Refined</button>
              <button type="button" className={status === "mastered" ? "selected" : ""} onClick={() => setStatus("mastered")}>Mastered</button>
            </div>
          </div>
        </div>
        </div>
        <button id="song-add-save" type="submit" className="form__button" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}

export default AddSong;