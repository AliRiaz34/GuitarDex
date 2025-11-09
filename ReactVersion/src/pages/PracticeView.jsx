import { useState } from 'react';
import './AddPractice.css';

function PracticeView({ song, onSubmit, onBack }) {
  const [minPlayed, setMinPlayed] = useState("");
  const [songDuration, setSongDuration] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (minPlayed > 999) {
      alert("Thats too long dawg.");
      return;
    }

    const finalSongDuration = song.songDuration !== null ? song.songDuration : songDuration;


    if (song.status === "seen" && (songDuration > 999 || songDuration < 1)) {
      alert("Invalid song duration G.");
      return;
    }

    console.log(finalSongDuration);
    onSubmit({ minPlayed, songDuration: finalSongDuration });
  };

  return (
    <div>
      <h1 id="song-practice-title">{song.title}</h1>
      <form onSubmit={handleSubmit}>
        <div id="minPlayed-input-div">
          <label className="form-label">How many minutes did you play? </label>
          <div className="quick-select-button-div">
            <button onClick={() => setMinPlayed(15)} type="button" className="quick-select-button">15</button>
            <p className="between-button-line">|</p>
            <button onClick={() => setMinPlayed(30)} type="button" className="quick-select-button">30</button>
            <p className="between-button-line">|</p>
            <button onClick={() => setMinPlayed(45)} type="button" className="quick-select-button">45</button>
            <p className="between-button-line">|</p>
            <button onClick={() => setMinPlayed(60)} type="button" className="quick-select-button">60</button>
          </div>
          <input
            type="number"
            className="practice-input"
            id="minPlayed-input"
            value={minPlayed}
            onChange={(e) => setMinPlayed(e.target.value)}
            placeholder="..."
            min="1"
            max="999"
            required
          />
        </div>
        {song.songDuration === null && (
          <div id="duration-div">
            <label className="form-label">How many minutes is the song?</label>
            <div className="quick-select-button-div">
              <button onClick={() => setSongDuration(3)} type="button" className="quick-select-button">3</button>
              <p className="between-button-line"> |</p>
              <button onClick={() => setSongDuration(4)} type="button" className="quick-select-button">4</button>
              <p className="between-button-line">|</p>
              <button onClick={() => setSongDuration(5)} type="button" className="quick-select-button">5</button>
            </div>
            <input
              type="number"
              className="practice-input"
              id="songDuration-input"
              value={songDuration}
              onChange={(e) => setSongDuration(e.target.value)}
              placeholder="..."
              min="0"
              max="30"
              required
            />
          </div>
        )}
        <div className="save-div">
          <button type="button" onClick={onBack}>
            BACK
          </button>
          <button type="submit" className="form__button">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default PracticeView;
