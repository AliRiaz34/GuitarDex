import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUsers } from '../../utils/supabaseDb';
import './Social.css';

let hasAnimatedFeed = false;

function SocialFeedView({
  friends,
  isLoading,
  onSelectUser,
  followingIds,
  onFollow,
  onUnfollow,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const followingSet = new Set(followingIds);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      return;
    }
  }, [searchOpen]);

  async function handleSearch() {
    if (query.length < 2) return;
    setIsSearching(true);
    try {
      const data = await searchUsers(query);
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <motion.div
      className="social-feed-view"
      initial={hasAnimatedFeed ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => { hasAnimatedFeed = true; }}
    >
      <p className="social-heading">your friends</p>

      <div className="social-feed-container">
        {friends.length > 0 ? (
          <div className="friends-grid">
            <AnimatePresence>
              {friends.map((friend, index) => {
                const isInitialLoad = !hasAnimatedFeed && index < 10;

                return (
                  <motion.div
                    key={friend.userId}
                    className="friend-card"
                    onClick={() => onSelectUser(friend)}
                    initial={isInitialLoad ? { opacity: 0, scale: 0.8 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={
                      isInitialLoad
                        ? { duration: 0.4, ease: 'easeOut', delay: index * 0.05 }
                        : { duration: 0.25, ease: 'easeOut' }
                    }
                  >
                    <img className="friend-pfp" src="/images/pfp.png" alt="" />
                    <span className="friend-name">{friend.username}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <p className="social-empty-text">
            stalk your friends!
          </p>
        )}
      </div>

      <button className="social-search-btn" onClick={() => setSearchOpen(true)}>
        search users
      </button>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              className="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              className="user-search-widget"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <span
                className="search-widget-close"
                onClick={() => setSearchOpen(false)}
              >
                x
              </span>
              <div className="search-widget-input-container">
                <input
                  className="input search-widget-input"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  autoFocus
                />
              </div>
              <div className="search-widget-results">
                <AnimatePresence mode="popLayout">
                  {results.map((user, index) => (
                    <motion.div
                      key={user.id}
                      className="search-result-item"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.04 }}
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
                </AnimatePresence>
                {hasSearched && !isSearching && results.length === 0 && (
                  <motion.p
                    className="search-widget-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    no users found
                  </motion.p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SocialFeedView;
