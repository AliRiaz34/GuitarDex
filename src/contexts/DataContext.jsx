import { createContext, useContext, useState, useEffect } from 'react';
import { getAllSongs, getAllDecks, getTotalMinutesPlayed, getTotalPracticeSessions, updateSong } from '../utils/supabaseDb';
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

export function DataProvider({ children }) {
  const { user, dataRevision } = useAuth();
  const [songs, setSongs] = useState([]);
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSongs([]);
      setDecks([]);
      setIsLoading(true);
      return;
    }

    const isBackgroundRefresh = !isLoading && songs.length > 0;

    async function loadAll() {
      if (!isBackgroundRefresh) setIsLoading(true);
      try {
        const [songsData, decksData] = await Promise.all([
          getAllSongs(),
          getAllDecks()
        ]);

        const processed = await Promise.all(songsData.map(enrichSong));
        setSongs(processed);
        setDecks(decksData);
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

  async function refreshDecks() {
    try {
      const decksData = await getAllDecks();
      setDecks(decksData);
    } catch (error) {
      console.error('Error refreshing decks:', error);
    }
  }

  return (
    <DataContext.Provider value={{ songs, setSongs, decks, setDecks, isLoading, refreshSongs, refreshDecks }}>
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
