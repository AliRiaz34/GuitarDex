import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PracticeView from './PracticeView';
import SongDetailView from './SongDetailView';
import LibraryListView from './LibraryListView';
import EditView from './EditView';
import { getAllSongs, getTotalMinutesPlayed, getTotalPracticeSessions, addPractice, getNextPracticeId, updateSong, getDecksForMenu, addSongToDeck, removeSongFromDeck } from '../../utils/db';
import { xpThreshold, applyDecay, updateSongWithPractice } from '../../utils/levelingSystem';
import './Library.css';

function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [sortState, setSortState] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState(null);
  const [sortReversed, setSortReversed] = useState(false);
  const [entryDirection, setEntryDirection] = useState(null); // Track animation direction

  const [practiceView, setPracticeView] = useState(null); // { song, fromSongView }

  const [editView, setEditView] = useState(null); // song to edit

  useEffect(() => {
    async function loadSongs() {
      try {
        setIsLoading(true);
        const songsInfo = await getAllSongs();

        const processedSongs = await Promise.all(
          songsInfo.map(async (song) => {
            const decayedSong = applyDecay(song);

            if (
              decayedSong.xp !== song.xp ||
              decayedSong.level !== song.level ||
              decayedSong.status !== song.status
            ) {
              await updateSong(decayedSong.songId, decayedSong);
            }

            if (decayedSong.status !== "seen") {
              decayedSong.xpThreshold = xpThreshold(decayedSong.level);
              decayedSong.totalMinPlayed = await getTotalMinutesPlayed(decayedSong.songId);
              decayedSong.totalSessions = await getTotalPracticeSessions(decayedSong.songId);
            }

            return decayedSong;
          })
        );

        setSongs(processedSongs);
      } catch (error) {
        console.error('Error loading songs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSongs();
  }, []);

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
    if (location.state?.newSong) {
      const newSong = location.state.newSong;
      setSongs(prevSongs => [newSong, ...prevSongs]);
      setSelectedSong(newSong);
      setPracticeView(null);
      setEditView(null);
    } else if (location.pathname === '/library' || location.pathname === '/') {
      setPracticeView(null);
      setSelectedSong(null);
      setSearchQuery('');
      setEditView(null);
    }
  }, [location]);

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
    let i = Math.floor(Math.random() * filteredSongs.length);
    let song = filteredSongs[i];
    setEntryDirection(null); // Reset direction when selecting random
    const { _previousXp, _previousLevel, _xpGain, _fromPractice, ...cleanSong } = song;
    openPracticeView(cleanSong);
  };

  const handleToggleDeck = async (deckId, songId, isInDeck) => {
    try {
      if (isInDeck) {
        await removeSongFromDeck(deckId, songId);
      } else {
        await addSongToDeck(deckId, songId);
      }
      const decksData = await getDecksForMenu(songId);
      setPlaylists(decksData);
    } catch (error) {
      console.error('Error toggling deck membership:', error);
      alert('Error updating deck');
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

    return (
      <SongDetailView
        key={selectedSong.songId}
        song={selectedSong}
        onBack={() => setSelectedSong(null)}
        onPractice={() => openPracticeView(selectedSong, true)}
        onEdit={() => openEditView(selectedSong)}
        onDelete={handleSongDelete}
        onNavigate={handleNavigateSong}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < sortedSongs.length - 1}
        entryDirection={entryDirection}
        decks={playlists}
        onToggleDeck={handleToggleDeck}
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
    />
  );
}

export default Library;
