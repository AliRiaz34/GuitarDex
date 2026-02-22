import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAllSongs, getAllDecks, getAllDeckSongs, getTotalMinutesPlayed, getTotalPracticeSessions, updateSong } from '../utils/supabaseDb';
import { xpThreshold, applyDecay } from '../utils/levelingSystem';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

async function enrichSong(song) {
  const decayed = applyDecay(song);

  if (
    decayed.xp !== song.xp ||
    decayed.level !== song.level ||
    decayed.status !== song.status
  ) {
    await updateSong(decayed.songId, decayed);
  }

  if (decayed.status !== 'seen') {
    decayed.xpThreshold = xpThreshold(decayed.level);
    decayed.totalMinPlayed = await getTotalMinutesPlayed(decayed.songId);
    decayed.totalSessions = await getTotalPracticeSessions(decayed.songId);
  }

  return decayed;
}

function enrichDecks(decksData, deckSongsData, songsData) {
  const songMap = new Map(songsData.map(s => [s.songId, s]));
  return decksData.map(deck => {
    const memberSongs = deckSongsData
      .filter(ds => ds.deckId === deck.deckId)
      .map(ds => songMap.get(ds.songId))
      .filter(Boolean);

    if (memberSongs.length === 0) return { ...deck, level: null, totalDuration: 0 };

    const totalDuration = memberSongs.reduce((sum, s) => sum + (s.songDuration ? Number(s.songDuration) : 0), 0);
    const withLevels = memberSongs.filter(s => s.level != null);
    const level = withLevels.length > 0
      ? Math.round(withLevels.reduce((sum, s) => sum + s.level, 0) / withLevels.length)
      : null;

    return { ...deck, level, totalDuration };
  });
}

export function DataProvider({ children }) {
  const { user, dataRevision } = useAuth();
  const [songs, setSongs] = useState([]);
  const [decks, setDecks] = useState([]);
  const [deckSongs, setDeckSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const songsRef = useRef(songs);
  songsRef.current = songs;

  useEffect(() => {
    if (!user) {
      setSongs([]);
      setDecks([]);
      setDeckSongs([]);
      setIsLoading(true);
      return;
    }

    const isBackgroundRefresh = !isLoading && songs.length > 0;

    async function loadAll() {
      if (!isBackgroundRefresh) setIsLoading(true);
      try {
        const [songsData, decksData, deckSongsData] = await Promise.all([
          getAllSongs(),
          getAllDecks(),
          getAllDeckSongs()
        ]);

        const processed = await Promise.all(songsData.map(enrichSong));
        const enrichedDecks = enrichDecks(decksData, deckSongsData, processed);

        setSongs(processed);
        setDeckSongs(deckSongsData);
        setDecks(enrichedDecks);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAll();
  }, [user, dataRevision]);

  async function refreshSongs() {
    try {
      const songsData = await getAllSongs();
      const processed = await Promise.all(songsData.map(enrichSong));
      setSongs(processed);
    } catch (error) {
      console.error('Error refreshing songs:', error);
    }
  }

  // Optimistically update deck membership and recompute deck levels locally
  function updateDeckMembership(deckId, songId, added) {
    setDeckSongs(prev => {
      const updated = added
        ? [...prev, { deckId, songId }]
        : prev.filter(ds => !(ds.deckId === deckId && ds.songId === songId));
      // Recompute enriched decks from the updated membership
      setDecks(currentDecks => {
        const rawDecks = currentDecks.map(({ level, totalDuration, ...rest }) => rest);
        return enrichDecks(rawDecks, updated, songsRef.current);
      });
      return updated;
    });
  }

  return (
    <DataContext.Provider value={{ songs, setSongs, decks, setDecks, deckSongs, isLoading, refreshSongs, updateDeckMembership }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
