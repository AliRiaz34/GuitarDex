from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, session, jsonify
import setup_db, re
import os
from datetime import date

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
    songs_info = setup_db.find_songs_info(conn)
    return jsonify(songs_info)

@app.route("/songs/add", methods=['GET', 'POST'])
def songs_add():
    if request.method == 'GET':
        return render_template('addSong.html')
    elif request.method == 'POST':
        title = request.form.get('title-input') 
        artistName = request.form.get('artistName-input') 
        learnDate = date.today() 
        level = 1
        highestLevelReached = level
        difficulty = float(request.form.get('difficulty-input'))
        duration = float(request.form.get('duration-input'))

        if len(title) < 1:
            flash("Title has to be longer than 1.", 'error')
            return render_template("addSong.html")
        
        if len(artistName) < 1:
            flash("Artist name has to be longer than 1.", 'error')
            return render_template("signup.html")

        conn = get_db_connection()
        songId = int(setup_db.create_new_songId(conn))

        setup_db.add_song(conn, songId, title, artistName, learnDate, highestLevelReached, level, difficulty, duration)
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
        return render_template('addPractice.html')
    elif request.method == 'POST':
        songId = request.form.get('title-select') 
        minPlayed = float(request.form.get('minPlayed-input'))
        practiceDate = date.today() 

        conn = get_db_connection()
        practiceId = setup_db.create_new_practiceId(conn)
        daysSinceSongPracticed = setup_db.find_days_since_song_practiced(conn, songId)
        setup_db.add_practice(conn, practiceId, songId, minPlayed, practiceDate)

        ## level ALGORITHM
        songInfo = setup_db.find_song_info(conn, songId)
        newXp = songInfo["xp"] + xp_gain(songInfo, minPlayed, daysSinceSongPracticed)

        ## potential ui event to show xp gain or smt here:

        newLevel, adjustedXp = level_up(songInfo, newXp)
        setup_db.update_song_level(conn, songId, newLevel, adjustedXp)
        conn.close()

    return redirect(url_for('index'))


## leveling system
def xp_threshold(level, baseXP=30, exponent=1.4):
    return int(baseXP * (level ** exponent))


def xp_gain(songInfo, minPlayed, daysSinceSongPracticed, baseXp=50):
    difficulty = songInfo["difficulty"]
    songDuration = songInfo["songDuration"]
    highestLevelReached = songInfo["highestLevelReached"]

    streakBonusValues = [0, 0.1, 0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0]

    if daysSinceSongPracticed < 8:
        streakBonus = streakBonusValues[daysSinceSongPracticed]
    else:
        streakBonus = streakBonusValues[8]

    return (baseXp * (1/difficulty) * (minPlayed/songDuration) * (1 + 0.1*highestLevelReached) * (1 + streakBonus))

def level_up(songInfo, currentXp):
    currentLevel = songInfo["level"]
    xp = currentXp

    while xp >= xp_threshold(currentLevel):
        xp -= xp_threshold(currentLevel)
        currentLevel += 1

    return currentLevel, xp
    
def apply_decay(songId, decayStart=7, dailyDecayRate=0.05):
    conn = get_db_connection()
    daysSinceSongPracticed = setup_db.find_days_since_song_practiced(conn, songId)
    songInfo = setup_db.find_song_info(conn, songId)

    xp = songInfo["xp"]
    level = songInfo["level"]

    if daysSinceSongPracticed <= decayStart:
        return level, xp 

    decayDays = daysSinceSongPracticed - decayStart
    decayFactor = (1 - dailyDecayRate) ** decayDays
    adjustedXp = int(xp * decayFactor)

    while adjustedXp < 0 and level > 1:
        level -= 1
        adjustedXp += xp_threshold(level)

    setup_db.update_song_level(conn, songId, level, adjustedXp)



if __name__ == "__main__":
    app.run(debug=True)