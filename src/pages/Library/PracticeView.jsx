import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTuner, calculateTargetFrequencies, getTuningStatus } from '../../utils/tunerUtils';
import './Library.css';

function PracticeView({ song, onSubmit, onBack, onGoToSong }) {
  const [minPlayed, setMinPlayed] = useState(song.songDuration || "");
  const [songDuration, setSongDuration] = useState("");
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [selectedMinButton, setSelectedMinButton] = useState(null);
  const [selectedDurationButton, setSelectedDurationButton] = useState(null);

  const minSwipeDistance = 50;

  // Tuner setup
  const targetFrequencies = useMemo(
    () => calculateTargetFrequencies(song?.tuning, song?.capo || 0),
    [song?.tuning, song?.capo]
  );

  const {
    isListening,
    closestString,
    centsOff,
    permissionStatus,
    startListening,
    stopListening,
  } = useTuner(targetFrequencies);

  const tuningStatus = getTuningStatus(centsOff);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  const formatNote = (note) => {
    if (!note) return '--';
    if (note.includes('#')) {
      const [base] = note.split('#');
      return <>{base}<sup>#</sup></>;
    }
    return note;
  };

  const formatTuning = (tuning) => {
    if (!tuning) return 'EADGBE';
    return tuning.map((note, i) => {
      if (note.includes('#')) {
        const [base] = note.split('#');
        return <span key={i} className="tuning-note">{base}<sup>#</sup></span>;
      }
      return <span key={i} className="tuning-note">{note}</span>;
    });
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleBack = () => {
    stopListening();
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

    if (minPlayed > 999) {
      alert("Thats too long dawg.");
      return;
    }

    const finalSongDuration = song.songDuration !== null ? Number(song.songDuration) : Number(songDuration);

    if (song.status === "seen" && song.songDuration === null && (songDuration > 999 || songDuration < 1)) {
      alert("Invalid song duration G.");
      return;
    }

    onSubmit({ minPlayed: Number(minPlayed), songDuration: finalSongDuration });
  };

  return (
    <motion.div
      id="practice-view"
      style={{ minHeight: '60vh', padding: '15px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: '100%' }}
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
        <h1 id="song-practice-title" onClick={onGoToSong} style={{ cursor: 'pointer' }}>{song.title}</h1>
        <p className="practice-song-info">
          <span className="tuning-container">{formatTuning(song.tuning)}</span>
          {song.capo > 0 && <span>capo {song.capo}</span>}
        </p>

        {/* Inline tuner */}
        <div
          className={`practice-tuner ${!isListening ? 'tappable' : ''}`}
          onClick={() => {
            if (permissionStatus === 'denied') return;
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
        >
          <span className={`tuner-arrow-indicator left ${isListening && closestString?.note && centsOff < -5 ? 'flat' : ''} ${isListening && closestString?.note && tuningStatus === 'in-tune' ? 'in-tune' : ''}`}>
            {'<'}
          </span>
          <div className={`tuner-detected-note ${isListening && closestString?.note ? tuningStatus : ''}`}>
            {isListening ? formatNote(closestString?.note) : '--'}
          </div>
          <span className={`tuner-arrow-indicator right ${isListening && closestString?.note && centsOff > 5 ? 'sharp' : ''} ${isListening && closestString?.note && tuningStatus === 'in-tune' ? 'in-tune' : ''}`}>
            {'>'}
          </span>
        </div>

        <div id="minPlayed-input-div">
          <label className="form-label"> your practice duration</label>
          <div className="quick-select-button-div">
            <button
              onClick={() => {
                setMinPlayed(15);
                setSelectedMinButton(15);
              }}
              type="button"
              className={`quick-select-button ${selectedMinButton === 15 ? 'selected-quick' : ''}`}
            >
              15
            </button>
            <p className="between-button-line">|</p>
            <button
              onClick={() => {
                setMinPlayed(30);
                setSelectedMinButton(30);
              }}
              type="button"
              className={`quick-select-button ${selectedMinButton === 30 ? 'selected-quick' : ''}`}
            >
              30
            </button>
            <p className="between-button-line">|</p>
            <button
              onClick={() => {
                setMinPlayed(45);
                setSelectedMinButton(45);
              }}
              type="button"
              className={`quick-select-button ${selectedMinButton === 45 ? 'selected-quick' : ''}`}
            >
              45
            </button>
            <p className="between-button-line">|</p>
            <button
              onClick={() => {
                setMinPlayed(60);
                setSelectedMinButton(60);
              }}
              type="button"
              className={`quick-select-button ${selectedMinButton === 60 ? 'selected-quick' : ''}`}
            >
              60
            </button>
          </div>
          <div className="practice-input-group">
              <p className="input-arrow">{'> '}</p>
              <input
                type="number"
                className="practice-input"
                id="minPlayed-input"
                value={minPlayed}
                onChange={(e) => {
                  setMinPlayed(e.target.value);
                  setSelectedMinButton(null);
                }}
                min="1"
                max="360"
                inputMode="numeric"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                required
              />
              <label className="min-label">min</label>
            </div>
        </div>
        {song.songDuration === null && (
          <div id="duration-div">
            <label className="form-label">the song's duration</label>
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
        )}
        <button type="submit" className="form__button">
          Save
        </button>
      </form>
    </motion.div>
  );
}

export default PracticeView;
