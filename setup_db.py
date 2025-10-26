import sqlite3
from sqlite3 import Error 

database = r"./database.db"

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn
    except Error as e:
        print(e)

    return conn

##### CREATE TABLES ######## 

sql_create_songs_table = """CREATE TABLE IF NOT EXISTS songs (
                                songId INTEGER PRIMARY KEY,
                                title TEXT NOT NULL,
                                artistName TEXT, 
                                learnDate TEXT, 
                                lastPracticeDate TEXT,
                                rating FLOAT
                            );"""


def create_table(conn, create_table_sql):
    """ create a table from the create_table_sql statement
    :param conn: Connection object
    :param create_table_sql: a CREATE TABLE statement
    :return:
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except Error as e:
        print(e)

#### INSERT #########

def add_song(conn, songId, title, artistName, learnDate, lastPracticeDate, rating):
    """
    Add a new song into the songs table
    :param conn:
    :param songId:
    :param title:
    :param artistName:
    :param learnDate:
    :param lastPracticeDate
    :param rating:
    """
    sql = ''' INSERT INTO songs(songId, title, artistName, learnDate, lastPracticeDate, rating)
              VALUES(?, ?, ?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (songId, title, artistName, learnDate, lastPracticeDate, rating))
        conn.commit()
    except Error as e:
        print(e)

def init_song(conn):
    init = [(1, "grace", "jeffy", "2023", "2025", 10), 
            (2, "anything", "adrienne lenker", "2021", "2024", 10)
            ]
    for c in init:
        add_song(conn, c[0], c[1], c[2], c[3], c[4], c[5])

#### DELETE #######
def delete_song(conn, songId):
    cur = conn.cursor()
    cur.execute("DELETE FROM songs WHERE songId = ?", (songId,))
    conn.commit() 
    cur.close()
    return

#### UPDATE ####
def update_song_info(conn, songId, title, artistName, rating):
    cur = conn.cursor()
    cur.execute("UPDATE songs SET title = ?, artistName = ?, rating = ? WHERE songId = ?", (title, artistName, rating, songId))
    conn.commit()  
    cur.close()
    return 

#### SELECT #######
def find_songs_info(conn):
    cur = conn.cursor()
    cur.execute("SELECT songId, title, artistName, learnDate, lastPracticeDate, rating FROM songs")
    songs = cur.fetchall()  
    
    songs_info = []
    for (songId, title, artistName, learnDate, lastPracticeDate, rating) in songs:
        songs_info.append({ 
            "songId": songId, 
            "title": title,
            "artistName": artistName,
            "learnDate": learnDate,
            "lastPracticeDate": lastPracticeDate,
            "rating": rating
        })
    return songs_info

def find_song_info(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT title, artistName, learnDate, lastPracticeDate, rating FROM songs WHERE songId = ?", (songId,))
    song_row = cur.fetchone()  
    
    title, artistName, learnDate, lastPracticeDate, rating = song_row

    song_info = { 
        "songId": songId, 
        "title": title,
        "artistName": artistName,
        "learnDate": learnDate,
        "lastPracticeDate": lastPracticeDate,
        "rating": rating
        }
    return song_info

def create_new_songId(conn):
    cur = conn.cursor()
    cur.execute("SELECT MAX(songId) FROM songs") 
    result = cur.fetchone()[0]
    return result+1

#### SETUP ####
def setup():
    conn = create_connection(database)
    if conn is not None:
        create_table(conn, sql_create_songs_table)
        init_song(conn)
        conn.close()

if __name__ == '__main__':
    setup()

