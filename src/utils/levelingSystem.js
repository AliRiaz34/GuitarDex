// Leveling System Configuration (ported from Flask)

// XP System Configuration
const XP_BASE_AMOUNT = 50;  // Base XP required for level 1
const XP_SCALING_EXPONENT = 1.4;  // How quickly XP requirements increase per level
const XP_PRACTICE_BASE = 40;  // Base XP earned per practice session

// Streak Bonus Configuration (index = days since last practice)
const STREAK_BONUS_VALUES = [0, 0.1, 0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0];  // 0=today, 1=yesterday, etc.

// Decay System Configuration
const DECAY_GRACE_PERIOD_DAYS = 7;
const MASTERED_DECAY_GRACE_PERIOD_DAYS = 90;
const DECAY_RATE_PER_DAY = 0.05;

// Level Thresholds
const MAX_LEVEL_BEFORE_REFINED = 10;
const MAX_LEVEL_BEFORE_MASTERY = 25;

// Difficulty Multipliers
const DIFFICULTY_MULTIPLIERS = {
  easy: 1,
  normal: 2,
  hard: 3
};

// Helper function to calculate days between two dates
function daysBetween(date1, date2) {
  // Handle both ISO datetime strings (YYYY-MM-DDTHH:MM:SS) and date strings (YYYY-MM-DD)
  // Extract just the date portion if it's a datetime string
  let d1 = typeof date1 === 'string' ? date1.split('T')[0] : date1;
  let d2 = typeof date2 === 'string' ? date2.split('T')[0] : date2;

  const date1Obj = new Date(d1);
  const date2Obj = new Date(d2);

  const diffTime = Math.abs(date2Obj - date1Obj);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Calculate XP threshold for a given level
export function xpThreshold(level) {
  return Math.floor(XP_BASE_AMOUNT * Math.pow(level, XP_SCALING_EXPONENT));
}

// Calculate XP gain from a practice session
export function calculateXpGain(songInfo, minPlayed) {
  const today = new Date().toISOString().split('T')[0];
  const daysSinceSongPracticed = daysBetween(today, songInfo.lastPracticeDate);
  const difficulty = songInfo.difficulty;
  const songDuration = Number(songInfo.songDuration);
  const highestLevelReached = songInfo.highestLevelReached;

  let streakBonus;
  if (daysSinceSongPracticed < STREAK_BONUS_VALUES.length) {
    streakBonus = STREAK_BONUS_VALUES[daysSinceSongPracticed];
  } else {
    streakBonus = STREAK_BONUS_VALUES[STREAK_BONUS_VALUES.length - 1];
  }

  return (
    XP_PRACTICE_BASE *
    (1 / DIFFICULTY_MULTIPLIERS[difficulty]) *
    (Number(minPlayed) / songDuration) *
    (1 + 0.1 * highestLevelReached) *
    (1 + streakBonus)
  );
}

// Calculate level up and adjusted XP
export function calculateLevelUp(songInfo, newXp) {
  let currentLevel = songInfo.level;
  let xp = newXp;
  let status = songInfo.status;

  while (xp >= xpThreshold(currentLevel)) {
    xp -= xpThreshold(currentLevel);
    currentLevel += 1;
  }

  // Update status based on level thresholds
  if (currentLevel >= MAX_LEVEL_BEFORE_MASTERY) {
    status = "mastered";
  } else if (currentLevel >= MAX_LEVEL_BEFORE_REFINED) {
    status = "refined";
  }
  // Keep existing status if below refined threshold (learning/stale)

  return { level: currentLevel, xp, status };
}

// Apply decay to a song
export function applyDecay(songInfo) {
  const status = songInfo.status;

  if (status === "seen") {
    return songInfo;  // No decay for seen songs
  }

  const today = new Date().toISOString().split('T')[0];
  const daysSinceSongPracticed = daysBetween(today, songInfo.lastPracticeDate);
  const daysSinceDecay = daysBetween(today, songInfo.lastDecayDate);

  // Check mastered decay
  if (status === "mastered") {
    if (daysSinceSongPracticed <= MASTERED_DECAY_GRACE_PERIOD_DAYS) {
      return songInfo;
    }
    // Downgrade to refined only
    return {
      ...songInfo,
      status: "refined",
      lastDecayDate: new Date().toISOString()
    };
  }

  // Check grace period for other statuses (refined, learning, stale)
  if (daysSinceSongPracticed <= DECAY_GRACE_PERIOD_DAYS || daysSinceDecay <= 1) {
    return songInfo;
  }

  // Apply decay to XP and level
  let xp = songInfo.xp;
  let level = songInfo.level;
  let newStatus = status;

  const decayDays = daysSinceSongPracticed - DECAY_GRACE_PERIOD_DAYS;

  // Difficulty modifier: harder songs decay faster
  // easy: 1.0x, normal: 1.15x, hard: 1.3x decay rate
  const difficultyDecayModifier = 1 + (0.15 * (DIFFICULTY_MULTIPLIERS[songInfo.difficulty] - 1));

  // Apply decay: base decay rate is multiplied by difficulty modifier
  const effectiveDecayRate = DECAY_RATE_PER_DAY * difficultyDecayModifier;
  const decayFactor = Math.pow(1 - effectiveDecayRate, decayDays);

  const adjustedXp = Math.floor(xp * decayFactor);

  // Adjust level based on XP
  while (level > 1 && adjustedXp < xpThreshold(level - 1)) {
    level -= 1;
  }

  // Update status based on level
  if (level === 1 && songInfo.highestLevelReached > 1) {
    newStatus = "stale";
  } else if (level < MAX_LEVEL_BEFORE_REFINED) {
    newStatus = "learning";
  }

  return {
    ...songInfo,
    level,
    xp: adjustedXp,
    status: newStatus,
    lastDecayDate: new Date().toISOString()
  };
}

// Initialize a seen song when first practiced
export function initializeSeenSong(songInfo, songDuration) {
  return {
    ...songInfo,
    status: 'learning',
    level: 1,
    xp: 0,
    highestLevelReached: 1,
    lastDecayDate: new Date().toISOString(),
    lastPracticeDate: new Date().toISOString(),
    songDuration
  };
}

// Update song with practice results
export function updateSongWithPractice(songInfo, minPlayed, songDuration) {
  let updatedSong = { ...songInfo };

  // Initialize if seen song
  if (songInfo.status === "seen") {
    updatedSong = initializeSeenSong(songInfo, songDuration);
  }

  // Update song duration if it's null (mastered/refined first practice)
  if (updatedSong.songDuration === null && songDuration) {
    updatedSong.songDuration = songDuration;
  }

  // Calculate XP gain
  const xpGain = calculateXpGain(updatedSong, minPlayed);

  // Calculate level up
  const newXp = updatedSong.xp + xpGain;
  const levelUpResult = calculateLevelUp(updatedSong, newXp);

  // Update song with new values
  updatedSong.level = levelUpResult.level;
  updatedSong.xp = levelUpResult.xp;
  updatedSong.status = levelUpResult.status;
  updatedSong.lastPracticeDate = new Date().toISOString();

  // Update highest level reached if needed
  if (levelUpResult.level > updatedSong.highestLevelReached) {
    updatedSong.highestLevelReached = levelUpResult.level;
  }

  return { updatedSong, xpGain };
}
