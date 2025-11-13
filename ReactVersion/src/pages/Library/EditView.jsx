import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import './EditView.css';

function EditView({ song, onSubmit, onBack }) {
  const [title, setTitle] = useState(song?.title || '');
  const [artistName, setArtistName] = useState(song?.artistName || '');
  const [difficulty, setDifficulty] = useState(song?.difficulty || 'normal');
  const [songDuration, setSongDuration] = useState(song?.songDuration || '');
  const [selectedDurationButton, setSelectedDurationButton] = useState(null);

  // Swipe gesture detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    // Ignore touches on interactive elements (inputs, buttons, etc.)
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' ||
        target.closest('button') || target.closest('input')) {
      isSwiping.current = false;
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isSwiping.current) return;
    // Track current position for potential swipe detection if needed
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping.current) return;

    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const minSwipeDistance = 50;

    // Swipe right to go back
    if (deltaX < -minSwipeDistance) {
      handleBack();
    }

    isSwiping.current = false;
  };

  function handleFormSubmit(e) {
    e.preventDefault();

    // Validation 
    if (title.length < 1) {
      alert("Title has to be longer than 1.");
      return;
    }

    if (artistName.length < 1) {
      alert("Artist name has to be longer than 1.");
      return;
    }

    // Call onSubmit with the updated data
    onSubmit({
      title,
      artistName,
      difficulty,
      songDuration: parseInt(songDuration)
    });
  }

  const handleBack = () => {
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <form
        id="edit-song-form"
        onSubmit={handleFormSubmit}
      >
        <p id="edit-back-icon" onClick={handleBack}>{'<'}</p>
        <div id="add-input-div">
          <div id="title-input-div">
            <label htmlFor="title-input" className="form-label">current song name</label>
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
            <label htmlFor="artistName-input" className="form-label">current artist</label>
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
          <label id="buttons-menu-1-label" className="form-label">current difficulty</label>
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
          <div id="duration-div">
            <label className="form-label">current song duration</label>
            <div className="quick-select-button-div">
              <button
                onClick={() => {
                  setSongDuration(3);
                  setSelectedDurationButton(3);
                }}
                type="button"
                className={`quick-select-button ${selectedDurationButton === 3 ? 'selected-quick' : ''}`}
              >
                3
              </button>
              <p className="between-button-line"> |</p>
              <button
                onClick={() => {
                  setSongDuration(4);
                  setSelectedDurationButton(4);
                }}
                type="button"
                className={`quick-select-button ${selectedDurationButton === 4 ? 'selected-quick' : ''}`}
              >
                4
              </button>
              <p className="between-button-line">|</p>
              <button
                onClick={() => {
                  setSongDuration(5);
                  setSelectedDurationButton(5);
                }}
                type="button"
                className={`quick-select-button ${selectedDurationButton === 5 ? 'selected-quick' : ''}`}
              >
                5
              </button>
            </div>
            <div className="practice-input-group">
              <p className="input-arrow">{'> '}</p>
              <input
                type="number"
                className="practice-input"
                id="songDuration-input"
                value={songDuration}
                onChange={(e) => {
                  setSongDuration(e.target.value);
                  setSelectedDurationButton(null);
                }}
                inputMode="numeric"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                min="0"
                max="30"
                required
              />
              <label className="min-label">min</label>
            </div>
          </div>
        </div>
        <button id="song-add-save" type="submit" className="form__button">
          Save
        </button>
      </form>
    </motion.div>
  )
}

export default EditView;