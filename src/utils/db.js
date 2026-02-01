// IndexedDB wrapper for GuitarDex
const DB_NAME = 'GuitarDexDB';
const DB_VERSION = 6; // Incremented for lyrics field
const SONGS_STORE = 'songs';
const PRACTICES_STORE = 'practices';
const DECKS_STORE = 'decks';
const DECK_SONGS_STORE = 'deck_songs';

let dbInstance = null;

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
            // Add tuning if it doesn't exist
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
            // Add capo if it doesn't exist
            if (song.capo === undefined) {
              song.capo = 0;
              cursor.update(song);
            }
            cursor.continue();
          }
        };
      }

      // Migration for version 5: Leveling system rebalance
      // - Change XP_SCALING_EXPONENT from 1.4 to 1.2
      // - Change MAX_LEVEL_BEFORE_MASTERY from 25 to 20
      // - Add practiceStreak field
      if (oldVersion < 5 && db.objectStoreNames.contains(SONGS_STORE)) {
        const songsStore = transaction.objectStore(SONGS_STORE);

        // Old and new constants
        const OLD_EXPONENT = 1.4;
        const NEW_EXPONENT = 1.2;
        const XP_BASE = 50;
        const NEW_MAX_MASTERY = 20;
        const NEW_MAX_REFINED = 10;

        // Helper to calculate XP threshold
        const xpThreshold = (level, exponent) => Math.floor(XP_BASE * Math.pow(level, exponent));

        // Helper to calculate total XP for a level + remaining xp
        const totalXpForLevel = (level, xp, exponent) => {
          let total = xp;
          for (let l = 1; l < level; l++) {
            total += xpThreshold(l, exponent);
          }
          return total;
        };

        // Helper to convert total XP back to level + remaining xp
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

            // Add practiceStreak field to all songs
            if (song.practiceStreak === undefined) {
              song.practiceStreak = song.level === null ? null : 0;
            }

            // Only convert XP for songs with level data
            if (song.level !== null && song.level !== undefined) {
              // Calculate total XP under old system
              const oldTotalXp = totalXpForLevel(song.level, song.xp || 0, OLD_EXPONENT);

              // Convert to new system
              const newResult = xpToLevelAndRemainder(oldTotalXp, NEW_EXPONENT);
              song.level = newResult.level;
              song.xp = newResult.xp;

              // Update highestLevelReached proportionally
              if (song.highestLevelReached !== null) {
                const oldHighestTotalXp = totalXpForLevel(song.highestLevelReached, 0, OLD_EXPONENT);
                const newHighestResult = xpToLevelAndRemainder(oldHighestTotalXp, NEW_EXPONENT);
                song.highestLevelReached = Math.max(newHighestResult.level, song.level);
              }

              // Recalculate status based on new thresholds
              if (song.level >= NEW_MAX_MASTERY) {
                song.status = 'mastered';
              } else if (song.level >= NEW_MAX_REFINED) {
                // Only upgrade to refined, don't downgrade from mastered
                if (song.status !== 'mastered') {
                  song.status = 'refined';
                }
              }
              // Keep learning/stale status for lower levels
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
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.add(songData);

    request.onsuccess = () => {
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
    
    // First, get the existing song
    const getRequest = store.get(songId);
    
    getRequest.onsuccess = () => {
      const existingSong = getRequest.result;
      
      if (!existingSong) {
        reject(new Error('Song not found'));
        return;
      }
      
      // Merge updates with existing data
      const updatedSong = { ...existingSong, ...updates };
      
      // Now put the merged object
      const putRequest = store.put(updatedSong);
      
      putRequest.onsuccess = () => {
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
  return new Promise((resolve, reject) => {
    // Transaction needs access to both stores for cascade delete
    const transaction = db.transaction([SONGS_STORE, PRACTICES_STORE], 'readwrite');

    // First, delete all practices associated with this song
    const practicesStore = transaction.objectStore(PRACTICES_STORE);
    const practicesIndex = practicesStore.index('songId');
    const practicesRequest = practicesIndex.openCursor(IDBKeyRange.only(songId));

    practicesRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        // All practices deleted, now delete the song
        const songsStore = transaction.objectStore(SONGS_STORE);
        songsStore.delete(songId);
      }
    };

    practicesRequest.onerror = () => {
      reject(new Error('Failed to delete associated practices'));
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to delete song'));
    };
  });
}

// Get next available song ID
export async function getNextSongId() {
  const songs = await getAllSongs();
  if (songs.length === 0) return 1;
  const maxId = Math.max(...songs.map(s => s.songId));
  return maxId + 1;
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
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PRACTICES_STORE], 'readwrite');
    const store = transaction.objectStore(PRACTICES_STORE);
    const request = store.add(practiceData);

    request.onsuccess = () => {
      resolve(practiceData);
    };

    request.onerror = () => {
      reject(new Error('Failed to add practice'));
    };
  });
}

// Get next available practice ID
export async function getNextPracticeId() {
  const practices = await getAllPractices();
  if (practices.length === 0) return 1;
  const maxId = Math.max(...practices.map(p => p.practiceId));
  return maxId + 1;
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

// DECKS (DECKS) OPERATIONS
// Note: Using "deck" terminology in function names while maintaining "deck" in database
// for backwards compatibility

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
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE], 'readwrite');
    const store = transaction.objectStore(DECKS_STORE);
    const request = store.add(deckData);

    request.onsuccess = () => {
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

      const updatedDeck = { ...existingDeck, ...updates };
      const putRequest = store.put(updatedDeck);

      putRequest.onsuccess = () => {
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

    // First, delete all deck-song entries
    const deckSongsStore = transaction.objectStore(DECK_SONGS_STORE);
    const deckSongsIndex = deckSongsStore.index('deckId');
    const deckSongsRequest = deckSongsIndex.openCursor(IDBKeyRange.only(deckId));

    deckSongsRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        // All deck-song entries deleted, now delete the deck
        const decksStore = transaction.objectStore(DECKS_STORE);
        decksStore.delete(deckId);
      }
    };

    deckSongsRequest.onerror = () => {
      reject(new Error('Failed to delete deck songs'));
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to delete deck'));
    };
  });
}

// Get next available deck ID
export async function getNextDeckId() {
  const decks = await getAllDecks();
  if (decks.length === 0) return 1;
  const maxId = Math.max(...decks.map(p => p.deckId));
  return maxId + 1;
}

// DECK-SONG RELATIONSHIP OPERATIONS

// Add a song to a deck
export async function addSongToDeck(deckId, songId, order) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DECK_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(DECK_SONGS_STORE);

    const deckSongData = {
      deckId,
      songId,
      order: order || Date.now(), // Use timestamp as default order
      addedDate: new Date().toISOString()
    };

    const request = store.add(deckSongData);

    request.onsuccess = async () => {
      // Update deck level after adding song
      try {
        await updateDeckLevel(deckId);
        resolve(deckSongData);
      } catch (error) {
        console.error('Error updating deck level:', error);
        resolve(deckSongData); // Still resolve with the added song data
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
        const deleteRequest = store.delete(key);
        deleteRequest.onsuccess = async () => {
          // Update deck level after removing song
          try {
            await updateDeckLevel(deckId);
            resolve();
          } catch (error) {
            console.error('Error updating deck level:', error);
            resolve(); // Still resolve
          }
        };
        deleteRequest.onerror = () => reject(new Error('Failed to remove song from deck'));
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
      // Sort by order field
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
      // Return unique deck IDs
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

      // Update order for each song
      songOrderArray.forEach((songId, index) => {
        const deckSong = deckSongs.find(ps => ps.songId === songId);
        if (deckSong) {
          deckSong.order = index;
          store.put(deckSong);
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
    // Just return deck metadata
    return decks.map(deck => ({
      deckId: deck.deckId,
      title: deck.title,
      containsSong: false
    }));
  }

  // Check which decks contain the song
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

// Calculate and update the average level and total duration of a deck
export async function updateDeckLevel(deckId) {
  // Get all songs in the deck
  const deckSongs = await getSongsInDeck(deckId);

  if (deckSongs.length === 0) {
    // No songs in deck, set level and duration to null/0
    await updateDeck(deckId, { level: null, totalDuration: 0 });
    return { level: null, totalDuration: 0 };
  }

  // Get full song data for each song in deck
  const songPromises = deckSongs.map(ds => getSongById(ds.songId));
  const songs = await Promise.all(songPromises);

  // Calculate total duration (sum of all song durations)
  const totalDuration = songs.reduce((sum, song) => {
    return sum + (song && song.songDuration ? Number(song.songDuration) : 0);
  }, 0);

  // Filter out songs with null levels (seen songs) and calculate average level
  const songsWithLevels = songs.filter(song => song && song.level != null);

  let averageLevel;
  if (songsWithLevels.length === 0) {
    // All songs are "seen" (no level), set deck level to null
    averageLevel = null;
  } else {
    // Calculate average level
    const totalLevel = songsWithLevels.reduce((sum, song) => sum + song.level, 0);
    averageLevel = Math.round(totalLevel / songsWithLevels.length);
  }

  // Update deck with new average level and total duration
  await updateDeck(deckId, { level: averageLevel, totalDuration });
  return { level: averageLevel, totalDuration };
}
