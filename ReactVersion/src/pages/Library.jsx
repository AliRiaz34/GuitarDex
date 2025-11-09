import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PracticeView from './PracticeView';
import SongDetailView from './SongDetailView';
import LibraryListView from './LibraryListView';
import './Library.css';

function Library() {
  const location = useLocation();
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [sortState, setSortState] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Add Practice view state
  const [practiceView, setPracticeView] = useState(null); // { song, fromSongView }

  // Fetch songs
  useEffect(() => {
    fetch('/songs')
      .then(response => response.json())
      .then(songsInfo => {
        setSongs(songsInfo);
      })
      .catch(error => console.error('Error fetching songs:', error));
  }, []);

  // Handle navigation state (new song from AddSong, or reset from nav button)
  useEffect(() => {
    if (location.state?.newSong) {
      // New song added - add to list and show detail view
      const newSong = location.state.newSong;
      setSongs(prevSongs => [newSong, ...prevSongs]);
      setSelectedSong(newSong);
      setPracticeView(null);
    } else if (location.pathname === '/library') {
      // Nav button clicked - reset to list view
      setPracticeView(null);
      setSelectedSong(null);
    }
  }, [location]);

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

  const openPracticeView = (song, fromSongView = false) => {
    setPracticeView({ song, fromSongView });
  };

  const handlePracticeSubmit = async ({ minPlayed, songDuration }) => {
    const song = practiceView.song;

    try {
      const response = await fetch(`/practices/add/${song.songId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          minPlayed: minPlayed,
          songDuration: songDuration,
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the song in our songs list
        setSongs(prevSongs => prevSongs.map(s =>
          s.songId === song.songId ? data.updatedSong : s
        ));
        // Close practice view and show updated song detail if from song view
        setPracticeView(null);
        if (practiceView.fromSongView) {
          setSelectedSong(data.updatedSong);
        }
      } else {
        alert("Error adding practice");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding practice");
    }
  };

  const handlePracticeBack = () => {
    if (practiceView.fromSongView) {
      // Return to song detail view
      setSelectedSong(practiceView.song);
    }
    // Close practice view
    setPracticeView(null);
  };

  // Add Practice View
  if (practiceView) {
    return (
      <PracticeView
        song={practiceView.song}
        onSubmit={handlePracticeSubmit}
        onBack={handlePracticeBack}
      />
    );
  }

  // Song Detail View
  if (selectedSong) {
    return (
      <SongDetailView
        song={selectedSong}
        onBack={() => setSelectedSong(null)}
        onPractice={() => openPracticeView(selectedSong, true)}
      />
    );
  }

  // Library List View
  return (
    <LibraryListView
      songs={sortedSongs}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      sortState={sortState}
      sortMenuOpen={sortMenuOpen}
      setSortMenuOpen={setSortMenuOpen}
      onSortSelect={handleSortSelect}
      onSelectSong={setSelectedSong}
      onQuickPractice={openPracticeView}
    />
  );
}

export default Library;
