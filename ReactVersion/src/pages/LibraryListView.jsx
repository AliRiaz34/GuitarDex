import { Link } from 'react-router-dom';
import './Library.css';

function LibraryListView({
  songs,
  searchQuery,
  setSearchQuery,
  sortState,
  sortMenuOpen,
  setSortMenuOpen,
  onSortSelect,
  onSelectSong,
  onQuickPractice
}) {
  return (
    <div id="library-view">
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
          <p className="sort-p">↑</p>
          <p className="sort-p">↓</p>
        </div>

        {sortMenuOpen && (
          <div id="sort-menu-text-div">
            <p className="sort-menu-p-state" onClick={() => onSortSelect('recent')}>recent</p>
            <p className="sort-menu-p-state" onClick={() => onSortSelect('level')}>level</p>
            <p className="sort-menu-p-state" onClick={() => onSortSelect('status')}>status</p>
            <p className="sort-menu-p-state" onClick={() => onSortSelect('easy')}>easy</p>
            <p className="sort-menu-p-state" onClick={() => onSortSelect('hard')}>hard</p>
          </div>
        )}

        {!sortMenuOpen && (
          <p className="sort-p-state">{sortState}</p>
        )}
      </div>

      <table id="library-table">
        <tbody>
          {songs.length > 0 ? (
            songs.map(song => (
              <tr key={song.songId} className="song-tr">
                <td className="song-td" onClick={() => onSelectSong(song)}>
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artistName}</div>
                </td>
                <td className="song-td-lv" onClick={() => onQuickPractice(song)}>
                  {song.level != null ? `Lv ${song.level}` : '???'}
                </td>
                <td className="song-td-qprac" onClick={() => onQuickPractice(song)}>
                  +
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td>
                <Link to={`/songs/add?title=${encodeURIComponent(searchQuery)}`}>Seen a new song?</Link>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default LibraryListView;
