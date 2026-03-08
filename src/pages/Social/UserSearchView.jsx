import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { searchUsers } from '../../utils/supabaseDb';
import './Social.css';

function UserSearchView({ onBack, followingIds, onFollow, onUnfollow }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const followingSet = new Set(followingIds);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchUsers(query);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <motion.div
      className="user-search-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <p className="song-back-icon" onClick={onBack}>&lt;</p>

      <form className="social-searchbar-container" onSubmit={e => { e.preventDefault(); e.target.querySelector('input').blur(); }}>
        <input
          className="input"
          id="searchbar"
          type="search"
          enterKeyHint="search"
          placeholder="search users"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus
        />
        {!query && (
          <div className="custom-placeholder social-search-placeholder">
            search users
          </div>
        )}
      </form>

      <div className="search-results-container">
        {results.map(user => (
          <motion.div
            key={user.id}
            className="search-result-item"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="search-result-username">{user.username}</span>
            {followingSet.has(user.id) ? (
              <button
                className="follow-toggle-btn following"
                onClick={() => onUnfollow(user.id)}
              >
                following
              </button>
            ) : (
              <button
                className="follow-toggle-btn"
                onClick={() => onFollow(user.id)}
              >
                follow
              </button>
            )}
          </motion.div>
        ))}
        {query.length >= 2 && !isSearching && results.length === 0 && (
          <p className="social-empty-text">no users found</p>
        )}
      </div>
    </motion.div>
  );
}

export default UserSearchView;
