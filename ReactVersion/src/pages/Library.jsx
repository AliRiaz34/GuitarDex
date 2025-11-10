import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
  const [sortReversed, setSortReversed] = useState(false);
  const [entryDirection, setEntryDirection] = useState(null); // Track animation direction

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
    } else if (location.pathname === '/library' || location.pathname === '/') {
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
    let result = 0;

    if (sortState === 'recent') {
      // Use the more recent date between addDate and lastPracticeDate
      const aRecentDate = Math.max(
        new Date(a.addDate).getTime(),
        new Date(a.lastPracticeDate).getTime()
      );
      const bRecentDate = Math.max(
        new Date(b.addDate).getTime(),
        new Date(b.lastPracticeDate).getTime()
      );
      result = bRecentDate - aRecentDate;
    } else if (sortState === 'level') {
      const aSeen = a.status === 'seen';
      const bSeen = b.status === 'seen';
      if (aSeen && !bSeen) result = 1;
      else if (!aSeen && bSeen) result = -1;
      else result = a.level - b.level;
    } else if (sortState === 'status') {
      // Status priority: seen -> learning -> stale -> mastered
      const statusOrder = { seen: 0, learning: 1, stale: 2, mastered: 3 };
      const aOrder = statusOrder[a.status] ?? 99;
      const bOrder = statusOrder[b.status] ?? 99;

      if (aOrder !== bOrder) {
        result = aOrder - bOrder;
      } else {
        // If same status, sort by addDate for seen, or level for others
        if (a.status === 'seen' && b.status === 'seen') {
          result = new Date(a.addDate) - new Date(b.addDate);
        } else {
          result = a.level - b.level;
        }
      }
    } else if (sortState === 'difficulty') {
      const difficultyConv = { easy: 1, normal: 2, hard: 3 };
      result = difficultyConv[a.difficulty] - difficultyConv[b.difficulty];
    }

    // Apply reverse if needed
    return sortReversed ? -result : result;
  });

  const handleSortSelect = (newSort) => {
    if (newSort === sortState) {
      // Toggle reverse if clicking the same sort
      setSortReversed(!sortReversed);
    } else {
      // New sort selected, reset to not reversed
      setSortState(newSort);
      setSortReversed(false);
    }
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
          // Pass both old and new song data for animation
          setSelectedSong({
            ...data.updatedSong,
            _previousXp: song.xp,
            _previousLevel: song.level
          });
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

  const handleSongDelete = (songId) => {
    // Remove song from the list
    setSongs(prevSongs => prevSongs.filter(s => s.songId !== songId));
    // Close the song detail view
    setSelectedSong(null);
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
    // Find current song index in sortedSongs
    const currentIndex = sortedSongs.findIndex(s => s.songId === selectedSong.songId);

    const handleNavigateSong = (direction) => {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < sortedSongs.length) {
        // Set entry direction based on swipe direction
        // direction = 1 means next (swipe up), so animate from bottom ('up')
        // direction = -1 means previous (swipe down), so animate from top ('down')
        setEntryDirection(direction > 0 ? 'up' : 'down');
        setSelectedSong(sortedSongs[newIndex]);
      }
    };

    return (
      <AnimatePresence mode="wait">
        <SongDetailView
          key={selectedSong.songId}
          song={selectedSong}
          onBack={() => setSelectedSong(null)}
          onPractice={() => openPracticeView(selectedSong, true)}
          onDelete={handleSongDelete}
          onNavigate={handleNavigateSong}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sortedSongs.length - 1}
          entryDirection={entryDirection}
        />
      </AnimatePresence>
    );
  }

  // Library List View
  return (
    <LibraryListView
      songs={sortedSongs}
      allSongs={songs}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      sortState={sortState}
      sortReversed={sortReversed}
      sortMenuOpen={sortMenuOpen}
      setSortMenuOpen={setSortMenuOpen}
      onSortSelect={handleSortSelect}
      onSelectSong={(song) => {
        setEntryDirection(null); // Reset direction when selecting from list
        setSelectedSong(song);
      }}
      onQuickPractice={openPracticeView}
    />
  );
}

export default Library;
