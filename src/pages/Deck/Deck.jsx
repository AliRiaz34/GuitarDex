import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import DeckCreateView from './DeckCreateView';
import DeckListView from './DeckListView';
import DeckDetailView from './DeckDetailView';
import PracticeView from '../Library/PracticeView';
import SongDetailView from '../Library/SongDetailView';
import EditView from '../Library/EditView';
import { addPractice, getNextPracticeId, updateSong, addSongToDeck, removeSongFromDeck, deleteSong } from '../../utils/supabaseDb';

import { xpThreshold, updateSongWithPractice } from '../../utils/levelingSystem';
import { useData } from '../../contexts/DataContext';
import './Deck.css';

function Deck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { songs, decks, setDecks, deckSongs, updateDeckMembership } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [sortState, setSortState] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortReversed, setSortReversed] = useState(false);
  const [entryDirection, setEntryDirection] = useState(null); // Track animation direction

  // Add Practice view state
  const [practiceView, setPracticeView] = useState(null); // { song, fromDeckView }

  // Add Song Detail view state
  const [selectedSong, setSelectedSong] = useState(null);
  const [songEntryDirection, setSongEntryDirection] = useState(null);
  const [songsInCurrentDeck, setSongsInCurrentDeck] = useState([]);
  const [decksForMenu, setDecksForMenu] = useState([]);

  // Add Edit view state
  const [editView, setEditView] = useState(null);

  // Add Create view state
  const [showCreateView, setShowCreateView] = useState(false);
  const [createInitialTitle, setCreateInitialTitle] = useState("");
  const [editingDeck, setEditingDeck] = useState(null);

  // Compute virtual Mastered deck from songs already in DataContext
  const masteredDeck = useMemo(() => {
    const masteredSongs = songs
      .filter(s => s.status === 'mastered')
      .sort((a, b) => {
        const dateA = new Date(a.lastPracticed || a.creationDate || 0);
        const dateB = new Date(b.lastPracticed || b.creationDate || 0);
        return dateB - dateA;
      });

    if (masteredSongs.length === 0) return null;

    const totalDuration = masteredSongs.reduce((sum, song) => sum + (song.songDuration ? Number(song.songDuration) : 0), 0);

    return {
      deckId: 'mastered',
      title: 'mastered',
      level: 20,
      totalDuration,
      creationDate: new Date(0).toISOString(),
      isVirtual: true,
      songs: masteredSongs
    };
  }, [songs]);

  // Compute virtual Refined deck
  const refinedDeck = useMemo(() => {
    const refinedSongs = songs
      .filter(s => s.status === 'refined')
      .sort((a, b) => {
        const dateA = new Date(a.lastPracticed || a.creationDate || 0);
        const dateB = new Date(b.lastPracticed || b.creationDate || 0);
        return dateB - dateA;
      });

    if (refinedSongs.length === 0) return null;

    const totalDuration = refinedSongs.reduce((sum, song) => sum + (song.songDuration ? Number(song.songDuration) : 0), 0);

    return {
      deckId: 'refined',
      title: 'refined',
      level: 10,
      totalDuration,
      creationDate: new Date(0).toISOString(),
      isVirtual: true,
      songs: refinedSongs
    };
  }, [songs]);

  // Handle navigation state (new deck from DeckCreateView, or reset from nav button)
  useEffect(() => {
    if (location.state?.newDeck) {
      // New deck added - add to list and show detail view
      const newDeck = location.state.newDeck;
      setDecks(prevDecks => [newDeck, ...prevDecks]);
      setSelectedDeck(newDeck);
    } else if (location.pathname === '/deck') {
      // Nav button clicked - reset to list view
      setSelectedDeck(null);
      setPracticeView(null);
      setEditView(null);
      setSelectedSong(null);
      setShowCreateView(false);
    }
  }, [location.key]);

  // Keep selectedDeck in sync with DataContext decks (e.g. after level recompute)
  useEffect(() => {
    if (selectedDeck && !selectedDeck.isVirtual) {
      const updated = decks.find(d => d.deckId === selectedDeck.deckId);
      if (updated && (updated.level !== selectedDeck.level || updated.totalDuration !== selectedDeck.totalDuration)) {
        setSelectedDeck(updated);
      }
    }
  }, [decks]);

  // Filter decks based on search
  const filteredDecks = decks.filter(deck =>
    deck.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort decks
  const sortedRegularDecks = [...filteredDecks].sort((a, b) => {
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
    else if (sortState === 'duration') {
      //average level of songs
      result = a.totalDuration - b.totalDuration;
    }
    // Apply reverse if needed
    return sortReversed ? -result : result;
  });

  // Add virtual decks at top if they match search and have songs
  const showMasteredDeck = masteredDeck &&
    masteredDeck.songs.length > 0 &&
    masteredDeck.title.toLowerCase().includes(searchQuery.toLowerCase());

  const showRefinedDeck = refinedDeck &&
    refinedDeck.songs.length > 0 &&
    refinedDeck.title.toLowerCase().includes(searchQuery.toLowerCase());

  const virtualDecks = [
    ...(showMasteredDeck ? [masteredDeck] : []),
    ...(showRefinedDeck ? [refinedDeck] : []),
  ];

  const sortedDecks = [...virtualDecks, ...sortedRegularDecks];

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

  const handleDeckDelete = (deckId) => {
    setDecks(prevDecks => prevDecks.filter(d => d.deckId !== deckId));
    setSelectedDeck(null);
  };

  const handleDeckCreated = (newDeck) => {
    if (editingDeck) {
      // Preserve enriched fields (level, totalDuration) from existing deck
      const existing = decks.find(d => d.deckId === newDeck.deckId);
      const enriched = { ...newDeck, level: existing?.level ?? null, totalDuration: existing?.totalDuration ?? 0 };
      setDecks(prevDecks => prevDecks.map(d => d.deckId === enriched.deckId ? enriched : d));
      setEditingDeck(null);
      setShowCreateView(false);
      setSelectedDeck(enriched);
    } else {
      const enriched = { ...newDeck, level: null, totalDuration: 0 };
      setDecks(prevDecks => [enriched, ...prevDecks]);
      setShowCreateView(false);
      setSelectedDeck(enriched);
    }
  };

  const handleDeckEdit = (deck) => {
    setEditingDeck(deck);
    setShowCreateView(true);
    setSelectedDeck(null);
  };

  const openPracticeView = (song) => {
    const fullSong = songs.find(s => s.songId === song.songId) || song;
    setPracticeView({ song: fullSong, fromDeckView: true });
  };

  const handlePracticeSubmit = async ({ minPlayed, songDuration }) => {
    const song = practiceView.song;
    const { updatedSong, xpGain } = updateSongWithPractice(song, minPlayed, songDuration);

    // Optimistic UI — compute transient fields locally and close immediately
    updatedSong.xpThreshold = xpThreshold(updatedSong.level);
    updatedSong.totalMinPlayed = (song.totalMinPlayed || 0) + parseFloat(minPlayed);
    updatedSong.totalSessions = (song.totalSessions || 0) + 1;

    setPracticeView(null);
    if (practiceView.fromSongView) {
      setSelectedSong({
        ...updatedSong,
        _previousXp: song.xp ?? 0,
        _previousLevel: song.level ?? 1,
        _xpGain: xpGain,
        _fromPractice: true
      });
    }

    // Supabase writes in background
    try {
      const practiceId = await getNextPracticeId();
      await Promise.all([
        addPractice({
          practiceId,
          songId: song.songId,
          minPlayed: parseFloat(minPlayed),
          xpGain,
          practiceDate: new Date().toISOString()
        }),
        updateSong(updatedSong.songId, updatedSong)
      ]);
    } catch (error) {
      console.error("Error saving practice:", error);
    }
  };

  const handlePracticeBack = () => {
    if (practiceView.fromSongView) {
      // Return to song detail view - remove animation properties to prevent repeated indicators
      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = practiceView.song;
      setSelectedSong(cleanSong);
    }
    // Close practice view
    setPracticeView(null);
  };

  // Song Detail View handlers
  const openSongDetailView = (song, songsInDeck) => {
    const fullSong = songs.find(s => s.songId === song.songId) || song;
    const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = fullSong;

    setSongsInCurrentDeck(songsInDeck);
    setSongEntryDirection(null);
    setSelectedSong(cleanSong);

    // Compute deck menu data synchronously from DataContext
    const deckIdsWithSong = new Set(
      deckSongs.filter(ds => ds.songId === song.songId).map(ds => ds.deckId)
    );
    setDecksForMenu(decks.filter(d => !d.isVirtual).map(d => ({
      deckId: d.deckId,
      title: d.title,
      containsSong: deckIdsWithSong.has(d.deckId)
    })));
  };

  const handleSongNavigate = (direction) => {
    const currentIndex = songsInCurrentDeck.findIndex(s => s.songId === selectedSong.songId);
    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < songsInCurrentDeck.length) {
      const nextSong = songsInCurrentDeck[newIndex];
      setSongEntryDirection(direction > 0 ? 'up' : 'down');

      const fullSong = songs.find(s => s.songId === nextSong.songId) || nextSong;
      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = fullSong;
      setSelectedSong(cleanSong);

      // Recompute deck menu for the new song
      const deckIdsWithSong = new Set(
        deckSongs.filter(ds => ds.songId === nextSong.songId).map(ds => ds.deckId)
      );
      setDecksForMenu(decks.filter(d => !d.isVirtual).map(d => ({
        deckId: d.deckId,
        title: d.title,
        containsSong: deckIdsWithSong.has(d.deckId)
      })));
    }
  };

  const handleSongPractice = async () => {
    setPracticeView({ song: selectedSong, fromSongView: true });
  };

  const handleSongDelete = async (songId) => {
    try {
      await deleteSong(songId);
      setSelectedSong(null);
    } catch (error) {
      console.error('Error deleting song:', error);
      alert('Error deleting song');
    }
  };

  const handleToggleDeck = async (deckId, songId, isInDeck) => {
    // Optimistic UI updates
    setDecksForMenu(prev => prev.map(d =>
      d.deckId === deckId ? { ...d, containsSong: !isInDeck } : d
    ));
    updateDeckMembership(deckId, songId, !isInDeck);

    try {
      if (isInDeck) {
        await removeSongFromDeck(deckId, songId);
      } else {
        await addSongToDeck(deckId, songId);
      }
    } catch (error) {
      // Revert optimistic updates
      setDecksForMenu(prev => prev.map(d =>
        d.deckId === deckId ? { ...d, containsSong: isInDeck } : d
      ));
      updateDeckMembership(deckId, songId, isInDeck);
      console.error('Error toggling deck membership:', error);
      alert('Error updating deck');
    }
  };

  const handleSongBack = () => {
    setSelectedSong(null);
  };

  const openEditView = (song) => {
    setEditView(song);
  };

  const handleEditSubmit = async (updatedData) => {
    // Optimistic UI — merge edits into existing song and close immediately
    const merged = { ...editView, ...updatedData };
    if (merged.status !== "seen") {
      merged.xpThreshold = xpThreshold(merged.level);
    }
    const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = merged;
    setEditView(null);
    setSelectedSong(cleanSong);

    // Supabase write in background
    try {
      await updateSong(editView.songId, updatedData);
    } catch (error) {
      console.error("Error updating song:", error);
    }
  };

  const handleEditBack = () => {
    // Return to song detail view without saving
    // Remove any animation properties to prevent repeated indicators
    const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = editView;
    setEditView(null);
    setSelectedSong(cleanSong);
  };

  // Edit View
  if (editView) {
    return (
      <EditView
        key={editView.songId}
        song={editView}
        onSubmit={handleEditSubmit}
        onBack={handleEditBack}
      />
    );
  }

  // Practice View
  if (practiceView) {
    return (
      <PracticeView
        key={practiceView.song.songId}
        song={practiceView.song}
        onSubmit={handlePracticeSubmit}
        onBack={handlePracticeBack}
        onGoToSong={() => {
          setPracticeView(null);
          setSelectedSong(practiceView.song);
        }}
      />
    );
  }

  // Song Detail View (from deck)
  if (selectedSong) {
    const currentIndex = songsInCurrentDeck.findIndex(s => s.songId === selectedSong.songId);

    return (
      <SongDetailView
        key={selectedSong.songId}
        song={selectedSong}
        onBack={handleSongBack}
        onPractice={handleSongPractice}
        onEdit={() => openEditView(selectedSong)}
        onDelete={handleSongDelete}
        onNavigate={handleSongNavigate}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < songsInCurrentDeck.length - 1}
        entryDirection={songEntryDirection}
        decks={decksForMenu}
        onToggleDeck={handleToggleDeck}
      />
    );
  }

  // Deck Create/Edit View
  if (showCreateView) {
    return (
      <DeckCreateView
        onBack={() => {
          setShowCreateView(false);
          if (editingDeck) {
            // If editing, go back to deck detail view
            setSelectedDeck(editingDeck);
          }
          setEditingDeck(null);
        }}
        onDeckCreated={handleDeckCreated}
        initialTitle={createInitialTitle}
        editDeck={editingDeck}
      />
    );
  }

  // Deck Detail View
  if (selectedDeck) {
    // Find current deck index in sortedDecks
    const currentIndex = sortedDecks.findIndex(d => d.deckId === selectedDeck.deckId);

    const handleNavigateDeck = (direction) => {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < sortedDecks.length) {
        setEntryDirection(direction > 0 ? 'up' : 'down');
        setSelectedDeck(sortedDecks[newIndex]);
      }
    };

    return (
      <DeckDetailView
        key={selectedDeck.deckId}
        deck={selectedDeck}
        onBack={() => setSelectedDeck(null)}
        onDelete={handleDeckDelete}
        onEdit={() => handleDeckEdit(selectedDeck)}
        onPractice={openPracticeView}
        onSelectSong={openSongDetailView}
        onNavigate={handleNavigateDeck}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < sortedDecks.length - 1}
        entryDirection={entryDirection}
      />
    );
  }

  // Deck List View
  // Include virtual decks in allDecks count
  const allDecksWithVirtual = [...virtualDecks, ...decks];

  return (
    <DeckListView
      decks={sortedDecks}
      allDecks={allDecksWithVirtual}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onSelectDeck={(deck) => {
        setEntryDirection(null);
        setSelectedDeck(deck);
      }}
      onCreateDeck={(initialTitle) => {
        setCreateInitialTitle(initialTitle);
        setShowCreateView(true);
      }}
    />
  );
}

export default Deck;
