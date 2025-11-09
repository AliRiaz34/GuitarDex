import './Library.css';

function SongDetailView({ song, onBack, onPractice }) {
  const xpPercent = song.level != null
    ? Math.min((song.xp / song.xpThreshold) * 100, 100)
    : 0;

  return (
    <div id="song-view">
      <div>
        <h2 id="title">{song.title}</h2>
        <div id="song-head-div-2">
          <h3 id="artistName">{song.artistName}</h3>
          {song.level != null && (
            <p id="duration">{song.songDuration} min</p>
          )}
        </div>
        {song.level == null && (
          <p id="empty-info-p">come on! learn the song already!</p>
        )}
      </div>

      {song.level != null && (
        <>
          <div id="song-xp-div">
            <p id="level">Lv {song.level}</p>
            <div id="xp-container">
              <div id="xp-bar" style={{ width: `${xpPercent}%` }}></div>
            </div>
            <p id="xp">XP {Math.floor(song.xp)} / {Math.floor(song.xpThreshold)}</p>
          </div>

          <div className="song-stats-grid">
            <div className="stat-item">
              <span className="stat-label">Status:</span>
              <span className="stat-value">{song.status.toUpperCase()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Difficulty:</span>
              <span className="stat-value">{song.difficulty.toUpperCase()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Playtime:</span>
              <span className="stat-value">
                {song.totalMinPlayed != null ? song.totalMinPlayed : 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Sessions:</span>
              <span className="stat-value">
                {song.totalSessions}
              </span>
            </div>
          </div>
        </>
      )}

      <div id="song-bottom-buttons-div">
        <button onClick={onBack}>BACK</button>
        <button onClick={onPractice}>PRACTICE</button>
      </div>
    </div>
  );
}

export default SongDetailView;
