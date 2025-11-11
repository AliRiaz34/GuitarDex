from flask import Flask, request, send_from_directory, jsonify
import setup_db, re
import os
from datetime import date, datetime

app = Flask(__name__, static_folder='../ReactVersion/dist', static_url_path='')
BASE_DIR = os.getcwd()
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static/images')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

# XP System Configuration
XP_BASE_AMOUNT = 50  # Base XP required for level 1
XP_SCALING_EXPONENT = 1.4  # How quickly XP requirements increase per level
XP_PRACTICE_BASE = 40  # Base XP earned per practice session

# Streak Bonus Configuration (index = days since last practice)
STREAK_BONUS_VALUES = [0, 0.1, 0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0]  # 0=today, 1=yesterday, etc.

# Decay System Configuration
DECAY_GRACE_PERIOD_DAYS = 7  
MASTERED_DECAY_GRACE_PERIOD_DAYS = 90  
DECAY_RATE_PER_DAY = 0.05  

# Level Thresholds
MAX_LEVEL_BEFORE_REFINED = 10  
MAX_LEVEL_BEFORE_MASTERY = 25  

# Difficulty Multipliers
DIFFICULTY_MULTIPLIERS = {
    "easy": 1,
    "normal": 2,
    "hard": 3
}  

def get_db_connection():
    conn = setup_db.create_connection(setup_db.database)
    return conn

### IMAGES ###
@app.route('/Flask/static/images/<filename>', methods=['GET'])
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

### INDEX ###
@app.route("/")
def index():
    # Serve React app
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/songs", methods=['GET'])
def songs_info():
    conn = get_db_connection()
    songsInfo = setup_db.find_songs_info(conn)

    for song in songsInfo:
        apply_decay(song["songId"])
        if song["status"] != "seen":
            song["xpThreshold"] = xp_threshold(song["level"])
            song["totalMinPlayed"] = setup_db.find_sum_minPlayed(conn, song["songId"])
            song["totalSessions"] = setup_db.find_sum_practices(conn, song["songId"])

    return jsonify(songsInfo)

@app.route("/songs/add", defaults={'title': None}, methods=['POST'])
@app.route("/songs/add/<string:title>", methods=['POST'])
def songs_add(title):
    if request.method == 'POST':
        title = request.json['title']
        artistName = request.json['artistName']
        difficulty = request.json['difficulty']
        status = request.json['status']

        addDate = datetime.now().isoformat()
        songDuration = None

        if status == "seen":
            level = None
            xp = None
            highestLevelReached = None
            lastDecayDate = None
            lastPracticeDate = None
        elif status == "mastered":
            level = MAX_LEVEL_BEFORE_MASTERY
            xp = 0
            highestLevelReached = level
            lastDecayDate = datetime.now().isoformat()
            lastPracticeDate = datetime.now().isoformat()
        elif status == "refined":
            level = MAX_LEVEL_BEFORE_REFINED
            xp = 0
            highestLevelReached = level
            lastDecayDate = datetime.now().isoformat()
            lastPracticeDate = datetime.now().isoformat()
            
        if len(title) < 1:
            return jsonify({'success': False, 'error': 'Title has to be longer than 1.'}), 400

        if len(artistName) < 1:
            return jsonify({'success': False, 'error': 'Artist name has to be longer than 1.'}), 400

        conn = get_db_connection()
        songId = int(setup_db.create_new_songId(conn))

        setup_db.add_song(conn, songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate)

        # Fetch the newly created song to return to frontend
        newSongInfo = setup_db.find_song_info(conn, songId)
        if newSongInfo["status"] != "seen":
            newSongInfo["xpThreshold"] = xp_threshold(newSongInfo["level"])
            newSongInfo["totalMinPlayed"] = setup_db.find_sum_minPlayed(conn, songId)
            newSongInfo["totalSessions"] = setup_db.find_sum_practices(conn, songId)

        conn.close()

        return jsonify({
            'success': True,
            'newSong': newSongInfo
        })

# EDIT PAGE
@app.route("/songs/<int:songId>/info", methods=['GET', 'POST'])
def song_info(songId):
    if request.method == 'GET':
        conn = get_db_connection()
        apply_decay(songId)
        songInfo = setup_db.find_song_info(conn, songId)
       
        if songInfo["status"] != "seen":
            songInfo["xpThreshold"] = xp_threshold(songInfo["level"])
            songInfo["totalMinPlayed"] = setup_db.find_sum_minPlayed(conn, songId)
            songInfo["totalSessions"] = setup_db.find_sum_practices(conn, songInfo["songId"])

        return jsonify(songInfo)
    elif request.method == 'POST' and request.form.get('_method') == 'DELETE':
        conn = get_db_connection()
        setup_db.delete_song(conn, songId)
        conn.commit()
        conn.close()
        return jsonify({'success': True})

@app.route("/songs/<int:songId>/edit", methods=['POST'])
def song_edit(songId):
    if request.method == 'POST':
        title = request.json['title']
        artistName = request.json['artistName']

        if len(title) < 1:
            return jsonify({'success': False, 'error': 'Title has to be longer than 1.'}), 400

        if len(artistName) < 1:
            return jsonify({'success': False, 'error': 'Artist name has to be longer than 1.'}), 400

        conn = get_db_connection()
        setup_db.update_song_info(conn, songId, title, artistName)
        conn.close()
        return jsonify({'success': True})

## PRACTICE
@app.route("/practices", methods=['GET'])
def practices_info():
    conn = get_db_connection()
    practicesInfo = setup_db.find_practices_info(conn)
    return jsonify(practicesInfo)

@app.route("/practices/add/<int:songId>", methods=['POST'])
def practices_add(songId):
    if request.method == 'POST':
        minPlayed = float(request.json['minPlayed'])
        print(request.json['songDuration'])
        songDuration = float(request.json['songDuration'])
        lastPracticeDate = datetime.now().isoformat()

        conn = get_db_connection()
        songInfo = setup_db.find_song_info(conn, songId)

        # if first practice on seen song, you have to initialize
        if songInfo["status"] == "seen":
            status = 'learning'
            level = 1
            xp = 0
            highestLevelReached = level
            lastDecayDate = datetime.now().isoformat()
            setup_db.update_song(conn, songId, status, level, xp, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate)

        # if first practice with mastered or refined song
        if (songInfo["status"] == "mastered") and (songInfo["songDuration"] == None):
            setup_db.update_songDuration(conn, songId, songDuration)
        
        if (songInfo["status"] == "refined") and (songInfo["songDuration"] == None):
            setup_db.update_songDuration(conn, songId, songDuration)

        songInfo = setup_db.find_song_info(conn, songId)
        xpGain = xp_gain(songInfo, minPlayed)

        ## potential ui event to show xp gain or smt here:

        newLevel, adjustedXp, newStatus = level_up(songInfo, int(songInfo["xp"] + xpGain))
        setup_db.update_song_level(conn, songId, newLevel, adjustedXp, newStatus, lastPracticeDate)

        practiceId = setup_db.create_new_practiceId(conn)
        setup_db.add_practice(conn, practiceId, songId, minPlayed, xpGain, lastPracticeDate)

        # Fetch updated song info to return to frontend
        updatedSongInfo = setup_db.find_song_info(conn, songId)
        updatedSongInfo["xpThreshold"] = xp_threshold(updatedSongInfo["level"])
        updatedSongInfo["totalMinPlayed"] = setup_db.find_sum_minPlayed(conn, songId)
        updatedSongInfo["totalSessions"] = setup_db.find_sum_practices(conn, songId)

        conn.close()

        return jsonify({
            'success': True,
            'xpGained': xpGain,
            'newLevel': newLevel,
            'updatedSong': updatedSongInfo
        })

## leveling system
def days_between(d1, d2):
    # Handle both ISO datetime strings (YYYY-MM-DDTHH:MM:SS) and date strings (YYYY-MM-DD)
    # Extract just the date portion if it's a datetime string
    if isinstance(d1, str):
        d1 = d1.split('T')[0]
    if isinstance(d2, str):
        d2 = d2.split('T')[0]

    d1 = datetime.strptime(d1, "%Y-%m-%d")
    d2 = datetime.strptime(d2, "%Y-%m-%d")
    return abs((d2 - d1).days)

def xp_threshold(level):
    return int(XP_BASE_AMOUNT * (level ** XP_SCALING_EXPONENT))

def xp_gain(songInfo, minPlayed):
    today = datetime.now().date().isoformat()
    daysSinceSongPracticed = days_between(today, songInfo["lastPracticeDate"])
    difficulty = songInfo["difficulty"]
    songDuration = songInfo["songDuration"]
    highestLevelReached = songInfo["highestLevelReached"]

    if daysSinceSongPracticed < len(STREAK_BONUS_VALUES):
        streakBonus = STREAK_BONUS_VALUES[daysSinceSongPracticed]
    else:
        streakBonus = STREAK_BONUS_VALUES[-1]

    return (XP_PRACTICE_BASE *
            (1 / DIFFICULTY_MULTIPLIERS[songInfo["difficulty"]]) *
            (minPlayed / songDuration) *
            (1 + 0.1 * highestLevelReached) *
            (1 + streakBonus))

def level_up(songInfo, newXp):
    currentLevel = songInfo["level"]
    xp = newXp
    status = songInfo["status"]

    while xp >= xp_threshold(currentLevel):
        xp -= xp_threshold(currentLevel)
        currentLevel += 1

    if currentLevel >= MAX_LEVEL_BEFORE_MASTERY:
        status = "mastered"
    elif currentLevel >= MAX_LEVEL_BEFORE_REFINED:
        status = "refined"

    return currentLevel, xp, status
    
def apply_decay(songId):
    conn = get_db_connection()
    songInfo = setup_db.find_song_info(conn, songId)
    status = songInfo["status"]

    if status == "seen":
        return

    today = datetime.now().date().isoformat()
    daysSinceSongPracticed = days_between(today, setup_db.find_lastPracticeDate(conn, songId))
    daysSinceDecay = days_between(today, setup_db.find_lastDecayDate(conn, songId))

    if status == "mastered":
        if daysSinceSongPracticed <= MASTERED_DECAY_GRACE_PERIOD_DAYS:
            return
        setup_db.update_song_status(conn, songId, "refined")
    else:
        if (daysSinceSongPracticed <= DECAY_GRACE_PERIOD_DAYS) or (daysSinceDecay <= 1):
            return

    xp = songInfo["xp"]
    level = songInfo["level"]

    decayDays = daysSinceSongPracticed - DECAY_GRACE_PERIOD_DAYS

    # Difficulty modifier: harder songs decay faster
    # easy: 1.0x, normal: 1.15x, hard: 1.3x decay rate
    difficultyDecayModifier = 1 + (0.15 * (DIFFICULTY_MULTIPLIERS[songInfo["difficulty"]] - 1))

    # Apply decay: base decay rate is multiplied by difficulty modifier
    effectiveDecayRate = DECAY_RATE_PER_DAY * difficultyDecayModifier
    decayFactor = (1 - effectiveDecayRate) ** decayDays

    adjustedXp = int(xp * decayFactor)

    while level > 1 and adjustedXp < xp_threshold(level - 1):
        level -= 1

    if (level == 1) and (songInfo["highestLevelReached"] > 1):
        status = "stale"
    elif (level < MAX_LEVEL_BEFORE_REFINED):
        status = "learning"

    setup_db.update_song_level(conn, songId, level, adjustedXp, status)
    setup_db.update_song_lastDecayDate(conn, songId, datetime.now().isoformat())
    return
    
   

if __name__ == "__main__":
    app.run(debug=True)