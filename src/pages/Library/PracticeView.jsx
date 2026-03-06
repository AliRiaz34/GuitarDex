import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTuner, calculateTargetFrequencies, getTuningStatus } from '../../utils/tunerUtils';
import { getAccessToken, isSpotifyConnected, isSpotifyConnectedAsync, loginWithSpotify, searchTrack } from '../../utils/spotify';
import './Library.css';

function PracticeView({ song, onSubmit, onBack, onGoToSong, onPass }) {
  const [minPlayed, setMinPlayed] = useState(song.songDuration || "");
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [selectedMinButton, setSelectedMinButton] = useState(null);
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [fretboardOpen, setFretboardOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);


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

  // Spotify Web Playback SDK
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const progressInterval = useRef(null);
  const [spotifyConnected, setSpotifyConnected] = useState(isSpotifyConnected());

  // Check connection: sync first, then async (fetches from Supabase on new devices)
  useEffect(() => {
    isSpotifyConnectedAsync().then(setSpotifyConnected);
    const check = () => setSpotifyConnected(isSpotifyConnected());
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  useEffect(() => {
    if (!spotifyConnected) return;
    let cancelled = false;

    async function initSpotify() {
      const token = await getAccessToken();
      if (!token || cancelled) return;

      // Load SDK script if needed
      if (!window.Spotify) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        document.head.appendChild(script);
        await new Promise(resolve => {
          window.onSpotifyWebPlaybackSDKReady = resolve;
        });
      }
      if (cancelled) return;

      const player = new window.Spotify.Player({
        name: 'GuitarDex',
        getOAuthToken: async cb => cb(await getAccessToken()),
        volume: 0.5,
      });

      player.addListener('ready', async ({ device_id }) => {
        if (cancelled) return;
        deviceIdRef.current = device_id;
        setAudioReady(true);

        // Search and play the song
        const uri = await searchTrack(song.title, song.artistName);
        if (uri && !cancelled) {
          const t = await getAccessToken();
          await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [uri] }),
          });
        }
      });

      player.addListener('player_state_changed', (state) => {
        if (!state || cancelled) return;
        const playing = !state.paused;
        setIsPlaying(playing);
        setCurrentTime(state.position / 1000);
        setAudioDuration(state.duration / 1000);

        clearInterval(progressInterval.current);
        if (playing) {
          progressInterval.current = setInterval(() => {
            player.getCurrentState().then(s => {
              if (s) setCurrentTime(s.position / 1000);
            });
          }, 500);
        }
      });

      player.connect();
      playerRef.current = player;
    }

    initSpotify();

    return () => {
      cancelled = true;
      clearInterval(progressInterval.current);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [song.title, song.artistName, spotifyConnected]);

  const togglePlay = () => {
    if (!playerRef.current || !audioReady) return;
    playerRef.current.togglePlay();
  };

  const handleSeek = (e) => {
    const ms = parseFloat(e.target.value) * 1000;
    if (playerRef.current) {
      playerRef.current.seek(ms);
      setCurrentTime(ms / 1000);
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
            {!spotifyConnected && (
              <svg className="spotify-connect-icon" onClick={loginWithSpotify} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
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

        {spotifyConnected && (
          audioReady ? (
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
          ) : (
            <div className="yt-player-widget" style={{ justifyContent: 'center' }}>
              <span className="yt-time">loading...</span>
            </div>
          )
        )}

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
        {song.lyrics && (
          <div className={`song-lyrics-display ${song.lyrics.split('\n').length > 6 ? 'has-toggle' : ''}`}>
            <p className="lyrics-text lyrics-truncated">{song.lyrics}</p>
            {song.lyrics.split('\n').length > 6 && (
              <span className="lyrics-show-more" onClick={() => setLyricsExpanded(true)}>
                <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}>^</span>
              </span>
            )}
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
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div id="lyrics-suggest-preview">
                    <p className="lyrics-suggest-text">{song.lyrics}</p>
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
