import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import PlaylistListView from './PlaylistListView';
import PlaylistDetailView from './PlaylistDetailView';
import { getAllPlaylists } from '../../utils/db';
import './Playlist.css';

function Playlist() {
  const location = useLocation();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [sortState, setSortState] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortReversed, setSortReversed] = useState(false);
  const [entryDirection, setEntryDirection] = useState(null); // Track animation direction

  // Add Practice view state
  const [playlistDetailView, setPlaylistDetailView] = useState(null); // { song, fromSongView }

  // Swipe gesture detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  useEffect(() => {
    // Only enable swipe on list view (not on song detail, practice view, or edit view)
    if (selectedPlaylist || playlistDetailView) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const deltaX = touchStartX.current - touchEndX.current;
      const deltaY = touchStartY.current - touchEndY.current;
      const minSwipeDistance = 50;

      // Check if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Swipe right - navigate to AddSong
        if (deltaX < 0) {
          navigate('/library');
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [selectedPlaylist, playlistDetailView, navigate]);

  // Fetch songs from IndexedDB
  useEffect(() => {
    async function loadPlaylists() {
      try {
        const playlistsInfo = await getAllPlaylists();

        setPlaylists(playlistsInfo);
      } catch (error) {
        console.error('Error loading playlists:', error);
      }
    }
    loadPlaylists();
  }, []);

  // Handle navigation state (new playlist from PlaylistAddView, or reset from nav button)
  useEffect(() => {
    if (location.state?.newPlaylist) {
      // New song added - add to list and show detail view
      const newPlaylist = location.state.newPlaylist;
      setPlaylists(prevPlaylists => [newPlaylist, ...prevPlaylists]);
      setSelectedPlaylist(newPlaylist);
    } else if (location.pathname === '/playlist') {
      // Nav button clicked - reset to list view
      setSelectedPlaylist(null);
    }
  }, [location]);

  // Filter playlist based on search
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort songs
  const sortedPlaylists = [...filteredPlaylists].sort((a, b) => {
    let result = 0;

    if (sortState === 'recent') {
      // Use the more recent date between addDate and lastPracticeDate
      const aRecentDate = Math.max(
        new Date(a.creationDate).getTime()
      );
      const bRecentDate = Math.max(
        new Date(b.creationDate).getTime(),
      );
      result = bRecentDate - aRecentDate;
    } else if (sortState === 'level') {
      //average level of songs
      result = a.level - b.level;
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

  const handlePlaylistDelete = (playlistId) => {
    // Remove playlist from the list
    setPlaylists(prevPlaylists => prevPlaylists.filter(p => p.playlistId !== playlistId));
    // Close the playlist detail view
    setSelectedPlaylist(null);
  };

  // Playlist Detail View
  if (selectedPlaylist) {
    // Find current playlist index in sortedPlaylists
    const currentIndex = sortedPlaylists.findIndex(p => p.playlistId === selectedPlaylist.playlistId);

    const handleNavigatePlaylist = (direction) => {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < sortedPlaylists.length) {
        setEntryDirection(direction > 0 ? 'up' : 'down');
        setSelectedPlaylist(sortedPlaylists[newIndex]);
      }
    };

    return (
      <AnimatePresence mode="wait">
        <PlaylistDetailView
          key={selectedPlaylist.playlistId}
          playlist={selectedPlaylist}
          onBack={() => setSelectedPlaylist(null)}
          onDelete={handlePlaylistDelete}
          onNavigate={handleNavigatePlaylist}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sortedPlaylists.length - 1}
          entryDirection={entryDirection}
        />
      </AnimatePresence>
    );
  }

  // Playlist List View
  return (
    <PlaylistListView
      playlists={sortedPlaylists}
      allPlaylists={playlists}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      sortState={sortState}
      sortReversed={sortReversed}
      sortMenuOpen={sortMenuOpen}
      setSortMenuOpen={setSortMenuOpen}
      onSortSelect={handleSortSelect}
      onSelectPlaylist={(playlist) => {
        setEntryDirection(null);
        setSelectedPlaylist(playlist);
      }}
    />
  );
}

export default Playlist;
