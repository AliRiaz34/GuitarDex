// Supabase-backed data layer for GuitarDex
// Drop-in replacement for db.js — same function signatures, backed by Supabase queries

import { supabase } from './supabaseClient';

// ─── Field name mapping (local camelCase ↔ Supabase snake_case) ───

const FIELD_MAP = {
  songs: {
    songId: 'id',
    artistName: 'artist_name',
    songDuration: 'song_duration',
    highestLevelReached: 'highest_level_reached',
    practiceStreak: 'practice_streak',
    lastPracticeDate: 'last_practice_date',
    lastDecayDate: 'last_decay_date',
    addDate: 'add_date',
    updated_at: 'updated_at',
  },
  practices: {
    practiceId: 'id',
    songId: 'song_id',
    minPlayed: 'min_played',
    xpGain: 'xp_gain',
    practiceDate: 'practice_date',
    updated_at: 'updated_at',
  },
  decks: {
    deckId: 'id',
    totalDuration: 'total_duration',
    creationDate: 'creation_date',
    updated_at: 'updated_at',
  },
  deck_songs: {
    id: 'id',
    deckId: 'deck_id',
    songId: 'song_id',
    order: 'sort_order',
    addedDate: 'added_date',
    updated_at: 'updated_at',
  },
};

const PASSTHROUGH_FIELDS = {
  songs: ['title', 'difficulty', 'tuning', 'capo', 'lyrics', 'status', 'level', 'xp'],
  practices: [],
  decks: ['title', 'description', 'level'],
  deck_songs: [],
};

const TRANSIENT_FIELDS = [
  '_previousXp', '_previousLevel', '_xpGain', '_fromPractice',
  'xpThreshold', 'totalMinPlayed', 'totalSessions'
];

function stripTransient(data) {
  const clean = { ...data };
  TRANSIENT_FIELDS.forEach(f => delete clean[f]);
  return clean;
}

function toRemote(table, localRecord, userId) {
  const remote = { user_id: userId };
  const fieldMap = FIELD_MAP[table] || {};
  const passthrough = PASSTHROUGH_FIELDS[table] || [];

  for (const [localKey, remoteKey] of Object.entries(fieldMap)) {
    if (localRecord[localKey] !== undefined) {
      remote[remoteKey] = localRecord[localKey];
    }
  }

  for (const field of passthrough) {
    if (localRecord[field] !== undefined) {
      remote[field] = localRecord[field];
    }
  }

  if (table === 'songs' && remote.xp == null) remote.xp = 0;

  return remote;
}

function toLocal(table, remoteRecord) {
  const local = {};
  const fieldMap = FIELD_MAP[table] || {};
  const passthrough = PASSTHROUGH_FIELDS[table] || [];

  const reverseMap = {};
  for (const [localKey, remoteKey] of Object.entries(fieldMap)) {
    reverseMap[remoteKey] = localKey;
  }

  for (const [remoteKey, value] of Object.entries(remoteRecord)) {
    if (remoteKey === 'user_id' || remoteKey === 'deleted_at') continue;
    if (reverseMap[remoteKey]) {
      local[reverseMap[remoteKey]] = value;
    } else if (passthrough.includes(remoteKey)) {
      local[remoteKey] = value;
    }
  }

  return local;
}

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

// ─── ID generation ───

export function generateId() {
  return crypto.randomUUID();
}

export function getNextSongId() {
  return Promise.resolve(generateId());
}

export function getNextPracticeId() {
  return Promise.resolve(generateId());
}

export function getNextDeckId() {
  return Promise.resolve(generateId());
}

// ─── Songs ───

export async function getAllSongs() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(r => toLocal('songs', r));
}

export async function getSongById(songId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', songId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return toLocal('songs', data);
}

export async function addSong(songData) {
  const userId = await getUserId();
  const clean = stripTransient(songData);
  const remote = toRemote('songs', clean, userId);

  const { error } = await supabase.from('songs').insert(remote);
  if (error) throw error;
  return songData;
}

export async function updateSong(songId, updates) {
  const userId = await getUserId();
  const clean = stripTransient(updates);
  const remote = toRemote('songs', clean, userId);
  // Remove user_id from update payload (can't change it)
  delete remote.user_id;

  const { data, error } = await supabase
    .from('songs')
    .update(remote)
    .eq('id', songId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toLocal('songs', data);
}

export async function deleteSong(songId) {
  const userId = await getUserId();

  // Find decks that contain this song (for updating deck levels after delete)
  const { data: deckSongRows } = await supabase
    .from('deck_songs')
    .select('deck_id')
    .eq('song_id', songId)
    .eq('user_id', userId);

  const affectedDeckIds = [...new Set((deckSongRows || []).map(r => r.deck_id))];

  // Delete deck_songs referencing this song
  await supabase
    .from('deck_songs')
    .delete()
    .eq('song_id', songId)
    .eq('user_id', userId);

  // Delete the song (practices cascade via FK)
  const { error } = await supabase
    .from('songs')
    .delete()
    .eq('id', songId)
    .eq('user_id', userId);

  if (error) throw error;

  // Update affected deck levels
  for (const deckId of affectedDeckIds) {
    try { await updateDeckLevel(deckId); } catch (e) { console.error('Error updating deck level after song delete:', e); }
  }
}

// ─── Practices ───

export async function getAllPractices() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('practices')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(r => toLocal('practices', r));
}

export async function getPracticesBySongId(songId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('practices')
    .select('*')
    .eq('song_id', songId)
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(r => toLocal('practices', r));
}

export async function addPractice(practiceData) {
  const userId = await getUserId();
  const remote = toRemote('practices', practiceData, userId);

  const { error } = await supabase.from('practices').insert(remote);
  if (error) throw error;
  return practiceData;
}

export async function getTotalMinutesPlayed(songId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('practices')
    .select('min_played')
    .eq('song_id', songId)
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).reduce((total, r) => total + (Number(r.min_played) || 0), 0);
}

export async function getTotalPracticeSessions(songId) {
  const userId = await getUserId();
  const { count, error } = await supabase
    .from('practices')
    .select('*', { count: 'exact', head: true })
    .eq('song_id', songId)
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

// ─── Decks ───

export async function getAllDecks() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(r => toLocal('decks', r));
}

export async function getDeckById(deckId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return toLocal('decks', data);
}

export async function addDeck(deckData) {
  const userId = await getUserId();
  const remote = toRemote('decks', deckData, userId);

  const { error } = await supabase.from('decks').insert(remote);
  if (error) throw error;
  return deckData;
}

export async function updateDeck(deckId, updates) {
  const userId = await getUserId();
  const remote = toRemote('decks', updates, userId);
  delete remote.user_id;

  const { data, error } = await supabase
    .from('decks')
    .update(remote)
    .eq('id', deckId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return toLocal('decks', data);
}

export async function deleteDeck(deckId) {
  const userId = await getUserId();

  // Delete deck_songs first (FK constraint)
  await supabase
    .from('deck_songs')
    .delete()
    .eq('deck_id', deckId)
    .eq('user_id', userId);

  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ─── Deck-Song relationships ───

export async function addSongToDeck(deckId, songId, order) {
  const userId = await getUserId();
  const deckSongData = {
    id: generateId(),
    deckId,
    songId,
    order: order || Date.now(),
    addedDate: new Date().toISOString(),
  };
  const remote = toRemote('deck_songs', deckSongData, userId);

  const { error } = await supabase.from('deck_songs').insert(remote);
  if (error) throw error;

  try { await updateDeckLevel(deckId); } catch (e) { console.error('Error updating deck level:', e); }
  return deckSongData;
}

export async function removeSongFromDeck(deckId, songId) {
  const userId = await getUserId();

  const { error } = await supabase
    .from('deck_songs')
    .delete()
    .eq('deck_id', deckId)
    .eq('song_id', songId)
    .eq('user_id', userId);

  if (error) throw error;

  try { await updateDeckLevel(deckId); } catch (e) { console.error('Error updating deck level:', e); }
}

export async function getSongsInDeck(deckId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('deck_songs')
    .select('*')
    .eq('deck_id', deckId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []).map(r => toLocal('deck_songs', r));
}

export async function getDecksContainingSong(songId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('deck_songs')
    .select('deck_id')
    .eq('song_id', songId)
    .eq('user_id', userId);

  if (error) throw error;
  return [...new Set((data || []).map(r => r.deck_id))];
}

export async function updateDeckSongOrder(deckId, songOrderArray) {
  const userId = await getUserId();

  // Fetch current deck_songs for this deck
  const { data: deckSongs, error: fetchError } = await supabase
    .from('deck_songs')
    .select('*')
    .eq('deck_id', deckId)
    .eq('user_id', userId);

  if (fetchError) throw fetchError;

  // Update sort_order for each song
  for (let idx = 0; idx < songOrderArray.length; idx++) {
    const songId = songOrderArray[idx];
    const row = deckSongs.find(ds => ds.song_id === songId);
    if (row) {
      await supabase
        .from('deck_songs')
        .update({ sort_order: idx })
        .eq('id', row.id)
        .eq('user_id', userId);
    }
  }
}

export async function getDecksForMenu(songId = null) {
  const decks = await getAllDecks();

  if (songId === null) {
    return decks.map(deck => ({
      deckId: deck.deckId,
      title: deck.title,
      containsSong: false
    }));
  }

  const deckIdsContainingSong = await getDecksContainingSong(songId);
  const deckIdsSet = new Set(deckIdsContainingSong);

  return decks.map(deck => ({
    deckId: deck.deckId,
    title: deck.title,
    containsSong: deckIdsSet.has(deck.deckId)
  }));
}

export async function getMasteredSongs() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'mastered');

  if (error) throw error;
  return (data || []).map(r => toLocal('songs', r));
}

export async function updateDeckLevel(deckId) {
  const deckSongs = await getSongsInDeck(deckId);

  if (deckSongs.length === 0) {
    await updateDeck(deckId, { level: null, totalDuration: 0 });
    return { level: null, totalDuration: 0 };
  }

  const songPromises = deckSongs.map(ds => getSongById(ds.songId));
  const songs = await Promise.all(songPromises);

  const totalDuration = songs.reduce((sum, song) => {
    return sum + (song && song.songDuration ? Number(song.songDuration) : 0);
  }, 0);

  const songsWithLevels = songs.filter(song => song && song.level != null);

  let averageLevel;
  if (songsWithLevels.length === 0) {
    averageLevel = null;
  } else {
    const totalLevel = songsWithLevels.reduce((sum, song) => sum + song.level, 0);
    averageLevel = Math.round(totalLevel / songsWithLevels.length);
  }

  await updateDeck(deckId, { level: averageLevel, totalDuration });
  return { level: averageLevel, totalDuration };
}
