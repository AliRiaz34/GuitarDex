import { useState } from 'react';
import { motion } from 'framer-motion';
import './AddPractice.css';

function PracticeView({ song, onSubmit, onBack }) {
  const [minPlayed, setMinPlayed] = useState(song.songDuration || "");
  const [songDuration, setSongDuration] = useState("");
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [exitDirection, setExitDirection] = useState(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleBack = () => {
    setExitDirection('right');
    onBack();
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      handleBack();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (minPlayed > 999) {
      alert("Thats too long dawg.");
      return;
    }

    const finalSongDuration = song.songDuration !== null ? song.songDuration : songDuration;


    if (song.status === "seen" && (songDuration > 999 || songDuration < 1)) {
      alert("Invalid song duration G.");
      return;
    }

    console.log(finalSongDuration);
    onSubmit({ minPlayed, songDuration: finalSongDuration });
  };

  const getExitAnimation = () => {
    if (exitDirection === 'right') {
      return { opacity: 0, x: '100%' };
    }
    return { opacity: 0, y: 20 };
  };

  return (
    <motion.div
      id="practice-view"
      style={{ minHeight: '60vh', padding: '15px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={getExitAnimation()}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: song.songDuration === null ? 'space-between' : 'center',
          minHeight: '60vh'
        }}
      >
        <p id="practice-back-icon" onClick={handleBack}>{'<'}</p>
        <h1 id="song-practice-title">{song.title}</h1>
        <div id="minPlayed-input-div">
          <label className="form-label">how long did you play? </label>
          <div className="quick-select-button-div">
            <button onClick={() => setMinPlayed(15)} type="button" className="quick-select-button">15</button>
            <p className="between-button-line">|</p>
            <button onClick={() => setMinPlayed(30)} type="button" className="quick-select-button">30</button>
            <p className="between-button-line">|</p>
            <button onClick={() => setMinPlayed(45)} type="button" className="quick-select-button">45</button>
            <p className="between-button-line">|</p>
            <button onClick={() => setMinPlayed(60)} type="button" className="quick-select-button">60</button>
          </div>
          <input
            type="number"
            className="practice-input"
            id="minPlayed-input"
            value={minPlayed}
            onChange={(e) => setMinPlayed(e.target.value)}
            inputMode="numeric" 
            min="1"
            max="999"
            required
          />
        </div>
        {song.songDuration === null && (
          <div id="duration-div">
            <label className="form-label">how long is the song?</label>
            <div className="quick-select-button-div">
              <button onClick={() => setSongDuration(3)} type="button" className="quick-select-button">3</button>
              <p className="between-button-line"> |</p>
              <button onClick={() => setSongDuration(4)} type="button" className="quick-select-button">4</button>
              <p className="between-button-line">|</p>
              <button onClick={() => setSongDuration(5)} type="button" className="quick-select-button">5</button>
            </div>
            <input
              type="number"
              className="practice-input"
              id="songDuration-input"
              value={songDuration}
              onChange={(e) => setSongDuration(e.target.value)}
              inputMode="numeric" 
              min="0"
              max="30"
              required
            />
          </div>
        )}
        <div className="save-div">
          <button type="submit" className="form__button">
            Save
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default PracticeView;
