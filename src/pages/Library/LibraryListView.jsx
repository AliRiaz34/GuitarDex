import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  onReturnAnimationDone,
  selectMode,
  selectedSongIds,
  onToggleSelect,
  onActivateSelectMode,
  onDeactivateSelectMode,
  getDecksForSelect,
  onBatchToggleDeck
}) {
  const hasAnySongs = allSongs.length > 0;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

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
              <div className="library-placeholder">
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

            <div className="select-toggle-area">
              <AnimatePresence mode="wait">
                {selectMode ? (
                  <motion.div
                    key="select-actions"
                    className="select-actions"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <img
                      className="select-add-icon"
                      src="./images/addToDeckIcon.png"
                      alt="Add to deck"
                      onClick={() => {
                        if (selectedSongIds.size > 0) setDeckMenuOpen(true);
                      }}
                      style={{ opacity: selectedSongIds.size > 0 ? 1 : 0.3 }}
                    />
                    <span className="select-close" onClick={onDeactivateSelectMode}>x</span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="select-standby"
                    className="select-standby"
                    onClick={onActivateSelectMode}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    §
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {isLoading ? null : songs.length > 0 ? (
          <table id="library-table">
            <tbody>
              <AnimatePresence>
                {songs.map((song, index) => {
                  const isInitialLoad = !hasAnimatedLibrary && index < 11;
                  const isNewWhileMounted = hasAnimatedLibrary && hasMountedRef.current;

                  return (
                    <motion.tr
                      key={song.songId}
                      className={`song-tr${selectMode && selectedSongIds.has(song.songId) ? ' selected' : ''}`}
                      layout
                      initial={
                        isInitialLoad
                          ? { opacity: 0 }
                          : isNewWhileMounted
                            ? { opacity: 0, y: -8 }
                            : false
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={
                        isInitialLoad
                          ? { duration: 0.4, ease: 'easeOut', delay: index * 0.05 }
                          : { duration: 0.25, ease: 'easeOut' }
                      }
                      onClick={selectMode ? () => onToggleSelect(song.songId) : undefined}
                    >
                      <td className="song-td" onClick={selectMode ? undefined : () => onSelectSong(song)}>
                        <div className="song-title">{song.title}</div>
                        <div className="song-artist">{song.artistName}</div>
                      </td>
                      <td className="song-td-lv" onClick={selectMode ? undefined : () => onQuickPractice(song)}>
                        {song.level != null ? `Lv ${song.level}` : '???'}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
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

      {createPortal(
        <>
          <AnimatePresence>
            {deckMenuOpen && (
              <motion.div
                className="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setDeckMenuOpen(false)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {deckMenuOpen && (
              <motion.div
                id="addToDeck-menu-dropdown"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {(() => {
                  const deckList = getDecksForSelect();
                  return deckList.length > 0 ? (
                    deckList.map(deck => (
                      <div
                        key={deck.deckId}
                        className="deck-menu-item"
                        onClick={() => {
                          onBatchToggleDeck(deck.deckId, deck.containsSong);
                          setDeckMenuOpen(false);
                        }}
                      >
                        <span className="deck-menu-title">{deck.title}</span>
                        <img
                          src={deck.containsSong ? './images/addedIcon.png' : './images/addToDeckIcon.png'}
                          alt={deck.containsSong ? 'Remove' : 'Add'}
                          className="deck-menu-icon"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="deck-menu-empty">No decks yet</p>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </motion.div>
  );
}

export default LibraryListView;
