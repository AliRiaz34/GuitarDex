from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, session, jsonify
import setup_db, re
import os
from datetime import date, datetime

app = Flask(__name__)
app.secret_key = 'secretsecret'
BASE_DIR = os.getcwd()
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static/images')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  

def get_db_connection():
    conn = setup_db.create_connection(setup_db.database)
    return conn

### IMAGES ###
@app.route('/static/images/<filename>', methods=['GET'])
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


### INDEX ###
@app.route("/")
def index():
    return render_template('index.html')

@app.route("/songs", methods=['GET'])
def songs_info():
    conn = get_db_connection()
    songsInfo = setup_db.find_songs_info(conn)

    for song in songsInfo:
        apply_decay(song["songId"])
    return jsonify(songsInfo)

@app.route("/library", methods=['GET'])
def library():
    return render_template('library.html')


@app.route("/songs/add", defaults={'title': None}, methods=['GET', 'POST'])
@app.route("/songs/add/<string:title>", methods=['GET', 'POST'])
def songs_add(title):
    if request.method == 'GET':
        return render_template('addSong.html', title=title)
    elif request.method == 'POST':
        title = request.form.get('title-input') 
        artistName = request.form.get('artistName-input') 
        difficulty = request.form.get('difficulty-input')
        status = "seen"
        
        ## You havent learnt song, only "seen" it
        songDuration = None
        level = None
        xp = None
        highestLevelReached = None
        lastDecayDate = None
        lastPracticeDate = None

        if len(title) < 1:
            flash("Title has to be longer than 1.", 'error')
            return render_template("addSong.html")
        
        if len(artistName) < 1:
            flash("Artist name has to be longer than 1.", 'error')
            return render_template("signup.html")

        conn = get_db_connection()
        songId = int(setup_db.create_new_songId(conn))

        setup_db.add_song(conn, songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate)
        conn.close()
    return redirect(url_for('index'))


# EDIT PAGE
@app.route("/songs/<int:songId>/info", methods=['GET', 'POST'])
def song_info(songId):
    if request.method == 'GET':
        conn = get_db_connection()
        apply_decay(songId)
        songInfo = setup_db.find_song_info(conn, songId)
        return jsonify(songInfo)
    elif request.method == 'POST' and request.form.get('_method') == 'DELETE':
        conn = get_db_connection()
        setup_db.delete_song(conn, songId)
        conn.commit()
        conn.close()
        return redirect(url_for('index'))

@app.route("/songs/<int:songId>/edit", methods=['GET', 'POST'])
def song_edit(songId):
    if request.method == 'GET':
        conn = get_db_connection()
        songInfo = setup_db.find_song_info(conn, songId)
        return render_template('editSong.html', songId=songId, songInfo=songInfo)
    elif request.method == 'POST':
        title = request.form.get('title-input') 
        artistName = request.form.get('artistName-input') 

        if len(title) < 1:
            flash("Title has to be longer than 1.", 'error')
            return render_template("addSong.html")
        
        if len(artistName) < 1:
            flash("Artist name has to be longer than 1.", 'error')
            return render_template("signup.html")

        conn = get_db_connection()
        setup_db.update_song_info(conn, songId, title, artistName)
        conn.close()
    return redirect(url_for('index'))

## PRACTICE
@app.route("/practices", methods=['GET'])
def practices_info():
    conn = get_db_connection()
    practicesInfo = setup_db.find_practices_info(conn)
    return jsonify(practicesInfo)

@app.route("/practices/add", methods=['GET', 'POST'])
def practices_add():
    if request.method == 'GET':
        conn = get_db_connection()
        return render_template('addPractice.html')
    elif request.method == 'POST':
        songId = request.form.get('title-select') 
        minPlayed = float(request.form.get('minPlayed-input'))
        practiceDate = date.today() 
        songDuration = float(request.form.get('duration-input'))
        level = 1
        xp = 0
        highestLevelReached = level
        lastDecayDate = date.today()
        status = 'learning'

        conn = get_db_connection()
        practiceId = setup_db.create_new_practiceId(conn)
        setup_db.add_practice(conn, practiceId, songId, minPlayed, practiceDate)
        setup_db.update_song(conn, songId, status, level, xp, songDuration, highestLevelReached, practiceDate, lastDecayDate)


        songInfo = setup_db.find_song_info(conn, songId)
        newXp = songInfo["xp"] + xp_gain(songInfo, minPlayed)

        ## potential ui event to show xp gain or smt here:

        newLevel, adjustedXp = level_up(songInfo, newXp)
        setup_db.update_song_level(conn, songId, newLevel, adjustedXp)
        conn.close()

    return redirect(url_for('index'))

## leveling system
def days_between(d1, d2):
    d1 = datetime.strptime(d1, "%Y-%m-%d")
    d2 = datetime.strptime(d2, "%Y-%m-%d")
    return abs((d2 - d1).days)

def xp_threshold(level, baseXP=30, exponent=1.4):
    return int(baseXP * (level ** exponent))

def xp_gain(songInfo, minPlayed, baseXp=50):
    daysSinceSongPracticed = days_between(str(date.today()), songInfo["lastPracticeDate"])
    difficulty = songInfo["difficulty"]
    songDuration = songInfo["songDuration"]
    highestLevelReached = songInfo["highestLevelReached"]

    streakBonusValues = [0, 0.1, 0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0]

    if daysSinceSongPracticed < 8:
        streakBonus = streakBonusValues[daysSinceSongPracticed]
    else:
        streakBonus = streakBonusValues[8]

    difficulty_conv = {
        "easy": 1,
        "normal": 2,
        "hard": 3
    }
    return (baseXp * (1/difficulty_conv[difficulty]) * (minPlayed/songDuration) * (1 + 0.1*highestLevelReached) * (1 + streakBonus))

def level_up(songInfo, currentXp):
    currentLevel = songInfo["level"]
    xp = currentXp

    while xp >= xp_threshold(currentLevel):
        xp -= xp_threshold(currentLevel)
        currentLevel += 1

    return currentLevel, xp
    
def apply_decay(songId, decayStart=7, dailyDecayRate=0.05):
    conn = get_db_connection()
    songInfo = setup_db.find_song_info(conn, songId)

    if songInfo["status"] == "seen":
        return
    
    daysSinceSongPracticed = days_between(str(date.today()), setup_db.find_lastPracticeDate(conn, songId))
    daysSinceDecay = days_between(str(date.today()), setup_db.find_lastDecayDate(conn, songId))

    if (daysSinceSongPracticed <= decayStart) or (daysSinceDecay <= 1):
        return

    xp = songInfo["xp"]
    level = songInfo["level"]

    decayDays = daysSinceSongPracticed - decayStart
    decayFactor = (1 - dailyDecayRate) ** decayDays
    adjustedXp = int(xp * decayFactor)

    while adjustedXp < 0 and level > 1:
        level -= 1
        adjustedXp += xp_threshold(level)

    setup_db.update_song_level(conn, songId, level, adjustedXp)
    return

if __name__ == "__main__":
    app.run(debug=True)