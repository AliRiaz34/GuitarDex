import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { exportAllData, importAllData } from '../../utils/db';
import './Library.css';

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
  scrollPositionRef
}) {
  const hasAnySongs = allSongs.length > 0;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const containerRef = useRef(null);
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleBackup = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `guitardex-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMenuOpen(false);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('backup failed');
    }
  };

  const handleRestore = () => {
    fileInputRef.current?.click();
    setBackupMenuOpen(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      window.location.reload();
    } catch (error) {
      console.error('Restore failed:', error);
      alert('restore failed — invalid file');
    }
    e.target.value = '';
  };

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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
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

            <div className="backup-menu-container">
              <p className="backup-icon" onClick={() => setBackupMenuOpen(!backupMenuOpen)}>···</p>
              <AnimatePresence>
                {backupMenuOpen && (
                  <>
                    <div className="menu-backdrop" onClick={() => setBackupMenuOpen(false)} />
                    <motion.div
                      className="backup-dropdown"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <p className="song-menu-option" onClick={handleBackup}>backup</p>
                      <p className="song-menu-option" onClick={handleRestore}>restore</p>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {isLoading ? (
          <div id="seen-a-new-song" className="empty-library">
            loading...
          </div>
        ) : songs.length > 0 ? (
          <table id="library-table">
            <tbody>
              {songs.map(song => (
                <tr key={song.songId} className="song-tr">
                  <td className="song-td" onClick={() => onSelectSong(song)}>
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artistName}</div>
                  </td>
                  <td className="song-td-lv" onClick={() => onQuickPractice(song)}>
                    {song.level != null ? `Lv ${song.level}` : '???'}
                  </td>
                </tr>
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
