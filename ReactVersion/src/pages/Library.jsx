import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Library.css';

function Library() {
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [sortState, setSortState] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Fetch songs
  useEffect(() => {
    fetch('/songs')
      .then(response => response.json())
      .then(songsInfo => {
        setSongs(songsInfo);
      })
      .catch(error => console.error('Error fetching songs:', error));
  }, []);

  // Filter songs based on search
  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artistName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort songs
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortState === 'recent') {
      return new Date(b.lastPracticeDate) - new Date(a.lastPracticeDate);
    } else if (sortState === 'level') {
      const aSeen = a.status === 'seen';
      const bSeen = b.status === 'seen';
      if (aSeen && !bSeen) return 1;
      if (!aSeen && bSeen) return -1;
      return b.level - a.level;
    } else if (sortState === 'status') {
      // Status priority: seen -> learning -> stale -> mastered
      const statusOrder = { seen: 0, learning: 1, stale: 2, mastered: 3 };
      const aOrder = statusOrder[a.status] ?? 99;
      const bOrder = statusOrder[b.status] ?? 99;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // If same status, sort by addDate for seen, or level for others
      if (a.status === 'seen' && b.status === 'seen') {
        return new Date(a.addDate) - new Date(b.addDate);
      }
      return a.level - b.level;
    } else if (sortState === 'easy') {
      const difficultyConv = { easy: 1, normal: 2, hard: 3 };
      return difficultyConv[a.difficulty] - difficultyConv[b.difficulty];
    } else if (sortState === 'hard') {
      const difficultyConv = { easy: 1, normal: 2, hard: 3 };
      return difficultyConv[b.difficulty] - difficultyConv[a.difficulty];
    }
    return 0;
  });

  const handleSortSelect = (newSort) => {
    setSortState(newSort);
    setSortMenuOpen(false);
  };

  if (selectedSong) {
    // Song detail view
    const xpPercent = selectedSong.level != null
      ? Math.min((selectedSong.xp / selectedSong.xpThreshold) * 100, 100)
      : 0;

    return (
      <div id="song-view">
        <div>
          <h2 id="title">{selectedSong.title}</h2>
          <div id="song-head-div-2">
            <h3 id="artistName">{selectedSong.artistName}</h3>
            {selectedSong.level != null && (
              <p id="duration">{selectedSong.songDuration} min</p>
            )}
          </div>
          {selectedSong.level == null && (
            <p id="empty-info-p">come on! learn the song already!</p>
          )}
        </div>

        {selectedSong.level != null && (
          <>
            <div id="song-xp-div">
              <p id="level">Lv {selectedSong.level}</p>
              <div id="xp-container">
                <div id="xp-bar" style={{ width: `${xpPercent}%` }}></div>
              </div>
              <p id="xp">XP {Math.floor(selectedSong.xp)} / {Math.floor(selectedSong.xpThreshold)}</p>
            </div>

            <div className="song-stats-grid">
              <div className="stat-item">
                <span className="stat-label">Status:</span>
                <span className="stat-value">{selectedSong.status.toUpperCase()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Difficulty:</span>
                <span className="stat-value">{selectedSong.difficulty.toUpperCase()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Playtime:</span>
                <span className="stat-value">
                  {selectedSong.totalMinPlayed != null ? selectedSong.totalMinPlayed : 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Sessions:</span>
                <span className="stat-value">
                  {selectedSong.totalSessions}
                </span>
              </div>
            </div>
          </>
        )}

        <div id="song-bottom-buttons-div">
          <button onClick={() => setSelectedSong(null)}>BACK</button>
          <button>
            <Link to={`/practices/add/${selectedSong.songId}`} id="practice-button-link">
              PRACTICE
            </Link>
          </button>
        </div>
      </div>
    );
  }

  // Library view
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
            <p className="sort-menu-p-state" onClick={() => handleSortSelect('recent')}>recent</p>
            <p className="sort-menu-p-state" onClick={() => handleSortSelect('level')}>level</p>
            <p className="sort-menu-p-state" onClick={() => handleSortSelect('status')}>status</p>
            <p className="sort-menu-p-state" onClick={() => handleSortSelect('easy')}>easy</p>
            <p className="sort-menu-p-state" onClick={() => handleSortSelect('hard')}>hard</p>
          </div>
        )}

        {!sortMenuOpen && (
          <p className="sort-p-state">{sortState}</p>
        )}
      </div>

      <table id="library-table">
        <tbody>
          {sortedSongs.length > 0 ? (
            sortedSongs.map(song => (
              <tr key={song.songId} className="song-tr">
                <td className="song-td" onClick={() => setSelectedSong(song)}>
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artistName}</div>
                </td>
                <td className="song-td-lv">
                  {song.level != null ? <Link to={`/practices/add/${song.songId}`}>Lv {song.level}</Link> : <Link to={`/practices/add/${song.songId}`}>???</Link>}
                </td>
                <td className="song-td-qprac">
                  <Link to={`/practices/add/${song.songId}`}>+</Link>
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

export default Library;
