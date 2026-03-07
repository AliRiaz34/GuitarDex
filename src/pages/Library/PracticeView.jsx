import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTuner, calculateTargetFrequencies, getTuningStatus } from '../../utils/tunerUtils';
import { loadYouTubeAPI, searchYouTube } from '../../utils/youtube';
import './Library.css';

function PracticeView({ song, onSubmit, onBack, onGoToSong, onPass }) {
  const [minPlayed, setMinPlayed] = useState(song.songDuration || "");
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [selectedMinButton, setSelectedMinButton] = useState(null);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const lyricsPreviewRef = useRef(null);
  const lyricsWidgetRef = useRef(null);

  useEffect(() => {
    if (lyricsExpanded && lyricsPreviewRef.current && lyricsWidgetRef.current) {
      const preview = lyricsPreviewRef.current;
      const widget = lyricsWidgetRef.current;
      // Let the browser lay out columns, then shrink-wrap the widget to the actual content width
      requestAnimationFrame(() => {
        const contentWidth = preview.scrollWidth;
        widget.style.width = (contentWidth + 26) + 'px'; // 26 = padding (5+5) + border (2+2) + buffer
      });
    }
  }, [lyricsExpanded]);
  const [fretboardOpen, setFretboardOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);


  const minSwipeDistance = 50;

  // Tuner setup
  const targetFrequencies = useMemo(
    () => calculateTargetFrequencies(song?.tuning, song?.capo || 0),
    [song?.tuning, song?.capo]
  );

  const {
    isListening,
    detectedNote,
    closestString,
    centsOff,
    permissionStatus,
    startListening,
    stopListening,
  } = useTuner(targetFrequencies);

  // Only show green (in-tune) if the detected note matches a target tuning note
  const matchesTarget = closestString && detectedNote === closestString.note;
  const baseTuningStatus = getTuningStatus(centsOff);
  const tuningStatus = baseTuningStatus === 'in-tune' && matchesTarget ? 'in-tune' :
                       baseTuningStatus === 'in-tune' ? 'close' : baseTuningStatus;

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

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') handleBack(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      handleBack();
    }
  };

  // YouTube IFrame Player
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytProgressInterval = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function initYouTube() {
      await loadYouTubeAPI();
      if (cancelled) return;

      const videoId = await searchYouTube(song.title, song.artistName);
      if (!videoId || cancelled) return;

      const player = new window.YT.Player(ytContainerRef.current, {
        height: '1',
        width: '1',
        videoId,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            if (cancelled) return;
            player.setVolume(volume * 100);
            setAudioDuration(player.getDuration());
            setAudioReady(true);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            clearInterval(ytProgressInterval.current);
            if (playing) {
              ytProgressInterval.current = setInterval(() => {
                if (ytPlayerRef.current) {
                  setCurrentTime(ytPlayerRef.current.getCurrentTime());
                }
              }, 500);
            }
          },
        },
      });
      ytPlayerRef.current = player;
    }

    initYouTube();

    return () => {
      cancelled = true;
      clearInterval(ytProgressInterval.current);
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [song.title, song.artistName]);

  const togglePlay = () => {
    if (!ytPlayerRef.current || !audioReady) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  };

  const handleSeek = (e) => {
    const seconds = parseFloat(e.target.value);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(v * 100);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (minPlayed > 999) {
      alert("Thats too long dawg.");
      return;
    }

    onSubmit({ minPlayed: Number(minPlayed), songDuration: song.songDuration ? Number(song.songDuration) : null });
  };

  return (
    <motion.div
      id="practice-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <form
        id="practice-form"
        onSubmit={handleSubmit}
      >
        <div className="practice-form-content">
        <div className="practice-head-div">
          <p id="practice-back-icon" onClick={handleBack}>{'<'}</p>
          <div className="practice-head-right">
            {song.lyrics && (
              <div className="lyrics-icon-button" onClick={() => setLyricsExpanded(true)}>
                <img src="/images/smalllyricscroll.png" alt="Lyrics" />
              </div>
            )}
            <div className="fretboard-button" onClick={() => setFretboardOpen(true)}>
              <img src="/images/fretboard-button.png" alt="Fretboard" />
            </div>
          </div>
        </div>
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
          {/* Pixelated tuning meter */}
          <div className="tuning-meter">
            <span className="meter-bracket">[</span>
            <div className="meter-track">
              <div className="meter-segments">
                {[...Array(11)].map((_, i) => (
                  <span key={i} className={`meter-segment ${i === 5 ? 'center' : ''}`}>
                    {i === 5 ? '|' : '.'}
                  </span>
                ))}
              </div>
              <div
                className={`meter-needle ${isListening && detectedNote ? tuningStatus : ''}`}
                style={{
                  left: isListening && detectedNote
                    ? `${50 + Math.max(-50, Math.min(50, centsOff))}%`
                    : '50%'
                }}
              >
                |
              </div>
            </div>
            <span className="meter-bracket">]</span>
          </div>

          <div className="tuner-note-row">
            <span className={`tuner-arrow-indicator left ${isListening && detectedNote && centsOff > 5 ? 'sharp' : ''} ${isListening && detectedNote && tuningStatus === 'in-tune' ? 'in-tune' : ''}`}>
              {'<'}
            </span>
            <div className={`tuner-detected-note ${isListening && detectedNote ? tuningStatus : ''}`}>
              {isListening ? formatNote(detectedNote) : '--'}
            </div>
            <span className={`tuner-arrow-indicator right ${isListening && detectedNote && centsOff < -5 ? 'flat' : ''} ${isListening && detectedNote && tuningStatus === 'in-tune' ? 'in-tune' : ''}`}>
              {'>'}
            </span>
          </div>
        </div>

        {/* Hidden YouTube player container */}
        <div ref={ytContainerRef} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} />

        <div id="minPlayed-input-div">
          <label className="form-label" style={{ textAlign: 'center' }}>practice duration</label>
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
              <p className="practice-input-arrow">{'> '}</p>
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

        {audioReady ? (
          <div className="yt-player-container" onTouchStart={(e) => e.stopPropagation()}>
            <div className="yt-player-widget">
              <span className="yt-time">{formatTime(currentTime)}</span>
              <input
                type="range"
                className="yt-progress"
                min={0}
                max={audioDuration || 1}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
              />
              <span className="yt-play-btn" onClick={togglePlay}>
                {isPlaying ? '||' : '>'}
              </span>
            </div>
            <input
              type="range"
              className="yt-volume"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
            />
          </div>
        ) : (
          <div className="yt-player-container">
            <div className="yt-player-widget" style={{ justifyContent: 'center' }}>
              <span className="yt-time">loading...</span>
            </div>
          </div>
        )}
        </div>
        <div className="practice-buttons">
          {onPass && (
            <button type="button" className="form__button" onClick={onPass}>
              Pass
            </button>
          )}
          <button type="submit" className="form__button">
            Save
          </button>
        </div>
      </form>

      {createPortal(
        <>
          <AnimatePresence>
            {fretboardOpen && (
              <motion.div
                className="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFretboardOpen(false)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {fretboardOpen && (
              <div className="fretboard-overlay" onClick={() => setFretboardOpen(false)}>
                <motion.div
                  className="fretboard-widget"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/images/fretboard.png" alt="Fretboard Notes" className="fretboard-image" />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      {createPortal(
        <>
          <AnimatePresence>
            {lyricsExpanded && (
              <motion.div
                className="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setLyricsExpanded(false)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {lyricsExpanded && (
              <div id="lyrics-suggest-overlay" onClick={() => setLyricsExpanded(false)}>
                <motion.div
                  id="lyrics-suggest-widget"
                  ref={lyricsWidgetRef}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="lyrics-suggest-close" style={{ right: 'auto', left: 14, textTransform: 'none', fontSize: '0.8em' }} onClick={() => setLyricsExpanded(false)}>X</span>
                  <div id="lyrics-suggest-preview" ref={lyricsPreviewRef}>
                    {song.lyrics.split(/\n\n+/).map((verse, i) => {
                      const lines = verse.split('\n');
                      const collapsed = [];
                      for (let j = 0; j < lines.length; j++) {
                        const line = lines[j];
                        if (collapsed.length && collapsed[collapsed.length - 1].text === line) {
                          collapsed[collapsed.length - 1].count++;
                        } else {
                          collapsed.push({ text: line, count: 1 });
                        }
                      }
                      return (
                        <p key={i} className="lyrics-suggest-text lyrics-verse">
                          {collapsed.map((l, k) => (
                            <span key={k}>
                              {l.text}{l.count > 1 && <span className="lyrics-repeat-count"> x{l.count}</span>}
                              {k < collapsed.length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </motion.div>
  );
}

export default PracticeView;
