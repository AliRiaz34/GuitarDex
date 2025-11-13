// IndexedDB wrapper for GuitarDex
const DB_NAME = 'GuitarDexDB';
const DB_VERSION = 2; // Incremented to add playlists stores
const SONGS_STORE = 'songs';
const PRACTICES_STORE = 'practices';
const PLAYLISTS_STORE = 'playlists';
const PLAYLIST_SONGS_STORE = 'playlist_songs';

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

      // Create playlists store (metadata)
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        const playlistsStore = db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'playlistId' });
        playlistsStore.createIndex('createdDate', 'createdDate', { unique: false });
        playlistsStore.createIndex('title', 'title', { unique: false });
      }

      // Create playlist_songs store (junction table for many-to-many relationship)
      if (!db.objectStoreNames.contains(PLAYLIST_SONGS_STORE)) {
        const playlistSongsStore = db.createObjectStore(PLAYLIST_SONGS_STORE, { keyPath: 'id', autoIncrement: true });
        playlistSongsStore.createIndex('playlistId', 'playlistId', { unique: false });
        playlistSongsStore.createIndex('songId', 'songId', { unique: false });
        playlistSongsStore.createIndex('playlistSong', ['playlistId', 'songId'], { unique: true }); // Prevent duplicate song in same playlist
        playlistSongsStore.createIndex('order', 'order', { unique: false });
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

// PLAYLISTS OPERATIONS

// Get all playlists
export async function getAllPlaylists() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readonly');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get playlists'));
    };
  });
}

// Get a single playlist by ID
export async function getPlaylistById(playlistId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readonly');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.get(playlistId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get playlist'));
    };
  });
}

// Add a new playlist
export async function addPlaylist(playlistData) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);
    const request = store.add(playlistData);

    request.onsuccess = () => {
      resolve(playlistData);
    };

    request.onerror = () => {
      reject(new Error('Failed to add playlist'));
    };
  });
}

// Update a playlist
export async function updatePlaylist(playlistId, updates) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE);

    const getRequest = store.get(playlistId);

    getRequest.onsuccess = () => {
      const existingPlaylist = getRequest.result;

      if (!existingPlaylist) {
        reject(new Error('Playlist not found'));
        return;
      }

      const updatedPlaylist = { ...existingPlaylist, ...updates };
      const putRequest = store.put(updatedPlaylist);

      putRequest.onsuccess = () => {
        resolve(updatedPlaylist);
      };

      putRequest.onerror = () => {
        reject(new Error('Failed to update playlist'));
      };
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to get existing playlist'));
    };
  });
}

// Delete a playlist and all associated playlist-song relationships
export async function deletePlaylist(playlistId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLISTS_STORE, PLAYLIST_SONGS_STORE], 'readwrite');

    // First, delete all playlist-song entries
    const playlistSongsStore = transaction.objectStore(PLAYLIST_SONGS_STORE);
    const playlistSongsIndex = playlistSongsStore.index('playlistId');
    const playlistSongsRequest = playlistSongsIndex.openCursor(IDBKeyRange.only(playlistId));

    playlistSongsRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        // All playlist-song entries deleted, now delete the playlist
        const playlistsStore = transaction.objectStore(PLAYLISTS_STORE);
        playlistsStore.delete(playlistId);
      }
    };

    playlistSongsRequest.onerror = () => {
      reject(new Error('Failed to delete playlist songs'));
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to delete playlist'));
    };
  });
}

// Get next available playlist ID
export async function getNextPlaylistId() {
  const playlists = await getAllPlaylists();
  if (playlists.length === 0) return 1;
  const maxId = Math.max(...playlists.map(p => p.playlistId));
  return maxId + 1;
}

// PLAYLIST-SONG RELATIONSHIP OPERATIONS

// Add a song to a playlist
export async function addSongToPlaylist(playlistId, songId, order) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLIST_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLIST_SONGS_STORE);

    const playlistSongData = {
      playlistId,
      songId,
      order: order || Date.now(), // Use timestamp as default order
      addedDate: new Date().toISOString()
    };

    const request = store.add(playlistSongData);

    request.onsuccess = () => {
      resolve(playlistSongData);
    };

    request.onerror = () => {
      reject(new Error('Failed to add song to playlist (may already exist)'));
    };
  });
}

// Remove a song from a playlist
export async function removeSongFromPlaylist(playlistId, songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLIST_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLIST_SONGS_STORE);
    const index = store.index('playlistSong');
    const request = index.getKey([playlistId, songId]);

    request.onsuccess = () => {
      const key = request.result;
      if (key) {
        const deleteRequest = store.delete(key);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(new Error('Failed to remove song from playlist'));
      } else {
        reject(new Error('Song not found in playlist'));
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to find song in playlist'));
    };
  });
}

// Get all songs in a playlist (returns array of songIds in order)
export async function getSongsInPlaylist(playlistId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLIST_SONGS_STORE], 'readonly');
    const store = transaction.objectStore(PLAYLIST_SONGS_STORE);
    const index = store.index('playlistId');
    const request = index.getAll(playlistId);

    request.onsuccess = () => {
      // Sort by order field
      const results = request.result.sort((a, b) => a.order - b.order);
      resolve(results);
    };

    request.onerror = () => {
      reject(new Error('Failed to get songs in playlist'));
    };
  });
}

// Get all playlists containing a specific song
export async function getPlaylistsContainingSong(songId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLIST_SONGS_STORE], 'readonly');
    const store = transaction.objectStore(PLAYLIST_SONGS_STORE);
    const index = store.index('songId');
    const request = index.getAll(songId);

    request.onsuccess = () => {
      // Return unique playlist IDs
      const playlistIds = [...new Set(request.result.map(ps => ps.playlistId))];
      resolve(playlistIds);
    };

    request.onerror = () => {
      reject(new Error('Failed to get playlists for song'));
    };
  });
}

// Update the order of songs in a playlist
export async function updatePlaylistSongOrder(playlistId, songOrderArray) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PLAYLIST_SONGS_STORE], 'readwrite');
    const store = transaction.objectStore(PLAYLIST_SONGS_STORE);
    const index = store.index('playlistId');
    const request = index.getAll(playlistId);

    request.onsuccess = () => {
      const playlistSongs = request.result;

      // Update order for each song
      songOrderArray.forEach((songId, index) => {
        const playlistSong = playlistSongs.find(ps => ps.songId === songId);
        if (playlistSong) {
          playlistSong.order = index;
          store.put(playlistSong);
        }
      });
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to update playlist song order'));
    };
  });
}
