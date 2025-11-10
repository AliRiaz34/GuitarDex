import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addSong, getNextSongId, getTotalMinutesPlayed, getTotalPracticeSessions } from '../utils/db';
import { xpThreshold } from '../utils/levelingSystem';
import './AddSong.css';

function AddSong() {
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [difficulty, setDifficulty] = useState("normal");
  const [status, setStatus] = useState("seen");
  const navigate = useNavigate();

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
      navigate('/library', { state: { newSong } });
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding song");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <form id="song-form" onSubmit={handleSubmit}>
        <div id="add-input-div">
          <div id="title-input-div">
            <label htmlFor="title-input" className="form-label">Whats the song called?</label>
            <input
              type="text"
              className="song-input"
              id="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="..."
              maxLength={45}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              required
            />
          </div>
          <div id="artistName-input-div">
            <label htmlFor="artistName-input" className="form-label">Who played it?</label>
            <input
              type="text"
              className="song-input"
              id="artistName-input"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="..."
              maxLength={45}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              required
            />
          </div>
          <div className="buttons-menu">
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
            <div className="buttons-menu">
              <button
                type="button"
                value="seen"
                className={status === "seen" ? "selected" : ""}
                onClick={() => setStatus("seen")}
              >
                Seen
              </button>
              <button
                type="button"
                value="refined"
                className={status === "refined" ? "selected" : ""}
                onClick={() => setStatus("refined")}
              >
                Refined
              </button>
              <button
                type="button"
                value="mastered"
                className={status === "mastered" ? "selected" : ""}
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

export default AddSong;