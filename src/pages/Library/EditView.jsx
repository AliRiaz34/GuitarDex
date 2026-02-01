import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import './Library.css';

function EditView({ song, onSubmit, onBack }) {
  const [title, setTitle] = useState(song?.title || '');
  const [artistName, setArtistName] = useState(song?.artistName || '');
  const [difficulty, setDifficulty] = useState(song?.difficulty || 'normal');
  const [songDuration, setSongDuration] = useState(song?.songDuration || null);
  const [selectedDurationButton, setSelectedDurationButton] = useState(null);
  const [tuning, setTuning] = useState(song?.tuning || ['E', 'A', 'D', 'G', 'B', 'E']);
  const [capo, setCapo] = useState(song?.capo || 0);
  const [lyrics, setLyrics] = useState(song?.lyrics || '');

  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const changeTuning = (stringIndex, direction) => {
    const newTuning = [...tuning];
    const currentNote = newTuning[stringIndex];
    const currentIndex = chromaticScale.indexOf(currentNote);

    if (currentIndex === -1) {
      newTuning[stringIndex] = 'E';
    } else {
      const newIndex = direction === 'up'
        ? (currentIndex + 1) % chromaticScale.length
        : (currentIndex - 1 + chromaticScale.length) % chromaticScale.length;
      newTuning[stringIndex] = chromaticScale[newIndex];
    }

    setTuning(newTuning);
  };

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA' ||
        target.closest('button') || target.closest('input') || target.closest('textarea')) {
      isSwiping.current = false;
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isSwiping.current) return;
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping.current) return;

    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const minSwipeDistance = 50;

    if (deltaX < -minSwipeDistance) {
      handleBack();
    }

    isSwiping.current = false;
  };

  function handleFormSubmit(e) {
    e.preventDefault();

    if (title.length < 1) {
      alert("Title has to be longer than 1.");
      return;
    }

    if (artistName.length < 1) {
      alert("Artist name has to be longer than 1.");
      return;
    }

    onSubmit({
      title,
      artistName,
      difficulty,
      songDuration: songDuration ? parseInt(songDuration) : null,
      tuning,
      capo,
      lyrics
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
        <div className="edit-form-content">
        <p id="edit-back-icon" onClick={handleBack}>{'<'}</p>
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
          <div id="lyrics-div">
            <label className="form-label">lyrics</label>
            <textarea
              className="lyrics-textarea"
              id="lyrics-input"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="paste or type lyrics here..."
              rows={12}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
          <div id="tuning-editor">
            <label className="form-label">tuning</label>
            <div className="tuning-strings-container">
              {tuning.map((note, index) => (
                <div key={index} className="tuning-string-control">
                  <button
                    type="button"
                    className="tuning-arrow"
                    onClick={() => changeTuning(index, 'up')}
                  >
                    ^
                  </button>
                  <div className="tuning-note">
                    {note.includes('#') ? <>{note.split('#')[0]}<sup>#</sup></> : note}
                  </div>
                  <button
                    type="button"
                    className="tuning-arrow tuning-arrow-down"
                    onClick={() => changeTuning(index, 'down')}
                  >
                    ^
                  </button>
                </div>
              ))}
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
          <div id="duration-div">
            <label className="form-label">song duration</label>
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
              <p className="practice-input-arrow">{'> '}</p>
              <input
                type="number"
                className="practice-input"
                id="songDuration-input"
                value={songDuration || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSongDuration(value === '' ? null : value);
                  setSelectedDurationButton(null);
                }}
                inputMode="numeric"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                min="0"
                max="30"
              />
              <label className="min-label">min</label>
            </div>
          </div>
          <div id="capo-div">
            <label className="form-label">capo</label>
            <div className="capo-input-group">
              <p className="practice-input-arrow">{'> '}</p>
              <input
                type="number"
                className="capo-input"
                id="capo-input"
                value={capo}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setCapo(Math.max(0, Math.min(15, value)));
                }}
                inputMode="numeric"
                min="0"
                max="15"
              />
              <label className="min-label">fret</label>
            </div>
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