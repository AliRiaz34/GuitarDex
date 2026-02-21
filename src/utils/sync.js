// Supabase sync engine for GuitarDex
// Handles: push local changes to Supabase, pull remote changes, initial migration,
// and offline queue draining.

import { supabase } from './supabaseClient';
import {
  getAllSongs, getAllPractices, getAllDecks, getAllDeckSongs,
  putSongDirect, putPracticeDirect, putDeckDirect, putDeckSongDirect,
  deleteSongDirect, deleteDeckDirect, deletePracticeDirect, deleteDeckSongDirect,
  registerSyncCallback
} from './db';
import {
  enqueue, getQueue, clearQueue, getLastSyncTime, setLastSyncTime, isOnline
} from './syncQueue';

// ─── Field name mapping (local camelCase ↔ Supabase snake_case) ───

// Maps local field names to Supabase column names per table
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

// Fields that pass through unchanged (same name in both local and Supabase)
const PASSTHROUGH_FIELDS = {
  songs: ['title', 'difficulty', 'tuning', 'capo', 'lyrics', 'status', 'level', 'xp'],
  practices: [],
  decks: ['title', 'description', 'level'],
  deck_songs: [],
};

// Convert a local record to Supabase format
function toRemote(table, localRecord, userId) {
  const remote = { user_id: userId };
  const fieldMap = FIELD_MAP[table] || {};
  const passthrough = PASSTHROUGH_FIELDS[table] || [];

  // Map renamed fields
  for (const [localKey, remoteKey] of Object.entries(fieldMap)) {
    if (localRecord[localKey] !== undefined) {
      remote[remoteKey] = localRecord[localKey];
    }
  }

  // Pass through same-named fields
  for (const field of passthrough) {
    if (localRecord[field] !== undefined) {
      remote[field] = localRecord[field];
    }
  }

  // Handle nullable fields that have NOT NULL constraints in Supabase
  if (table === 'songs') {
    if (remote.xp == null) remote.xp = 0;
    if (remote.level == null) remote.level = 0;
    if (remote.highest_level_reached == null) remote.highest_level_reached = 0;
    if (remote.practice_streak == null) remote.practice_streak = 0;
  }

  return remote;
}

// Convert a Supabase record to local format
function toLocal(table, remoteRecord) {
  const local = {};
  const fieldMap = FIELD_MAP[table] || {};
  const passthrough = PASSTHROUGH_FIELDS[table] || [];

  // Build reverse map (remote → local)
  const reverseMap = {};
  for (const [localKey, remoteKey] of Object.entries(fieldMap)) {
    reverseMap[remoteKey] = localKey;
  }

  // Map all remote fields
  for (const [remoteKey, value] of Object.entries(remoteRecord)) {
    if (remoteKey === 'user_id' || remoteKey === 'deleted_at') continue;

    if (reverseMap[remoteKey]) {
      local[reverseMap[remoteKey]] = value;
    } else if (passthrough.includes(remoteKey)) {
      local[remoteKey] = value;
    }
    // Skip unknown fields (like user_id)
  }

  return local;
}

// Get the primary key field name for each table (local names)
function getLocalIdField(table) {
  switch (table) {
    case 'songs': return 'songId';
    case 'practices': return 'practiceId';
    case 'decks': return 'deckId';
    case 'deck_songs': return 'id';
    default: return 'id';
  }
}

// ─── Push operations ───

// Push a single record to Supabase (upsert)
async function pushUpsert(table, localRecord, userId) {
  const remote = toRemote(table, localRecord, userId);

  const { error } = await supabase
    .from(table)
    .upsert(remote, { onConflict: 'id' });

  if (error) {
    console.error(`Sync push error (${table}):`, error);
    throw error;
  }
}

// Push a delete to Supabase (hard delete — record is removed from table)
async function pushDelete(table, localData, userId) {
  const idField = getLocalIdField(table);
  const localId = localData[idField];

  if (!localId) {
    console.warn(`Cannot push delete for ${table}: no ID in data`, localData);
    return;
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', localId)
    .eq('user_id', userId);

  if (error) {
    console.error(`Sync delete error (${table}):`, error);
    throw error;
  }
}

// ─── Queue drain ───

// Process all pending sync operations
export async function drainQueue(userId) {
  if (!isOnline() || !userId) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  const failedOps = [];

  for (const op of queue) {
    try {
      if (op.action === 'upsert') {
        await pushUpsert(op.table, op.data, userId);
      } else if (op.action === 'delete') {
        await pushDelete(op.table, op.data, userId);
      }
    } catch (error) {
      console.error('Failed to sync operation:', op, error);
      failedOps.push(op);
    }
  }

  // Replace queue with only failed operations
  clearQueue();
  failedOps.forEach(op => enqueue(op));
}

// ─── Pull operations ───

// Pull all data from Supabase for a user
async function pullTable(table, userId, since = null) {
  let query = supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Sync pull error (${table}):`, error);
    throw error;
  }

  return data || [];
}

// Pull all data from Supabase and write to local IndexedDB
// Always does a full pull (no incremental — keeps it simple and reliable)
export async function pullFromRemote(userId) {
  if (!isOnline() || !userId) return;

  // Always pull everything (no lastSync filter)
  const [remoteSongs, remotePractices, remoteDecks, remoteDeckSongs] = await Promise.all([
    pullTable('songs', userId),
    pullTable('practices', userId),
    pullTable('decks', userId),
    pullTable('deck_songs', userId),
  ]);

  // Write all remote records to local IndexedDB
  for (const remote of remoteSongs) {
    await putSongDirect(toLocal('songs', remote));
  }

  for (const remote of remotePractices) {
    await putPracticeDirect(toLocal('practices', remote));
  }

  for (const remote of remoteDecks) {
    await putDeckDirect(toLocal('decks', remote));
  }

  for (const remote of remoteDeckSongs) {
    await putDeckSongDirect(toLocal('deck_songs', remote));
  }
}

// ─── Push all local data to remote ───

async function pushAllLocal(userId) {
  if (!isOnline() || !userId) return;

  const [songs, practices, decks, deckSongs] = await Promise.all([
    getAllSongs(),
    getAllPractices(),
    getAllDecks(),
    getAllDeckSongs(),
  ]);

  // Push in FK order: songs first, then practices and decks, then deck_songs
  if (songs.length > 0) {
    const remoteSongs = songs.map(s => toRemote('songs', s, userId));
    const { error } = await supabase.from('songs').upsert(remoteSongs, { onConflict: 'id' });
    if (error) console.error('Push songs error:', error);
  }

  if (practices.length > 0) {
    const remotePractices = practices.map(p => toRemote('practices', p, userId));
    const { error } = await supabase.from('practices').upsert(remotePractices, { onConflict: 'id' });
    if (error) console.error('Push practices error:', error);
  }

  if (decks.length > 0) {
    const remoteDecks = decks.map(d => toRemote('decks', d, userId));
    const { error } = await supabase.from('decks').upsert(remoteDecks, { onConflict: 'id' });
    if (error) console.error('Push decks error:', error);
  }

  if (deckSongs.length > 0) {
    const remoteDeckSongs = deckSongs.map(ds => toRemote('deck_songs', ds, userId));
    const { error } = await supabase.from('deck_songs').upsert(remoteDeckSongs, { onConflict: 'id' });
    if (error) console.error('Push deck_songs error:', error);
  }
}

// ─── Initial migration ───

// Migrate existing local data to Supabase (first-time sync)
// Converts any integer IDs to UUIDs before pushing
export async function initialMigration(userId) {
  if (!isOnline() || !userId) return;

  console.log('Starting initial migration to Supabase...');

  // Step 1: Read all local data
  const [songs, practices, decks, deckSongs] = await Promise.all([
    getAllSongs(),
    getAllPractices(),
    getAllDecks(),
    getAllDeckSongs(),
  ]);

  // Step 2: Check if any records have integer IDs that need UUID conversion
  const songIdMap = {}; // oldId → newUUID
  const deckIdMap = {}; // oldId → newUUID
  const practiceIdMap = {};
  let needsIdMigration = false;

  for (const song of songs) {
    if (typeof song.songId === 'number') {
      needsIdMigration = true;
      songIdMap[song.songId] = crypto.randomUUID();
    }
  }

  for (const deck of decks) {
    if (typeof deck.deckId === 'number') {
      needsIdMigration = true;
      deckIdMap[deck.deckId] = crypto.randomUUID();
    }
  }

  for (const practice of practices) {
    if (typeof practice.practiceId === 'number') {
      needsIdMigration = true;
      practiceIdMap[practice.practiceId] = crypto.randomUUID();
    }
  }

  if (needsIdMigration) {
    console.log('Migrating integer IDs to UUIDs...');

    // Migrate songs
    for (const song of songs) {
      const oldId = song.songId;
      if (typeof oldId === 'number') {
        // Delete old record and re-insert with UUID
        await deleteSongDirect(oldId);
        song.songId = songIdMap[oldId];
        song.updated_at = new Date().toISOString();
        await putSongDirect(song);
      }
    }

    // Migrate practices (update songId FK references)
    for (const practice of practices) {
      const oldId = practice.practiceId;
      const oldSongId = practice.songId;
      if (typeof oldId === 'number') {
        await deletePracticeDirect(oldId);
        practice.practiceId = practiceIdMap[oldId];
      }
      if (songIdMap[oldSongId]) {
        practice.songId = songIdMap[oldSongId];
      }
      practice.updated_at = new Date().toISOString();
      await putPracticeDirect(practice);
    }

    // Migrate decks
    for (const deck of decks) {
      const oldId = deck.deckId;
      if (typeof oldId === 'number') {
        await deleteDeckDirect(oldId);
        deck.deckId = deckIdMap[oldId];
        deck.updated_at = new Date().toISOString();
        await putDeckDirect(deck);
      }
    }

    // Migrate deck_songs (update deckId and songId FK references)
    for (const ds of deckSongs) {
      const oldId = ds.id;
      const oldDeckId = ds.deckId;
      const oldSongId = ds.songId;

      if (typeof oldId === 'number') {
        await deleteDeckSongDirect(oldId);
        ds.id = crypto.randomUUID();
      }
      if (deckIdMap[oldDeckId]) {
        ds.deckId = deckIdMap[oldDeckId];
      }
      if (songIdMap[oldSongId]) {
        ds.songId = songIdMap[oldSongId];
      }
      ds.updated_at = new Date().toISOString();
      await putDeckSongDirect(ds);
    }

    console.log('ID migration complete.');
  }

  // Step 3: Push all local data to Supabase
  await pushAllLocal(userId);

  setLastSyncTime(new Date().toISOString());
  console.log('Initial migration complete.');
}

// ─── Full sync ───

// Full sync: pull remote changes, then push local changes, then drain queue
export async function fullSync(userId) {
  if (!isOnline() || !userId) return;

  try {
    // Pull remote changes first (so we have latest remote state)
    await pullFromRemote(userId);

    // Push any local changes that are newer than remote
    await pushAllLocal(userId);

    // Drain any queued operations
    await drainQueue(userId);

    setLastSyncTime(new Date().toISOString());
  } catch (error) {
    console.error('Full sync error:', error);
  }
}

// ─── Check if remote has data ───

export async function remoteHasData(userId) {
  if (!isOnline() || !userId) return false;

  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error checking remote data:', error);
    return false;
  }

  return (count || 0) > 0;
}

// ─── Check if local has data ───

export async function localHasData() {
  const songs = await getAllSongs();
  return songs.length > 0;
}

// ─── Initialize sync system ───

// Call this after user is authenticated
export async function initSync(userId) {
  if (!userId) return;

  // Register the sync callback so db.js notifies us of changes
  registerSyncCallback((table, action, data) => {
    enqueue({ table, action, data });

    // Try to push immediately if online
    if (isOnline()) {
      drainQueue(userId).catch(err =>
        console.error('Background sync drain error:', err)
      );
    }
  });

  // Listen for coming back online
  const handleOnline = () => {
    drainQueue(userId).catch(err =>
      console.error('Online sync drain error:', err)
    );
  };
  window.addEventListener('online', handleOnline);

  // Perform initial sync if online
  if (isOnline()) {
    try {
      const hasRemote = await remoteHasData(userId);
      const hasLocal = await localHasData();

      if (!hasRemote && hasLocal) {
        // First time: push local data to Supabase
        await initialMigration(userId);
        // Clear any stale queue entries from before migration
        clearQueue();
      } else if (hasRemote) {
        // Remote has data: pull it (covers both "new device" and "returning user")
        await pullFromRemote(userId);
        // Clear queue before push — stale pre-sync entries could conflict with pulled data
        clearQueue();
        // Then push any local-only data
        if (hasLocal) {
          await pushAllLocal(userId);
        }
        setLastSyncTime(new Date().toISOString());
      }
      // If neither has data: nothing to sync
    } catch (error) {
      console.error('Init sync error:', error);
    }
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    registerSyncCallback(null);
  };
}
