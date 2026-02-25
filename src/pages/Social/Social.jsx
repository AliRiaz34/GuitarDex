import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import SocialFeedView from './SocialFeedView';
import UserPracticesView from './UserPracticesView';
import { getFollowingWithProfiles, getUserPractices, followUser, unfollowUser, ensureProfile } from '../../utils/supabaseDb';
import './Social.css';

function Social() {
  const { songs, friends, setFriends, followingIds, setFollowingIds, isLoading } = useData();

  const [selectedUser, setSelectedUser] = useState(null);
  const [userPractices, setUserPractices] = useState([]);
  const [isLoadingPractices, setIsLoadingPractices] = useState(false);

  // Build set of existing song keys for duplicate check
  const existingSongKeys = new Set(
    songs.map(s => `${s.title.toLowerCase()}|||${s.artistName.toLowerCase()}`)
  );

  useEffect(() => {
    ensureProfile().catch(err => console.error('Error ensuring profile:', err));
  }, []);

  async function handleSelectUser(user) {
    setSelectedUser(user);
    setIsLoadingPractices(true);
    try {
      const practices = await getUserPractices(user.userId);
      setUserPractices(practices);
    } catch (error) {
      console.error('Error loading user practices:', error);
    } finally {
      setIsLoadingPractices(false);
    }
  }

  function handleBackToFriends() {
    setSelectedUser(null);
    setUserPractices([]);
  }

  async function handleFollow(userId) {
    setFollowingIds(prev => [...prev, userId]);
    try {
      await followUser(userId);
      const friendsList = await getFollowingWithProfiles();
      setFriends(friendsList);
    } catch (error) {
      console.error('Error following user:', error);
      setFollowingIds(prev => prev.filter(id => id !== userId));
    }
  }

  async function handleUnfollow(userId) {
    setFollowingIds(prev => prev.filter(id => id !== userId));
    setFriends(prev => prev.filter(f => f.userId !== userId));
    try {
      await unfollowUser(userId);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      setFollowingIds(prev => [...prev, userId]);
      const friendsList = await getFollowingWithProfiles();
      setFriends(friendsList);
    }
  }

  function hasSong(title, artistName) {
    return existingSongKeys.has(`${title.toLowerCase()}|||${artistName.toLowerCase()}`);
  }

  if (selectedUser) {
    return (
      <UserPracticesView
        user={selectedUser}
        practices={userPractices}
        isLoading={isLoadingPractices}
        hasSong={hasSong}
        onBack={handleBackToFriends}
        onUnfollow={() => {
          handleUnfollow(selectedUser.userId);
          setSelectedUser(null);
        }}
      />
    );
  }

  return (
    <SocialFeedView
      friends={friends}
      isLoading={isLoading}
      onSelectUser={handleSelectUser}
      followingIds={followingIds}
      onFollow={handleFollow}
      onUnfollow={handleUnfollow}
    />
  );
}

export default Social;
