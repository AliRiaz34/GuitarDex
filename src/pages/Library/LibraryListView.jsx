import { Link, useNavigate } from 'react-router-dom';
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
  selectionMode,
  setSelectionMode,
  selectedSongIds,
  onToggleSelect,
  onExitSelection,
  showDeckPicker,
  setShowDeckPicker,
  playlists,
  onBulkAddToDeck,
  onCreateDeckWithSongs
}) {
  const navigate = useNavigate();
  const hasAnySongs = allSongs.length > 0;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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
          <div className="searchbar-container" onClick={() => document.getElementById('searchbar').focus()}>
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

            <p
              className={`selection-toggle${selectionMode ? ' active' : ''}`}
              onClick={() => selectionMode ? onExitSelection() : setSelectionMode(true)}
            >
              select
            </p>
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
                      className="song-tr"
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
                    >
                      <td
                        className={`song-td${selectionMode ? ' selectable' : ''}${selectedSongIds.has(song.songId) ? ' selected' : ''}`}
                        onClick={() => selectionMode ? onToggleSelect(song.songId) : onSelectSong(song)}
                      >
                        <div className="song-title">{song.title}</div>
                        <div className="song-artist">{song.artistName}</div>
                      </td>
                      <td className="song-td-lv" onClick={() => selectionMode ? onToggleSelect(song.songId) : onQuickPractice(song)}>
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

      <AnimatePresence mode="wait">
        {hasAnySongs && songs.length > 0 && !selectionMode && (
          <motion.button
            key="random"
            id="library-practice-button"
            onClick={onRandomSelect}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            random
          </motion.button>
        )}

        {selectionMode && selectedSongIds.size > 0 && (
          <motion.button
            key="add-to-deck"
            id="library-practice-button"
            className="add-to-deck-btn"
            onClick={() => setShowDeckPicker(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            add to deck ({selectedSongIds.size})
          </motion.button>
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {showDeckPicker && (
            <>
              <motion.div
                className="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setShowDeckPicker(false)}
              />
              <motion.div
                id="addToDeck-menu-dropdown"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {playlists && playlists.length > 0 && (
                  playlists.map(deck => (
                    <div
                      key={deck.deckId}
                      className="deck-menu-item"
                      onClick={() => onBulkAddToDeck(deck.deckId)}
                    >
                      <span className="deck-menu-title">{deck.title}</span>
                      <img
                        src="./images/addToDeckIcon.png"
                        alt="Add"
                        className="deck-menu-icon"
                      />
                    </div>
                  ))
                )}
                <div
                  className="deck-menu-item deck-menu-create"
                  onClick={() => {
                    const songIds = [...selectedSongIds];
                    setShowDeckPicker(false);
                    onExitSelection();
                    navigate('/deck', { state: { pendingSongIds: songIds } });
                  }}
                >
                  <span className="deck-menu-title">+ new deck</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

    </motion.div>
  );
}

export default LibraryListView;
