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
        lastPracticeDate = date.today()
        rating = float(request.form.get('rating-input') )

        if len(title) < 1:
            flash("Title has to be longer than 1.", 'error')
            return render_template("addSong.html")
        
        if len(artistName) < 1:
            flash("Artist name has to be longer than 1.", 'error')
            return render_template("signup.html")

        if (rating < 0) or (rating > 10):
            flash("Invalid rating", 'error')
            return render_template("addSong.html")
        
        conn = get_db_connection()
        songID = int(setup_db.create_new_songID(conn))

        setup_db.add_song(conn, songID, title, artistName, learnDate, lastPracticeDate, rating)
        conn.close()
    return redirect(url_for('index'))

@app.route("/song/edit/<int:songID>", methods=['GET', 'POST'])
def song_edit(songID):
    if request.method == 'GET':
        conn = get_db_connection()
        song_info = setup_db.find_song_info(conn, songID)
        return render_template('editSong.html', songID=songID, song_info=song_info)
    elif request.method == 'POST':
        title = request.form.get('title-input') 
        artistName = request.form.get('artistName-input') 
        learnDate = date.today() 
        lastPracticeDate = date.today()
        rating = float(request.form.get('rating-input') )

        if len(title) < 1:
            flash("Title has to be longer than 1.", 'error')
            return render_template("addSong.html")
        
        if len(artistName) < 1:
            flash("Artist name has to be longer than 1.", 'error')
            return render_template("signup.html")

        if (rating < 0) or (rating > 10):
            flash("Invalid rating", 'error')
            return render_template("addSong.html")
        
        conn = get_db_connection()
        songID = int(setup_db.create_new_songID(conn))

        setup_db.add_song(conn, songID, title, artistName, learnDate, lastPracticeDate, rating)
        conn.close()
    return redirect(url_for('edit'))

if __name__ == "__main__":
    app.run(debug=True)