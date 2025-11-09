import { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import './AddPractice.css';


function AddPractice() {
  const [minPlayed, setMinPlayed] = useState("");
  const [songDuration, setSongDuration] = useState("");
  const { songId } = useParams();
  const [songInfo, setSongInfo] = useState({}); 
  const navigate = useNavigate();


  // songId will be a string, convert to number if needed
  const id = parseInt(songId, 10);

  useEffect(() => {
    fetch(`/songs/${songId}/info`)
        .then(response => response.json())
        .then(songInfo => {
          setSongInfo(songInfo);
        })
        .catch(error => console.error('Error fetching song info:', error));
    }, [songId]);

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation (matching Flask version)
    if (minPlayed > 999) {
      alert("Thats too long dawg.");
      return;
    }

    // Use existing songDuration if status isnt "seen", otherwise validate user input
    const finalSongDuration = songInfo.status !== "seen" ? songInfo.songDuration : songDuration;

    if (songInfo.status === "seen" && (songDuration > 999 || songDuration < 1)) {
      alert("Invalid song duration G.");
      return;
    }

    try {
      const response = await fetch(`/practices/add/${songId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          minPlayed: minPlayed,
          songDuration: finalSongDuration,
        })
      });

      if (response.ok) {
        // Redirect to library after successful add (matching Flask behavior)
        navigate('/library');
      } else {
        alert("Error adding practice");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding practice");
    }
  }

  return (
    <div>
      <h1 id="song-practice-title">{songInfo.title}</h1>
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
          {songInfo.songDuration === null && (
            <div id="duration-div">
              <label className="form-label">How many minutes is the song?</label>
              <div className="quick-select-button-div">
                <button onClick={() => setSongDuration("3")} type="button" className="quick-select-button">3</button>
                <p className="between-button-line"> |</p>
                <button onClick={() => setSongDuration("4")} type="button" className="quick-select-button">4</button>
                <p className="between-button-line">|</p>              
                <button onClick={() => setSongDuration("5")} type="button" className="quick-select-button">5</button>
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
          <button type="submit" className="form__button">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPractice;