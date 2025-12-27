import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTuner, calculateTargetFrequencies, getTuningStatus } from '../../utils/tunerUtils';
import './Library.css';

function TunerView({ song, onBack, onGoToSong }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  // Calculate target frequencies based on song tuning and capo
  const targetFrequencies = useMemo(
    () => calculateTargetFrequencies(song?.tuning, song?.capo || 0),
    [song?.tuning, song?.capo]
  );

  const {
    isListening,
    detectedFrequency,
    closestString,
    centsOff,
    permissionDenied,
    startListening,
    stopListening,
  } = useTuner(targetFrequencies);

  // Auto-start listening on mount
  useEffect(() => {
    startListening();
  }, [startListening]);

  const tuningStatus = getTuningStatus(centsOff);

  // Calculate needle position (map -50 to +50 cents to 0% to 100%)
  const needlePosition = 50 + Math.max(-50, Math.min(50, centsOff));

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

  const handleGoToSong = () => {
    stopListening();
    onGoToSong();
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      handleBack();
    }
  };

  const formatNote = (note) => {
    if (!note) return '--';
    if (note.includes('#')) {
      const [base] = note.split('#');
      return <>{base}<sup>#</sup></>;
    }
    return note;
  };

  const getStatusText = () => {
    if (!isListening) return '';
    if (!detectedFrequency) return 'Listening...';
    if (tuningStatus === 'in-tune') return 'In tune!';
    if (centsOff > 0) return 'Sharp';
    return 'Flat';
  };

  return (
    <motion.div
      id="tuner-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <p id="tuner-back-icon" onClick={handleBack}>{'<'}</p>

      <h1 id="tuner-title" onClick={handleGoToSong} style={{ cursor: 'pointer' }}>{song?.title || 'Tuner'}</h1>

      {permissionDenied ? (
        <div className="tuner-permission-error">
          <p>Microphone access denied.</p>
          <p>Please enable microphone permissions to use the tuner.</p>
        </div>
      ) : (
        <>
          {/* Detected note display with arrows */}
          <div className="tuner-note-container">
            <span className={`tuner-arrow-indicator left ${isListening && centsOff < -5 ? 'active' : ''} ${isListening && closestString?.note && tuningStatus === 'in-tune' ? 'in-tune' : ''}`}>
              {'<'}
            </span>
            <div className={`tuner-detected-note ${isListening && closestString?.note ? tuningStatus : ''}`}>
              {isListening ? formatNote(closestString?.note) : '--'}
            </div>
            <span className={`tuner-arrow-indicator right ${isListening && centsOff > 5 ? 'active' : ''} ${isListening && closestString?.note && tuningStatus === 'in-tune' ? 'in-tune' : ''}`}>
              {'>'}
            </span>
          </div>

          {/* String targets */}
          <div className="tuner-strings">
            {targetFrequencies.map((target, index) => (
              <div
                key={index}
                className={`tuner-string ${
                  isListening && closestString?.stringIndex === index ? 'active' : ''
                } ${
                  isListening && closestString?.stringIndex === index && tuningStatus === 'in-tune' ? 'in-tune' : ''
                }`}
              >
                <span className="tuner-string-note">{formatNote(target.note)}</span>
              </div>
            ))}
          </div>

          {song?.capo > 0 && (
            <p className="tuner-capo-info">capo {song.capo}</p>
          )}
        </>
      )}
    </motion.div>
  );
}

export default TunerView;
