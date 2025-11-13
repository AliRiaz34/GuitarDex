import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { deletePlaylist, getSongsInPlaylist, getSongById, removeSongFromPlaylist } from '../../utils/db';
import './Playlist.css';

function PlaylistDetailView({ playlist, onBack, onDelete, onNavigate, hasPrevious, hasNext, entryDirection }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  // Load songs in playlist
  useEffect(() => {
    async function loadPlaylistSongs() {
      try {
        setLoading(true);
        const playlistSongs = await getSongsInPlaylist(playlist.playlistId);

        // Fetch full song details for each song in playlist
        const songDetails = await Promise.all(
          playlistSongs.map(async (ps) => {
            const song = await getSongById(ps.songId);
            return { ...song, playlistSongId: ps.id, order: ps.order };
          })
        );

        setSongs(songDetails.filter(s => s.songId)); // Filter out any null songs
        setLoading(false);
      } catch (error) {
        console.error('Error loading playlist songs:', error);
        setLoading(false);
      }
    }

    loadPlaylistSongs();
  }, [playlist.playlistId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  const handleDelete = async () => {
    try {
      await deletePlaylist(playlist.playlistId);
      onDelete(playlist.playlistId);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Failed to delete playlist');
    }
  };

  const handleRemoveSong = async (songId) => {
    try {
      await removeSongFromPlaylist(playlist.playlistId, songId);
      setSongs(prevSongs => prevSongs.filter(s => s.songId !== songId));
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      alert('Failed to remove song from playlist');
    }
  };

  // Animation variants
  const containerVariants = {
    initial: (direction) => ({
      y: direction === 'up' ? '100%' : direction === 'down' ? '-100%' : 0,
      opacity: direction ? 0 : 1
    }),
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    exit: (direction) => ({
      y: direction === 'up' ? '-100%' : direction === 'down' ? '100%' : 0,
      opacity: direction ? 0 : 1,
      transition: { duration: 0.3, ease: 'easeIn' }
    })
  };

  return (
    <motion.div
      className="song-detail-view"
      custom={entryDirection}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="detail-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2>{playlist.title}</h2>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Menu */}
      {menuOpen && (
        <div className="menu-dropdown" ref={menuRef}>
          <button onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false); }}>
            Delete Playlist
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Playlist?</h3>
            <p>Are you sure you want to delete "{playlist.title}"?</p>
            <div className="modal-buttons">
              <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="delete-button" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Info */}
      <div className="playlist-info">
        <div className="playlist-meta">
          <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
          {playlist.description && <p className="playlist-description">{playlist.description}</p>}
        </div>
      </div>

      {/* Songs List */}
      <div className="playlist-songs-list">
        {loading ? (
          <p className="loading-text">Loading songs...</p>
        ) : songs.length === 0 ? (
          <p className="empty-text">No songs in this playlist yet</p>
        ) : (
          songs.map((song) => (
            <div key={song.songId} className="playlist-song-item">
              <div className="song-item-info">
                <h3>{song.title}</h3>
                <p>{song.artistName}</p>
              </div>
              <button
                className="remove-song-button"
                onClick={() => handleRemoveSong(song.songId)}
                title="Remove from playlist"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Navigation arrows */}
      {hasPrevious && (
        <button className="nav-arrow nav-arrow-up" onClick={() => onNavigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button className="nav-arrow nav-arrow-down" onClick={() => onNavigate(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}

export default PlaylistDetailView;
