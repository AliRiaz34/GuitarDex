import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import './Library.css';

let hasAnimatedLibrary = false;

function LibraryListView({
  songs,
  allSongs,
  isLoading,
  searchQuery,
  setSearchQuery,
  sortState,
  sortReversed,
  sortMenuOpen,
  setSortMenuOpen,
  onSortSelect,
  onSelectSong,
  onQuickPractice,
  onRandomSelect,
  scrollPositionRef,
  returnFromSong,
  onReturnAnimationDone
}) {
  const hasAnySongs = allSongs.length > 0;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const containerRef = useRef(null);

  // Restore scroll position when component mounts
  useEffect(() => {
    if (containerRef.current && scrollPositionRef.current) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [scrollPositionRef]);

  // Save scroll position when scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollPositionRef.current = container.scrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollPositionRef]);

  return (
    <motion.div
      id="library-view"
      initial={returnFromSong ? { opacity: 0, x: -20 } : hasAnimatedLibrary ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => { hasAnimatedLibrary = true; if (onReturnAnimationDone) onReturnAnimationDone(); }}
    >
      {hasAnySongs && (
        <>
          <div className="searchbar-container">
            <input
              id="searchbar"
              className="input"
              type="text"
              max={45}
              placeholder="whatcha lookin for?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {!searchQuery && !isSearchFocused && (
              <div className="custom-placeholder">
                whatcha lookin for<span className="blinking-question">?</span>
              </div>
            )}
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        </>
      )}

      <div id="library-table-container" ref={containerRef}>
        {hasAnySongs && (
          <div id="sort-menu">
            <div id="sort-icon" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
              <p className="sort-p">↓↑</p>
            </div>

            <AnimatePresence mode="wait">
              {sortMenuOpen ? (
                <motion.div
                  id="sort-menu-text-div"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('recent')}>recent</p>
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('level')}>level</p>
                </motion.div>
              ) : (
                <motion.p
                  className="sort-p-state"
                  onClick={() => onSortSelect(sortState)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {sortState} {sortReversed ? '↑' : '↓'}
                </motion.p>
              )}
            </AnimatePresence>

          </div>
        )}

        {isLoading ? null : songs.length > 0 ? (
          <table id="library-table">
            <tbody>
              {songs.map((song, index) => (
                <motion.tr
                  key={song.songId}
                  className="song-tr"
                  initial={!hasAnimatedLibrary && index < 10 ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={!hasAnimatedLibrary && index < 10 ? {
                    duration: 0.4,
                    ease: 'easeOut',
                    delay: index * 0.05,
                  } : { duration: 0 }}
                >
                  <td className="song-td" onClick={() => onSelectSong(song)}>
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artistName}</div>
                  </td>
                  <td className="song-td-lv" onClick={() => onQuickPractice(song)}>
                    {song.level != null ? `Lv ${song.level}` : '???'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Link
            id="seen-a-new-song"
            className={allSongs.length === 0 ? "empty-library" : ""}
            to={`/songs/add?title=${encodeURIComponent(searchQuery)}`}
          >
            {allSongs.length === 0 ? "spot some songs silly" : "seen a new song?"}
          </Link>
        )}
      </div>

      {hasAnySongs && songs.length > 0 && (
        <button id="library-practice-button" onClick={onRandomSelect}>
          random
        </button>
      )}
    </motion.div>
  );
}

export default LibraryListView;
