import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addSong, getNextSongId, getTotalMinutesPlayed, getTotalPracticeSessions } from '../../utils/db';
import { xpThreshold } from '../../utils/levelingSystem';
import './AddSong.css';

function AddSong() {
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [status, setStatus] = useState("seen");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const titleParam = searchParams.get('title');
    if (titleParam) {
      setTitle(titleParam);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (title.length < 1) {
      alert("Title has to be longer than 1.");
      setIsSubmitting(false);
      return;
    }

    if (artistName.length < 1) {
      alert("Artist name has to be longer than 1.");
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
        capo: 0
      };

      await addSong(newSong);

      if (status !== "seen") {
        newSong.xpThreshold = xpThreshold(newSong.level);
        newSong.totalMinPlayed = await getTotalMinutesPlayed(songId);
        newSong.totalSessions = await getTotalPracticeSessions(songId);
      }

      navigate('/', { state: { newSong } });
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding song");
      setIsSubmitting(false);
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
            <label htmlFor="title-input" className="form-label">song name</label>
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
            <label htmlFor="artistName-input" className="form-label">artist</label>
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
          <label id="buttons-menu-1-label" className="form-label">difficulty</label>
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
          <label id="buttons-menu-1-label" className="form-label">current status</label>
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
              value="stale"
              className={status === "stale" ? "selected" : "status-button"}
              onClick={() => setStatus("stale")}
            >
              Stale
            </button>
          </div>
          <div id="buttons-menu-3">
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
        <button id="song-add-save" type="submit" className="form__button" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </motion.div>
  )
}

export default AddSong;