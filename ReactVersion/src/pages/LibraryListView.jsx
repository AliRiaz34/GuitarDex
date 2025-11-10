import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
            placeholder="Whatcha lookin for?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div id="sort-menu">
            <div id="sort-icon" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
              <p className="sort-p">↓↑</p>
            </div>

            {sortMenuOpen && (
              <div id="sort-menu-text-div">
                <p className="sort-menu-p-state" onClick={() => onSortSelect('recent')}>recent</p>
                <p className="sort-menu-p-state" onClick={() => onSortSelect('level')}>level</p>
                <p className="sort-menu-p-state" onClick={() => onSortSelect('status')}>status</p>
                <p className="sort-menu-p-state" onClick={() => onSortSelect('difficulty')}>difficulty</p>
              </div>
            )}

            {!sortMenuOpen && (
              <p className="sort-p-state" onClick={() => onSortSelect(sortState)}>
                {sortState} {sortReversed ? '↑' : '↓'}
              </p>
            )}
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
          <Link id="seen-a-new-song" to={`/songs/add?title=${encodeURIComponent(searchQuery)}`}>
            Seen a new song?
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default LibraryListView;
