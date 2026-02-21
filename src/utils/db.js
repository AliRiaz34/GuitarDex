// IndexedDB wrapper for GuitarDex
const DB_NAME = 'GuitarDexDB';
const DB_VERSION = 7; // Added updated_at + UUID support
const SONGS_STORE = 'songs';
const PRACTICES_STORE = 'practices';
const DECKS_STORE = 'decks';
const DECK_SONGS_STORE = 'deck_songs';

let dbInstance = null;
let syncCallback = null;

// Register a callback that fires after every write operation
// Used by the sync layer to queue changes for Supabase
export function registerSyncCallback(cb) {
  syncCallback = cb;
}

function notifySync(table, action, data) {
  if (syncCallback) {
    try {
      syncCallback(table, action, data);
    } catch (e) {
      console.error('Sync callback error:', e);
    }
  }
}

// Generate a UUID for new records (replaces sequential IDs)
export function generateId() {
  return crypto.randomUUID();
}

// Initialize the database
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      const transaction = event.target.transaction;

      // Create songs store
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = db.createObjectStore(SONGS_STORE, { keyPath: 'songId' });
        songsStore.createIndex('status', 'status', { unique: false });
        songsStore.createIndex('addDate', 'addDate', { unique: false });
        songsStore.createIndex('lastPracticeDate', 'lastPracticeDate', { unique: false });
      }

      // Create practices store
      if (!db.objectStoreNames.contains(PRACTICES_STORE)) {
        const practicesStore = db.createObjectStore(PRACTICES_STORE, { keyPath: 'practiceId' });
        practicesStore.createIndex('songId', 'songId', { unique: false });
        practicesStore.createIndex('practiceDate', 'practiceDate', { unique: false });
      }

      // Create decks store (metadata)
      if (!db.objectStoreNames.contains(DECKS_STORE)) {
        const decksStore = db.createObjectStore(DECKS_STORE, { keyPath: 'deckId' });
        decksStore.createIndex('creationDate', 'creationDate', { unique: false });
        decksStore.createIndex('title', 'title', { unique: false });
      }

      // Create deck_songs store (junction table for many-to-many relationship)
      if (!db.objectStoreNames.contains(DECK_SONGS_STORE)) {
        const deckSongsStore = db.createObjectStore(DECK_SONGS_STORE, { keyPath: 'id', autoIncrement: true });
        deckSongsStore.createIndex('deckId', 'deckId', { unique: false });
        deckSongsStore.createIndex('songId', 'songId', { unique: false });
        deckSongsStore.createIndex('deckSong', ['deckId', 'songId'], { unique: true }); // Prevent duplicate song in same deck
        deckSongsStore.createIndex('order', 'order', { unique: false });
      }

      // Migration for version 3: Add tuning to existing songs
      if (oldVersion < 3 && db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = transaction.objectStore(SONGS_STORE);
        const standardTuning = ['E', 'A', 'D', 'G', 'B', 'E'];

        songsStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const song = cursor.value;
            if (!song.tuning) {
              song.tuning = standardTuning;
              cursor.update(song);
            }
            cursor.continue();
          }
        };
      }

      // Migration for version 4: Add capo to existing songs
      if (oldVersion < 4 && db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = transaction.objectStore(SONGS_STORE);

        songsStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const song = cursor.value;
            if (song.capo === undefined) {
              song.capo = 0;
              cursor.update(song);
            }
            cursor.continue();
          }
        };
      }

      // Migration for version 5: Leveling system rebalance
      if (oldVersion < 5 && db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = transaction.objectStore(SONGS_STORE);

        const OLD_EXPONENT = 1.4;
        const NEW_EXPONENT = 1.2;
        const XP_BASE = 50;
        const NEW_MAX_MASTERY = 20;
        const NEW_MAX_REFINED = 10;

        const xpThreshold = (level, exponent) => Math.floor(XP_BASE * Math.pow(level, exponent));

        const totalXpForLevel = (level, xp, exponent) => {
          let total = xp;
          for (let l = 1; l < level; l++) {
            total += xpThreshold(l, exponent);
          }
          return total;
        };

        const xpToLevelAndRemainder = (totalXp, exponent) => {
          let level = 1;
          let remaining = totalXp;
          while (remaining >= xpThreshold(level, exponent)) {
            remaining -= xpThreshold(level, exponent);
            level++;
          }
          return { level, xp: remaining };
        };

        songsStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const song = cursor.value;

            if (song.practiceStreak === undefined) {
              song.practiceStreak = song.level === null ? null : 0;
            }

            if (song.level !== null && song.level !== undefined) {
              const oldTotalXp = totalXpForLevel(song.level, song.xp || 0, OLD_EXPONENT);
              const newResult = xpToLevelAndRemainder(oldTotalXp, NEW_EXPONENT);
              song.level = newResult.level;
              song.xp = newResult.xp;

              if (song.highestLevelReached !== null) {
                const oldHighestTotalXp = totalXpForLevel(song.highestLevelReached, 0, OLD_EXPONENT);
                const newHighestResult = xpToLevelAndRemainder(oldHighestTotalXp, NEW_EXPONENT);
                song.highestLevelReached = Math.max(newHighestResult.level, song.level);
              }

              if (song.level >= NEW_MAX_MASTERY) {
                song.status = 'mastered';
              } else if (song.level >= NEW_MAX_REFINED) {
                if (song.status !== 'mastered') {
                  song.status = 'refined';
                }
              }
            }

            cursor.update(song);
            cursor.continue();
          }
        };
      }

      // Migration for version 6: Add lyrics to existing songs
      if (oldVersion < 6 && db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = transaction.objectStore(SONGS_STORE);

        songsStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const song = cursor.value;
            if (song.lyrics === undefined) {
              song.lyrics = '';
              cursor.update(song);
            }
            cursor.continue();
          }
        };
      }

      // Migration for version 7: Add updated_at to all existing records
      if (oldVersion < 7) {
        const now = new Date().toISOString();
        const stores = [SONGS_STORE, PRACTICES_STORE, DECKS_STORE, DECK_SONGS_STORE];

        stores.forEach(storeName => {
          if (db.objectStoreNames.contains(storeName)) {
            const store = transaction.objectStore(storeName);
            store.openCursor().onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                const record = cursor.value;
                if (!record.updated_at) {
                  record.updated_at = now;
                  cursor.update(record);
                }
                cursor.continue();
              }
            };
          }
        });
      }
    };
  });
}

// Get database instance
async function getDB() {
  if (!dbInstance) {
    await initDB();
  }
  return dbInstance;
}

// SONGS OPERATIONS

// Get all songs
export async function getAllSongs() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE], 'readonly');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get songs'));
    };
  });
}

// Get a single song by ID
export async function getSongById(songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE], 'readonly');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.get(songId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get song'));
    };
  });
}

// Add a new song
export async function addSong(songData) {
  const db = await getDB();
  songData.updated_at = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.add(songData);

    request.onsuccess = () => {
      notifySync('songs', 'upsert', songData);
      resolve(songData);
    };

    request.onerror = () => {
      reject(new Error('Failed to add song'));
    };
  });
}

// Update a song
export async function updateSong(songId, updates) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);

    const getRequest = store.get(songId);

    getRequest.onsuccess = () => {
      const existingSong = getRequest.result;

      if (!existingSong) {
        reject(new Error('Song not found'));
        return;
      }

      const updatedSong = { ...existingSong, ...updates, updated_at: new Date().toISOString() };

      const putRequest = store.put(updatedSong);

      putRequest.onsuccess = () => {
        notifySync('songs', 'upsert', updatedSong);
        resolve(updatedSong);
      };

      putRequest.onerror = () => {
        reject(new Error('Failed to update song'));
      };
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get existing song'));
    };
  });
}

// Delete a song and all associated practices (cascade delete)
export async function deleteSong(songId) {
  const db = await getDB();
  // Get the song data before deleting (needed for sync)
  const songToDelete = await getSongById(songId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE, PRACTICES_STORE], 'readwrite');

    const practicesStore = transaction.objectStore(PRACTICES_STORE);
    const practicesIndex = practicesStore.index('songId');
    const practicesRequest = practicesIndex.openCursor(IDBKeyRange.only(songId));

    const deletedPracticeIds = [];

    practicesRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        deletedPracticeIds.push(cursor.value.practiceId);
        cursor.delete();
        cursor.continue();
      } else {
        const songsStore = transaction.objectStore(SONGS_STORE);
        songsStore.delete(songId);
      }
    };

    practicesRequest.onerror = () => {
      reject(new Error('Failed to delete associated practices'));
    };

    transaction.oncomplete = () => {
      if (songToDelete) {
        notifySync('songs', 'delete', { songId });
        // Also notify about deleted practices
        deletedPracticeIds.forEach(practiceId => {
          notifySync('practices', 'delete', { practiceId });
        });
      }
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to delete song'));
    };
  });
}

// Get next available song ID (now returns UUID)
export function getNextSongId() {
  return Promise.resolve(generateId());
}

// PRACTICES OPERATIONS

// Get all practices
export async function getAllPractices() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRACTICES_STORE], 'readonly');
    const store = transaction.objectStore(PRACTICES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get practices'));
    };
  });
}

// Get practices for a specific song
export async function getPracticesBySongId(songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRACTICES_STORE], 'readonly');
    const store = transaction.objectStore(PRACTICES_STORE);
    const index = store.index('songId');
    const request = index.getAll(songId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get practices for song'));
    };
  });
}

// Add a practice session
export async function addPractice(practiceData) {
  const db = await getDB();
  practiceData.updated_at = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRACTICES_STORE], 'readwrite');
    const store = transaction.objectStore(PRACTICES_STORE);
    const request = store.add(practiceData);

    request.onsuccess = () => {
      notifySync('practices', 'upsert', practiceData);
      resolve(practiceData);
    };

    request.onerror = () => {
      reject(new Error('Failed to add practice'));
    };
  });
}

// Get next available practice ID (now returns UUID)
export function getNextPracticeId() {
  return Promise.resolve(generateId());
}

// Get total minutes played for a song
export async function getTotalMinutesPlayed(songId) {
  const practices = await getPracticesBySongId(songId);
  return practices.reduce((total, practice) => total + (practice.minPlayed || 0), 0);
}

// Get total practice sessions for a song
export async function getTotalPracticeSessions(songId) {
  const practices = await getPracticesBySongId(songId);
  return practices.length;
}

// DECKS OPERATIONS

// Get all decks
export async function getAllDecks() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE], 'readonly');
    const store = transaction.objectStore(DECKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get decks'));
    };
  });
}

// Get a single deck by ID
export async function getDeckById(deckId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE], 'readonly');
    const store = transaction.objectStore(DECKS_STORE);
    const request = store.get(deckId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get deck'));
    };
  });
}

// Add a new deck
export async function addDeck(deckData) {
  const db = await getDB();
  deckData.updated_at = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE], 'readwrite');
    const store = transaction.objectStore(DECKS_STORE);
    const request = store.add(deckData);

    request.onsuccess = () => {
      notifySync('decks', 'upsert', deckData);
      resolve(deckData);
    };

    request.onerror = () => {
      reject(new Error('Failed to add deck'));
    };
  });
}

// Update a deck
export async function updateDeck(deckId, updates) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE], 'readwrite');
    const store = transaction.objectStore(DECKS_STORE);

    const getRequest = store.get(deckId);

    getRequest.onsuccess = () => {
      const existingDeck = getRequest.result;

      if (!existingDeck) {
        reject(new Error('Deck not found'));
        return;
      }

      const updatedDeck = { ...existingDeck, ...updates, updated_at: new Date().toISOString() };
      const putRequest = store.put(updatedDeck);

      putRequest.onsuccess = () => {
        notifySync('decks', 'upsert', updatedDeck);
        resolve(updatedDeck);
      };

      putRequest.onerror = () => {
        reject(new Error('Failed to update deck'));
      };
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get existing deck'));
    };
  });
}

// Delete a deck and all associated deck-song relationships
export async function deleteDeck(deckId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE, DECK_SONGS_STORE], 'readwrite');

    const deckSongsStore = transaction.objectStore(DECK_SONGS_STORE);
    const deckSongsIndex = deckSongsStore.index('deckId');
    const deckSongsRequest = deckSongsIndex.openCursor(IDBKeyRange.only(deckId));

    const deletedDeckSongIds = [];

    deckSongsRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        deletedDeckSongIds.push(cursor.value.id);
        cursor.delete();
        cursor.continue();
      } else {
        const decksStore = transaction.objectStore(DECKS_STORE);
        decksStore.delete(deckId);
      }
    };

    deckSongsRequest.onerror = () => {
      reject(new Error('Failed to delete deck songs'));
    };

    transaction.oncomplete = () => {
      notifySync('decks', 'delete', { deckId });
      deletedDeckSongIds.forEach(id => {
        notifySync('deck_songs', 'delete', { id });
      });
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to delete deck'));
    };
  });
}

// Get next available deck ID (now returns UUID)
export function getNextDeckId() {
  return Promise.resolve(generateId());
}

// DECK-SONG RELATIONSHIP OPERATIONS

// Add a song to a deck
export async function addSongToDeck(deckId, songId, order) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(DECK_SONGS_STORE);

    const deckSongData = {
      id: generateId(),
      deckId,
      songId,
      order: order || Date.now(),
      addedDate: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const request = store.add(deckSongData);

    request.onsuccess = async () => {
      notifySync('deck_songs', 'upsert', deckSongData);
      try {
        await updateDeckLevel(deckId);
        resolve(deckSongData);
      } catch (error) {
        console.error('Error updating deck level:', error);
        resolve(deckSongData);
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to add song to deck (may already exist)'));
    };
  });
}

// Remove a song from a deck
export async function removeSongFromDeck(deckId, songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const index = store.index('deckSong');
    const request = index.getKey([deckId, songId]);

    request.onsuccess = async () => {
      const key = request.result;
      if (key) {
        // Get the full record before deleting (for sync)
        const getRequest = store.get(key);
        getRequest.onsuccess = () => {
          const record = getRequest.result;
          const deleteRequest = store.delete(key);
          deleteRequest.onsuccess = async () => {
            if (record) {
              notifySync('deck_songs', 'delete', { id: record.id, deckId, songId });
            }
            try {
              await updateDeckLevel(deckId);
              resolve();
            } catch (error) {
              console.error('Error updating deck level:', error);
              resolve();
            }
          };
          deleteRequest.onerror = () => reject(new Error('Failed to remove song from deck'));
        };
      } else {
        reject(new Error('Song not found in deck'));
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to find song in deck'));
    };
  });
}

// Get all songs in a deck (returns array of songIds in order)
export async function getSongsInDeck(deckId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readonly');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const index = store.index('deckId');
    const request = index.getAll(deckId);

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => a.order - b.order);
      resolve(results);
    };

    request.onerror = () => {
      reject(new Error('Failed to get songs in deck'));
    };
  });
}

// Get all decks containing a specific song
export async function getDecksContainingSong(songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readonly');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const index = store.index('songId');
    const request = index.getAll(songId);

    request.onsuccess = () => {
      const deckIds = [...new Set(request.result.map(ps => ps.deckId))];
      resolve(deckIds);
    };

    request.onerror = () => {
      reject(new Error('Failed to get decks for song'));
    };
  });
}

// Update the order of songs in a deck
export async function updateDeckSongOrder(deckId, songOrderArray) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const index = store.index('deckId');
    const request = index.getAll(deckId);

    request.onsuccess = () => {
      const deckSongs = request.result;
      const now = new Date().toISOString();

      songOrderArray.forEach((songId, idx) => {
        const deckSong = deckSongs.find(ps => ps.songId === songId);
        if (deckSong) {
          deckSong.order = idx;
          deckSong.updated_at = now;
          store.put(deckSong);
          notifySync('deck_songs', 'upsert', deckSong);
        }
      });
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to update deck song order'));
    };
  });
}

// Get all decks with minimal data for menu (optionally check if a specific song is in each)
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

// Get all mastered songs (for virtual Mastered deck)
export async function getMasteredSongs() {
  const allSongs = await getAllSongs();
  return allSongs.filter(song => song.status === 'mastered');
}

// Get all deck-song relationships (used by sync layer)
export async function getAllDeckSongs() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readonly');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get deck songs'));
  });
}

// BACKUP & RESTORE OPERATIONS

// Export all data from all stores as a JSON object
export async function exportAllData() {
  const [songs, practices, decks] = await Promise.all([
    getAllSongs(),
    getAllPractices(),
    getAllDecks()
  ]);

  const deckSongs = await getAllDeckSongs();

  return {
    version: DB_VERSION,
    exportDate: new Date().toISOString(),
    data: { songs, practices, decks, deckSongs }
  };
}

// Import data from a backup JSON object (replaces all existing data)
export async function importAllData(backup) {
  if (!backup?.data) {
    throw new Error('Invalid backup file');
  }

  const db = await getDB();
  const { songs, practices, decks, deckSongs } = backup.data;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [SONGS_STORE, PRACTICES_STORE, DECKS_STORE, DECK_SONGS_STORE],
      'readwrite'
    );

    // Clear all stores first
    transaction.objectStore(SONGS_STORE).clear();
    transaction.objectStore(PRACTICES_STORE).clear();
    transaction.objectStore(DECKS_STORE).clear();
    transaction.objectStore(DECK_SONGS_STORE).clear();

    // Re-populate
    if (songs) songs.forEach(item => transaction.objectStore(SONGS_STORE).add(item));
    if (practices) practices.forEach(item => transaction.objectStore(PRACTICES_STORE).add(item));
    if (decks) decks.forEach(item => transaction.objectStore(DECKS_STORE).add(item));
    if (deckSongs) deckSongs.forEach(item => transaction.objectStore(DECK_SONGS_STORE).add(item));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to import data'));
  });
}

// Calculate and update the average level and total duration of a deck
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

// Direct put operations (used by sync layer to write pulled data without triggering sync callbacks)
export async function putSongDirect(songData) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.put(songData);
    request.onsuccess = () => resolve(songData);
    request.onerror = () => reject(new Error('Failed to put song'));
  });
}

export async function putPracticeDirect(practiceData) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRACTICES_STORE], 'readwrite');
    const store = transaction.objectStore(PRACTICES_STORE);
    const request = store.put(practiceData);
    request.onsuccess = () => resolve(practiceData);
    request.onerror = () => reject(new Error('Failed to put practice'));
  });
}

export async function putDeckDirect(deckData) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE], 'readwrite');
    const store = transaction.objectStore(DECKS_STORE);
    const request = store.put(deckData);
    request.onsuccess = () => resolve(deckData);
    request.onerror = () => reject(new Error('Failed to put deck'));
  });
}

export async function putDeckSongDirect(deckSongData) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const request = store.put(deckSongData);
    request.onsuccess = () => resolve(deckSongData);
    request.onerror = () => reject(new Error('Failed to put deck song'));
  });
}

// Delete operations without triggering sync (used by sync layer for remote deletions)
export async function deleteSongDirect(songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE, PRACTICES_STORE], 'readwrite');
    const practicesStore = transaction.objectStore(PRACTICES_STORE);
    const practicesIndex = practicesStore.index('songId');
    const practicesRequest = practicesIndex.openCursor(IDBKeyRange.only(songId));

    practicesRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        transaction.objectStore(SONGS_STORE).delete(songId);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to delete song direct'));
  });
}

export async function deleteDeckDirect(deckId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE, DECK_SONGS_STORE], 'readwrite');
    const deckSongsStore = transaction.objectStore(DECK_SONGS_STORE);
    const deckSongsIndex = deckSongsStore.index('deckId');
    const deckSongsRequest = deckSongsIndex.openCursor(IDBKeyRange.only(deckId));

    deckSongsRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        transaction.objectStore(DECKS_STORE).delete(deckId);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to delete deck direct'));
  });
}

export async function deletePracticeDirect(practiceId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRACTICES_STORE], 'readwrite');
    const store = transaction.objectStore(PRACTICES_STORE);
    const request = store.delete(practiceId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete practice direct'));
  });
}

export async function deleteDeckSongDirect(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(DECK_SONGS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete deck song direct'));
  });
}
