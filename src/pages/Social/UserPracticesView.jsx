import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './Social.css';

let hasAnimatedUserPractices = false;

function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function UserPracticesView({
  user,
  practices,
  isLoading,
  hasSong,
  onBack,
  onUnfollow,
}) {
  const navigate = useNavigate();

  function handleAddSong(title, artistName) {
    navigate(`/songs/add?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artistName)}`);
  }

  return (
    <motion.div
      className="social-feed-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={() => { hasAnimatedUserPractices = true; }}
    >
      <div className="social-header social-header-with-back">
        <p className="song-back-icon" onClick={onBack}>&lt;</p>
      </div>

      <p className="user-practices-username">{user.username}</p>

      <div className="social-feed-container">
        {isLoading ? null : practices.length > 0 ? (
          <div className="social-feed-list">
            <AnimatePresence>
              {practices.map((item, index) => {
                const isInitialLoad = !hasAnimatedUserPractices && index < 10;

                return (
                  <motion.div
                    key={item.practiceId}
                    className="feed-item"
                    initial={isInitialLoad ? { opacity: 0 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={
                      isInitialLoad
                        ? { duration: 0.4, ease: 'easeOut', delay: index * 0.05 }
                        : { duration: 0.25, ease: 'easeOut' }
                    }
                  >
                    <div className="feed-item-content">
                      <div className="feed-song-row">
                        <div className="feed-song-info">
                          <span className="feed-song-title">{item.songTitle}</span>
                          <span className="feed-song-artist">{item.artistName}</span>
                        </div>
                        <span className="feed-time">{formatTimeAgo(item.practiceDate)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <p className="social-empty-text">
            no recent practices
          </p>
        )}
      </div>

      <button className="social-unfollow-floating-btn" onClick={onUnfollow}>
        unfollow
      </button>
    </motion.div>
  );
}

export default UserPracticesView;
