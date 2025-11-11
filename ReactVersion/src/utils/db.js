// IndexedDB wrapper for GuitarDex
const DB_NAME = 'GuitarDexDB';
const DB_VERSION = 1;
const SONGS_STORE = 'songs';
const PRACTICES_STORE = 'practices';

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
