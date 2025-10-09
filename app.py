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


### INDEX ###
@app.route("/")
def index():
    return render_template('index.html')

@app.route("/songs", methods=['GET'])
def songs_info():
    conn = get_db_connection()
    scores_info = setup_db.find_songs(conn)
    return jsonify(scores_info)
