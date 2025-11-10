import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Library.css';

function LibraryListView({
  songs,
  allSongs,
  searchQuery,
  setSearchQuery,
  sortState,
  sortReversed,
  sortMenuOpen,
  setSortMenuOpen,
  onSortSelect,
  onSelectSong,
  onQuickPractice
}) {
  const hasAnySongs = allSongs.length > 0;

  return (
    <motion.div
      id="library-view"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {hasAnySongs && (
        <>
          <input
            id="searchbar"
            className="input"
            type="text"
            max={45}
            placeholder="whatcha lookin for?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

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
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('status')}>status</p>
                  <p className="sort-menu-p-state" onClick={() => onSortSelect('difficulty')}>difficulty</p>
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
        </>
      )}

      <div id="library-table-container">
        {songs.length > 0 ? (
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
            {allSongs.length === 0 ? "You dont have any songs" : "Seen a new song?"}
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default LibraryListView;
