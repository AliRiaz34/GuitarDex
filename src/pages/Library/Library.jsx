import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PracticeView from './PracticeView';
import SongDetailView from './SongDetailView';
import LibraryListView from './LibraryListView';
import EditView from './EditView';
import { getTotalMinutesPlayed, getTotalPracticeSessions, addPractice, getNextPracticeId, updateSong, getDecksForMenu, addSongToDeck, removeSongFromDeck } from '../../utils/supabaseDb';
import { xpThreshold, updateSongWithPractice } from '../../utils/levelingSystem';
import { useData } from '../../contexts/DataContext';
import './Library.css';

function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const { songs, setSongs, isLoading } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [sortState, setSortState] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState(null);
  const [sortReversed, setSortReversed] = useState(false);
  const [entryDirection, setEntryDirection] = useState(null); // Track animation direction
  const scrollPositionRef = useRef(0); // Store scroll position

  const [returnFromSong, setReturnFromSong] = useState(false);

  const [practiceView, setPracticeView] = useState(null); // { song, fromSongView }

  const [editView, setEditView] = useState(null); // song to edit

  useEffect(() => {
    async function loadDecks() {
      try {
        const decksData = await getDecksForMenu();
        setPlaylists(decksData);
      } catch (error) {
        console.error('Error loading decks:', error);
      }
    }

    loadDecks();
  }, []);

  useEffect(() => {
    if (selectedSong) {
      async function updateDeckMembership() {
        try {
          const decksData = await getDecksForMenu(selectedSong.songId);
          setPlaylists(decksData);
        } catch (error) {
          console.error('Error updating deck membership:', error);
        }
      }
      updateDeckMembership();
    }
  }, [selectedSong?.songId]);

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/library') return;

    if (location.state?.newSong) {
      const newSong = location.state.newSong;
      setSelectedSong(newSong);
      setPracticeView(null);
      setEditView(null);
    } else {
      setPracticeView(null);
      setSelectedSong(null);
      setSearchQuery('');
      setEditView(null);
    }
  }, [location.pathname, location.key]);

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artistName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      result = a.level - b.level;
    } else if (sortState === 'status') {
      // Status priority: seen -> learning -> stale -> mastered
      const statusOrder = { seen: 0, learning: 1, stale: 2, refined: 3, mastered: 4 };
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

    return sortReversed ? -result : result;
  });

  const handleSortSelect = (newSort) => {
    if (newSort === sortState) {
      setSortReversed(!sortReversed);
    } else {
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
      const { updatedSong, xpGain } = updateSongWithPractice(song, minPlayed, songDuration);

      const practiceId = await getNextPracticeId();
      await addPractice({
        practiceId,
        songId: song.songId,
        minPlayed: parseFloat(minPlayed),
        xpGain,
        practiceDate: new Date().toISOString()
      });

      await updateSong(updatedSong.songId, updatedSong);

      updatedSong.xpThreshold = xpThreshold(updatedSong.level);
      updatedSong.totalMinPlayed = await getTotalMinutesPlayed(updatedSong.songId);
      updatedSong.totalSessions = await getTotalPracticeSessions(updatedSong.songId);

      setSongs(prevSongs => prevSongs.map(s =>
        s.songId === song.songId ? updatedSong : s
      ));

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
    } catch (error) {
      console.error("Error:", error);
      alert("Error adding practice");
    }
  };

  const handlePracticeBack = () => {
    if (practiceView.fromSongView) {
      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = practiceView.song;
      setSelectedSong(cleanSong);
    }
    setPracticeView(null);
  };

  const handleSongDelete = (songId) => {
    setSongs(prevSongs => prevSongs.filter(s => s.songId !== songId));
    setSelectedSong(null);
  };

  const openEditView = (song) => {
    setEditView(song);
  };

  const handleEditSubmit = async (updatedData) => {
    try {
      const updatedSong = await updateSong(editView.songId, updatedData);

      if (updatedSong.status !== "seen") {
        updatedSong.xpThreshold = xpThreshold(updatedSong.level);
        updatedSong.totalMinPlayed = await getTotalMinutesPlayed(updatedSong.songId);
        updatedSong.totalSessions = await getTotalPracticeSessions(updatedSong.songId);
      }

      setSongs(prevSongs => prevSongs.map(s =>
        s.songId === editView.songId ? updatedSong : s
      ));

      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = updatedSong;
      setEditView(null);
      setEntryDirection(null); // Reset to use fade animation, not swipe
      setSelectedSong(cleanSong);
    } catch (error) {
      console.error("Error updating song:", error);
      alert("Error updating song");
    }
  };

  const handleEditBack = () => {
    const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = editView;
    setEditView(null);
    setEntryDirection(null); // Reset to use fade animation, not swipe
    setSelectedSong(cleanSong);
  };

  const handleRandomSelect = () => {
    // Exclude mastered songs from practice selection
    const practicableSongs = filteredSongs.filter(song => song.status !== 'mastered');

    if (practicableSongs.length === 0) return;

    // Calculate weight for each song based on:
    // 1. Days since last practice (more days = higher weight, capped at 30)
    // 2. Lower level = higher weight
    // Goal: cycle through all songs to build a well-rounded guitardex
    const now = Date.now();
    const DAY_CAP = 30; // After 30 days, staleness factor maxes out

    const weights = practicableSongs.map(song => {
      // Days since last practice (never-practiced songs get max priority)
      const lastPractice = song.lastPracticeDate ? new Date(song.lastPracticeDate).getTime() : 0;
      const rawDays = lastPractice ? (now - lastPractice) / (1000 * 60 * 60 * 24) : DAY_CAP;
      const daysSinceLastPractice = Math.min(rawDays, DAY_CAP);

      // Level weight: lower level = higher priority (treat null/seen as level 0)
      const level = song.level || 0;
      const levelWeight = 26 - level; // Max level is 25, so this gives 1-26 range

      // Combined weight: multiply factors together
      // Add 1 to days to avoid zero weight for songs practiced today
      return (daysSinceLastPractice + 1) * levelWeight;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    let song = practicableSongs[selectedIndex];
    setEntryDirection(null); // Reset direction when selecting random
    const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = song;
    openPracticeView(cleanSong);
  };

  const handleToggleDeck = async (deckId, songId, isInDeck) => {
    // Optimistic UI update
    setPlaylists(prev => (prev || []).map(d =>
      d.deckId === deckId ? { ...d, containsSong: !isInDeck } : d
    ));

    try {
      if (isInDeck) {
        await removeSongFromDeck(deckId, songId);
      } else {
        await addSongToDeck(deckId, songId);
      }
    } catch (error) {
      // Revert optimistic update
      setPlaylists(prev => (prev || []).map(d =>
        d.deckId === deckId ? { ...d, containsSong: isInDeck } : d
      ));
      console.error('Error toggling deck membership:', error);
      alert('Error updating deck');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedSong || selectedSong.status === 'mastered') return;

    try {
      const previousXp = selectedSong.xp ?? 0;
      const previousLevel = selectedSong.level ?? 1;

      const newStatus = selectedSong.status === 'refined' ? 'mastered' : 'refined';
      const newLevel = newStatus === 'mastered' ? 20 : 10;

      const updatedData = {
        status: newStatus,
        level: newLevel,
        xp: 0,
        highestLevelReached: Math.max(selectedSong.highestLevelReached || 0, newLevel)
      };

      const updatedSong = await updateSong(selectedSong.songId, updatedData);

      updatedSong.xpThreshold = xpThreshold(updatedSong.level);
      updatedSong.totalMinPlayed = await getTotalMinutesPlayed(updatedSong.songId);
      updatedSong.totalSessions = await getTotalPracticeSessions(updatedSong.songId);

      setSongs(prevSongs => prevSongs.map(s =>
        s.songId === selectedSong.songId ? updatedSong : s
      ));

      setSelectedSong({
        ...updatedSong,
        _previousXp: previousXp,
        _previousLevel: previousLevel
      });
    } catch (error) {
      console.error('Error upgrading song:', error);
      alert('Error upgrading song');
    }
  };

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

  if (practiceView) {
    const goToSongDetail = () => {
      const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = practiceView.song;
      setSelectedSong(cleanSong);
      setPracticeView(null);
    };

    return (
      <PracticeView
        key={practiceView.song.songId}
        song={practiceView.song}
        onSubmit={handlePracticeSubmit}
        onBack={handlePracticeBack}
        onGoToSong={goToSongDetail}
      />
    );
  }

  if (selectedSong) {
    const currentIndex = sortedSongs.findIndex(s => s.songId === selectedSong.songId);

    const handleNavigateSong = (direction) => {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < sortedSongs.length) {
        window.scrollTo(0, 0);
        setEntryDirection(direction > 0 ? 'up' : 'down');
        const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = sortedSongs[newIndex];
        setSelectedSong(cleanSong);
      }
    };

    const handleLyricsUpdate = (songId, lyrics) => {
      setSongs(prevSongs => prevSongs.map(s =>
        s.songId === songId ? { ...s, lyrics } : s
      ));
      setSelectedSong(prev => prev && prev.songId === songId ? { ...prev, lyrics } : prev);
    };

    return (
      <SongDetailView
        key={selectedSong.songId}
        song={selectedSong}
        onBack={() => { setReturnFromSong(true); setSelectedSong(null); }}
        onPractice={() => openPracticeView(selectedSong, true)}
        onEdit={() => openEditView(selectedSong)}
        onDelete={handleSongDelete}
        onNavigate={handleNavigateSong}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < sortedSongs.length - 1}
        entryDirection={entryDirection}
        decks={playlists}
        onToggleDeck={handleToggleDeck}
        onUpgrade={handleUpgrade}
        onLyricsUpdate={handleLyricsUpdate}
      />
    );
  }

  return (
    <LibraryListView
      songs={sortedSongs}
      allSongs={songs}
      isLoading={isLoading}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      sortState={sortState}
      sortReversed={sortReversed}
      sortMenuOpen={sortMenuOpen}
      setSortMenuOpen={setSortMenuOpen}
      onSortSelect={handleSortSelect}
      onSelectSong={(song) => {
        setEntryDirection(null);
        const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = song;
        setSelectedSong(cleanSong);
      }}
      onQuickPractice={openPracticeView}
      onRandomSelect={handleRandomSelect}
      scrollPositionRef={scrollPositionRef}
      returnFromSong={returnFromSong}
      onReturnAnimationDone={() => setReturnFromSong(false)}
    />
  );
}

export default Library;
