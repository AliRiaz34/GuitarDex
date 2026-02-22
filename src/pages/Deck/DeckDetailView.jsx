import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteDeck, updateDeckSongOrder } from '../../utils/supabaseDb';
import { useData } from '../../contexts/DataContext';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import './Deck.css';

// Simple row for virtual decks (no drag)
function SimpleRow({ song, onPractice, onSelectSong }) {
  const handlePracticeClick = (e) => {
    e.stopPropagation();
    onPractice(song);
  };

  return (
    <tr className="deck-song-tr">
      <td
        className="deck-song-td-title"
        onClick={() => onSelectSong(song)}
        style={{ paddingLeft: '16px' }}
      >
        <div className="deck-song-title">{song.title}</div>
        <div className="deck-song-artistName">{song.artistName}</div>
      </td>
      <td className="deck-song-td-lv" onClick={handlePracticeClick}>
        {song.level != null ? `Lv ${song.level}` : '???'}
      </td>
    </tr>
  );
}

// Sortable row component
function SortableRow({ song, onPractice, onSelectSong }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.songId });

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePracticeClick = (e) => {
    e.stopPropagation();
    onPractice(song);
  };

  const handleTitleClick = () => {
    // Only trigger if not dragging
    if (!isDragging) {
      onSelectSong(song);
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="deck-song-tr"
      {...attributes}
    >
      <td className="deck-song-td-drag" {...listeners}>
        <div className="deck-drag-handle">&lt;&gt;</div>
      </td>
      <td
        className="deck-song-td-title"
        onClick={handleTitleClick}
      >
        <div className="deck-song-title">{song.title}</div>
        <div className="deck-song-artistName">{song.artistName}</div>
      </td>
      <td className="deck-song-td-lv" onClick={handlePracticeClick}>
        {song.level != null ? `Lv ${song.level}` : '???'}
      </td>
    </tr>
  );
}

function DeckDetailView({ deck, onBack, onDelete, onEdit, onPractice, onSelectSong }) {
  const { songs: allSongs, deckSongs: allDeckSongs } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const menuRef = useRef(null);

  // Swipe gesture detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isSwiping = useRef(false);

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay for touch
        tolerance: 5,
      },
    })
  );

  // Compute songs in deck from DataContext (no Supabase call)
  useEffect(() => {
    // For virtual decks (like Mastered), songs are already provided
    if (deck.isVirtual && deck.songs) {
      setSongs(deck.songs);
      setTotalMinutes(deck.totalDuration || 0);
      setLoading(false);
      return;
    }

    const songMap = new Map(allSongs.map(s => [s.songId, s]));
    const memberEntries = allDeckSongs.filter(ds => ds.deckId === deck.deckId);
    const validSongs = memberEntries
      .map(ds => {
        const song = songMap.get(ds.songId);
        return song ? { ...song, deckSongId: ds.id, order: ds.order } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    setSongs(validSongs);
    setTotalMinutes(deck.totalDuration || 0);
    setLoading(false);
  }, [deck.deckId, deck.totalDuration, deck.isVirtual, deck.songs, allSongs, allDeckSongs]);

  // Swipe gesture handlers
  useEffect(() => {
    const handleTouchStart = (e) => {
      // Ignore touches on interactive elements
      const target = e.target;
      if (target.tagName === 'BUTTON' || target.closest('button') ||
          target.closest('tr') || target.closest('#deck-menu-icon')) {
        isSwiping.current = false;
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = true;
    };

    const handleTouchMove = (e) => {
      if (!isSwiping.current) return;

      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current) return;

      const deltaX = touchStartX.current - touchEndX.current;
      const deltaY = touchStartY.current - touchEndY.current;
      const minSwipeDistance = 50;

      // Check if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Swipe right - navigate back
        if (deltaX < 0) {
          onBack();
        }
      }

      isSwiping.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onBack]);

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

  const handleBack = () => {
    onBack();
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = () => {
    setMenuOpen(false);
    onEdit();
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDeck(deck.deckId);
      setShowDeleteConfirm(false);
      onDelete(deck.deckId);
    } catch (error) {
      alert('Error deleting deck');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleRandomPractice = () => {
    if (songs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * songs.length);
    onPractice(songs[randomIndex]);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setSongs((items) => {
      const oldIndex = items.findIndex((item) => item.songId === active.id);
      const newIndex = items.findIndex((item) => item.songId === over.id);

      const newOrder = arrayMove(items, oldIndex, newIndex);

      // Save the new order to the database
      const songOrderArray = newOrder.map((song) => song.songId);
      updateDeckSongOrder(deck.deckId, songOrderArray).catch((error) => {
        console.error('Error updating song order:', error);
        alert('Failed to save new order');
      });

      return newOrder;
    });
  };

  return (
    <>
      {/* Backdrop overlay when menu is open */}
      <AnimatePresence>
        {(menuOpen || showDeleteConfirm) && (
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setMenuOpen(false);
              if (showDeleteConfirm) {
                setShowDeleteConfirm(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={deck.deckId}
        id="deck-view"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div id="deck-top-div">
          <div id="deck-head-div-1">
            <p className="deck-back-icon" onClick={handleBack}>{'<'}</p>
            {/* Hide menu for virtual decks (like Mastered) */}
            {!deck.isVirtual && (
              <div id="deck-menu-container" ref={menuRef}>
                <img
                  id="deck-menu-icon"
                  onClick={() => setMenuOpen(!menuOpen)}
                  src='./images/menu.png'
                >
                </img>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      id="deck-menu-dropdown"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="deck-menu-option" onClick={handleEditClick}>edit</p>
                      <p className="deck-menu-option" onClick={handleDeleteClick}>delete</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          <h2 id="deck-title">{deck.title}</h2>
          <div id="deck-head-div-2">
            <h3 id="deck-level">
              {deck.level != null ? `Lv ${deck.level}` : '???'}
            </h3>
            <p id="deck-total-duration">{totalMinutes} min</p>
          </div>
        </div>

        {deck.description && (
          <div id="deck-description-box">
            <p id="deck-description-text">{deck.description}</p>
          </div>
        )}

        {loading ? (
          <div id="deck-loading">
            <p>Loading songs...</p>
          </div>
        ) : songs.length === 0 ? (
          <div id="deck-empty">
            <p>No songs in this deck yet</p>
          </div>
        ) : deck.isVirtual ? (
          /* Simple table for virtual decks (no drag-and-drop) */
          <div id="deck-songs-table-container">
            <table id="deck-songs-table">
              <tbody>
                {songs.map((song) => (
                  <SimpleRow
                    key={song.songId}
                    song={song}
                    onPractice={onPractice}
                    onSelectSong={() => onSelectSong(song, songs)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div id="deck-songs-table-container">
              <table id="deck-songs-table">
                <SortableContext
                  items={songs.map((s) => s.songId)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {songs.map((song) => (
                      <SortableRow
                        key={song.songId}
                        song={song}
                        onPractice={onPractice}
                        onSelectSong={() => onSelectSong(song, songs)}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </div>
          </DndContext>
        )}

        {songs.length > 0 && (
          <button id="deck-practice-button" onClick={handleRandomPractice}>
            random
          </button>
        )}

        <AnimatePresence>
          {showDeleteConfirm && (
            <div id="deck-delete-confirm-overlay">
              <motion.div
                id="deck-delete-confirm-widget"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <p id="deck-delete-confirm-text">Delete {deck.title}?</p>
                <div id="deck-delete-confirm-buttons">
                  <button className="deck-delete-confirm-btn cancel-btn" onClick={handleDeleteCancel}>
                    cancel
                  </button>
                  <button className="deck-delete-confirm-btn confirm-btn" onClick={handleDeleteConfirm}>
                    confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default DeckDetailView;
