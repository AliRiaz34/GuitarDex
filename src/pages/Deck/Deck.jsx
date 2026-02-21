import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import DeckCreateView from './DeckCreateView';
import DeckListView from './DeckListView';
import DeckDetailView from './DeckDetailView';
import PracticeView from '../Library/PracticeView';
import SongDetailView from '../Library/SongDetailView';
import EditView from '../Library/EditView';
import { getAllDecks, getSongById, addPractice, getNextPracticeId, updateSong, getTotalMinutesPlayed, getTotalPracticeSessions, getDecksForMenu, addSongToDeck, removeSongFromDeck, deleteSong, getDeckById, updateDeckLevel, getMasteredSongs } from '../../utils/db';
import { xpThreshold, updateSongWithPractice } from '../../utils/levelingSystem';
import { useData } from '../../contexts/DataContext';
import './Deck.css';

function Deck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { decks, setDecks } = useData();
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

  // Create virtual Mastered deck from mastered songs
  const [masteredDeck, setMasteredDeck] = useState(null);

  useEffect(() => {
    async function loadMasteredDeck() {
      try {
        const masteredSongs = await getMasteredSongs();
        // Sort by most recent (lastPracticed or creationDate)
        masteredSongs.sort((a, b) => {
          const dateA = new Date(a.lastPracticed || a.creationDate || 0);
          const dateB = new Date(b.lastPracticed || b.creationDate || 0);
          return dateB - dateA;
        });
        const totalDuration = masteredSongs.reduce((sum, song) => sum + (song.songDuration ? Number(song.songDuration) : 0), 0);

        setMasteredDeck({
          deckId: 'mastered',
          title: 'mastered',
          level: 20, // Mastered songs are level 20+
          totalDuration,
          creationDate: new Date(0).toISOString(), // Oldest possible date
          isVirtual: true, // Flag to identify virtual deck
          songs: masteredSongs
        });
      } catch (error) {
        console.error('Error loading mastered deck:', error);
      }
    }
    loadMasteredDeck();
  }, [decks]); // Reload when decks change (which happens after practice)

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

      // Reload deck data to reflect any changes made from other views
      async function reloadDecks() {
        try {
          // First, get all decks to know which ones to update
          const allDecks = await getAllDecks();

          // Recalculate levels for all decks (in case songs were practiced elsewhere)
          await Promise.all(
            allDecks.map(deck => updateDeckLevel(deck.deckId))
          );

          // Now fetch the updated deck data
          const decksInfo = await getAllDecks();
          setDecks(decksInfo);
        } catch (error) {
          console.error('Error reloading decks:', error);
        }
      }
      reloadDecks();
    }
  }, [location]);

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

  // Add Mastered deck at top if it matches search and has songs
  const showMasteredDeck = masteredDeck &&
    masteredDeck.songs.length > 0 &&
    masteredDeck.title.toLowerCase().includes(searchQuery.toLowerCase());

  const sortedDecks = showMasteredDeck
    ? [masteredDeck, ...sortedRegularDecks]
    : sortedRegularDecks;

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
    // Remove deck from the list
    setDecks(prevDecks => prevDecks.filter(d => d.deckId !== deckId));
    // Close the deck detail view
    setSelectedDeck(null);
  };

  const handleDeckCreated = (newDeck) => {
    if (editingDeck) {
      // Update existing deck in the list
      setDecks(prevDecks => prevDecks.map(d => d.deckId === newDeck.deckId ? newDeck : d));
      setEditingDeck(null);
    } else {
      // Add new deck to the list
      setDecks(prevDecks => [newDeck, ...prevDecks]);
    }
    // Close create view and show the deck
    setShowCreateView(false);
    setSelectedDeck(newDeck);
  };

  const handleDeckEdit = (deck) => {
    setEditingDeck(deck);
    setShowCreateView(true);
    setSelectedDeck(null);
  };

  const openPracticeView = async (song) => {
    // Fetch full song details with stats
    try {
      const fullSong = await getSongById(song.songId);
      if (fullSong.status !== "seen") {
        fullSong.xpThreshold = xpThreshold(fullSong.level);
        fullSong.totalMinPlayed = await getTotalMinutesPlayed(fullSong.songId);
        fullSong.totalSessions = await getTotalPracticeSessions(fullSong.songId);
      }
      setPracticeView({ song: fullSong, fromDeckView: true });
    } catch (error) {
      console.error('Error loading song for practice:', error);
      alert('Error loading song');
    }
  };

  const handlePracticeSubmit = async ({ minPlayed, songDuration }) => {
    const song = practiceView.song;

    try {
      // Update song with practice using leveling system
      const { updatedSong, xpGain } = updateSongWithPractice(song, minPlayed, songDuration);

      // Save practice to IndexedDB
      const practiceId = await getNextPracticeId();
      await addPractice({
        practiceId,
        songId: song.songId,
        minPlayed: parseFloat(minPlayed),
        xpGain,
        practiceDate: new Date().toISOString()
      });

      // Update song in IndexedDB
      await updateSong(updatedSong.songId, updatedSong);

      // Calculate additional fields for updated song
      updatedSong.xpThreshold = xpThreshold(updatedSong.level);
      updatedSong.totalMinPlayed = await getTotalMinutesPlayed(updatedSong.songId);
      updatedSong.totalSessions = await getTotalPracticeSessions(updatedSong.songId);

      // Update deck level and duration if we're viewing from a real deck (not virtual)
      if (selectedDeck && !selectedDeck.isVirtual) {
        await updateDeckLevel(selectedDeck.deckId);
        const refreshedDeck = await getDeckById(selectedDeck.deckId);
        setSelectedDeck(refreshedDeck);

        // Also update the deck in the decks array so the list view shows current data
        setDecks(prevDecks => prevDecks.map(d =>
          d.deckId === refreshedDeck.deckId ? refreshedDeck : d
        ));
      }

      // Close practice view and show updated song detail if from song view
      setPracticeView(null);
      if (practiceView.fromSongView) {
        // Pass both old and new song data for animation
        // For first practice of a seen song, default to xp:0 and level:1
        setSelectedSong({
          ...updatedSong,
          _previousXp: song.xp ?? 0,
          _previousLevel: song.level ?? 1,
          _xpGain: xpGain,
          _fromPractice: true
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding practice");
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
  const openSongDetailView = async (song, songsInDeck) => {
    try {
      const fullSong = await getSongById(song.songId);
      if (fullSong.status !== "seen") {
        fullSong.xpThreshold = xpThreshold(fullSong.level);
        fullSong.totalMinPlayed = await getTotalMinutesPlayed(fullSong.songId);
        fullSong.totalSessions = await getTotalPracticeSessions(fullSong.songId);
      }

      // Load decks for menu
      const decks = await getDecksForMenu(song.songId);
      setDecksForMenu(decks);
      setSongsInCurrentDeck(songsInDeck);
      setSongEntryDirection(null);

      // Remove any animation properties to prevent repeated indicators
      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = fullSong;
      setSelectedSong(cleanSong);
    } catch (error) {
      console.error('Error loading song details:', error);
      alert('Error loading song');
    }
  };

  const handleSongNavigate = async (direction) => {
    const currentIndex = songsInCurrentDeck.findIndex(s => s.songId === selectedSong.songId);
    const newIndex = currentIndex + direction;

    if (newIndex >= 0 && newIndex < songsInCurrentDeck.length) {
      const nextSong = songsInCurrentDeck[newIndex];
      setSongEntryDirection(direction > 0 ? 'up' : 'down');

      try {
        const fullSong = await getSongById(nextSong.songId);
        if (fullSong.status !== "seen") {
          fullSong.xpThreshold = xpThreshold(fullSong.level);
          fullSong.totalMinPlayed = await getTotalMinutesPlayed(fullSong.songId);
          fullSong.totalSessions = await getTotalPracticeSessions(fullSong.songId);
        }

        // Remove any animation properties when navigating
        const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = fullSong;
        setSelectedSong(cleanSong);
      } catch (error) {
        console.error('Error loading next song:', error);
      }
    }
  };

  const handleSongPractice = async () => {
    setPracticeView({ song: selectedSong, fromSongView: true });
  };

  const handleSongDelete = async (songId) => {
    try {
      await deleteSong(songId);
      setSelectedSong(null);
      // Refresh the deck if it's still selected
      if (selectedDeck) {
        await updateDeckLevel(selectedDeck.deckId);
        const refreshedDeck = await getDeckById(selectedDeck.deckId);
        setSelectedDeck(refreshedDeck);
        // Also refresh the decks list
        const updatedDecks = await getAllDecks();
        setDecks(updatedDecks);
      }
    } catch (error) {
      console.error('Error deleting song:', error);
      alert('Error deleting song');
    }
  };

  const handleToggleDeck = async (deckId, songId, isInDeck) => {
    try {
      if (isInDeck) {
        await removeSongFromDeck(deckId, songId);
      } else {
        await addSongToDeck(deckId, songId);
      }

      // Update the affected deck's level and duration
      await updateDeckLevel(deckId);

      // Refresh the deck data
      const refreshedDeck = await getDeckById(deckId);

      // If we're currently viewing the affected deck, update it
      if (selectedDeck && selectedDeck.deckId === deckId) {
        setSelectedDeck(refreshedDeck);
      }

      // Also update the deck in the decks array so the list view shows current data
      setDecks(prevDecks => prevDecks.map(d =>
        d.deckId === deckId ? refreshedDeck : d
      ));

      // Reload decks menu to update membership status
      const decks = await getDecksForMenu(songId);
      setDecksForMenu(decks);
    } catch (error) {
      console.error('Error toggling deck membership:', error);
      alert('Error updating deck');
    }
  };

  const handleSongBack = async () => {
    // Refresh deck data before going back to deck view (skip for virtual decks)
    if (selectedDeck && !selectedDeck.isVirtual) {
      await updateDeckLevel(selectedDeck.deckId);
      const refreshedDeck = await getDeckById(selectedDeck.deckId);
      setSelectedDeck(refreshedDeck);

      // Also update the deck in the decks array so the list view shows current data
      setDecks(prevDecks => prevDecks.map(d =>
        d.deckId === refreshedDeck.deckId ? refreshedDeck : d
      ));
    }
    setSelectedSong(null);
  };

  const openEditView = (song) => {
    setEditView(song);
  };

  const handleEditSubmit = async (updatedData) => {
    try {
      // Update song in database
      const updatedSong = await updateSong(editView.songId, updatedData);

      // Recalculate fields if song has been practiced
      if (updatedSong.status !== "seen") {
        updatedSong.xpThreshold = xpThreshold(updatedSong.level);
        updatedSong.totalMinPlayed = await getTotalMinutesPlayed(updatedSong.songId);
        updatedSong.totalSessions = await getTotalPracticeSessions(updatedSong.songId);
      }

      // Update deck level and duration if we're viewing from a real deck (not virtual)
      if (selectedDeck && !selectedDeck.isVirtual) {
        await updateDeckLevel(selectedDeck.deckId);
        const refreshedDeck = await getDeckById(selectedDeck.deckId);
        setSelectedDeck(refreshedDeck);

        // Also update the deck in the decks array so the list view shows current data
        setDecks(prevDecks => prevDecks.map(d =>
          d.deckId === refreshedDeck.deckId ? refreshedDeck : d
        ));
      }

      // Close edit view and return to song detail view with updated song
      // Remove any animation properties to prevent repeated indicators
      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = updatedSong;
      setEditView(null);
      setSelectedSong(cleanSong);
    } catch (error) {
      console.error("Error updating song:", error);
      alert("Error updating song");
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
  // Include mastered deck in allDecks count if it has songs
  const allDecksWithMastered = showMasteredDeck ? [masteredDeck, ...decks] : decks;

  return (
    <DeckListView
      decks={sortedDecks}
      allDecks={allDecksWithMastered}
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
