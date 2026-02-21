// Offline sync queue - stores pending operations in localStorage
// Keeps sync metadata separate from the IndexedDB data being synced

const QUEUE_KEY = 'guitardex_sync_queue';
const LAST_SYNC_KEY = 'guitardex_last_sync';

export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Add an operation to the sync queue
// op: { table: string, action: 'upsert'|'delete', data: object }
export function enqueue(op) {
  const queue = getQueue();

  // Deduplicate: if there's already a pending op for the same table+id, replace it
  const idField = getIdField(op.table);
  const id = op.data[idField];

  if (id != null) {
    const existingIdx = queue.findIndex(
      q => q.table === op.table && q.data[idField] === id
    );
    if (existingIdx !== -1) {
      // If new action is delete, it supersedes any previous upsert
      // If new action is upsert, it supersedes any previous upsert
      queue[existingIdx] = { ...op, timestamp: Date.now() };
      saveQueue(queue);
      return;
    }
  }

  queue.push({ ...op, timestamp: Date.now() });
  saveQueue(queue);
}

// Remove the first item from the queue
export function dequeue() {
  const queue = getQueue();
  const item = queue.shift();
  saveQueue(queue);
  return item;
}

// Remove a specific item by index
export function removeAt(index) {
  const queue = getQueue();
  queue.splice(index, 1);
  saveQueue(queue);
}

// Clear the entire queue
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// Get the ID field name for each table
function getIdField(table) {
  switch (table) {
    case 'songs': return 'songId';
    case 'practices': return 'practiceId';
    case 'decks': return 'deckId';
    case 'deck_songs': return 'id';
    default: return 'id';
  }
}

// Last sync time tracking
export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY) || null;
}

export function setLastSyncTime(isoString) {
  localStorage.setItem(LAST_SYNC_KEY, isoString);
}

export function isOnline() {
  return navigator.onLine;
}
