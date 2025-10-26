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
                                rating FLOAT,
                                complexity FLOAT
                            );"""

sql_create_practices_table = """CREATE TABLE IF NOT EXISTS practices (
                                practiceId INTEGER PRIMARY KEY,
                                songId INTEGER,
                                duration INTEGER,
                                practiceDate TEXT,
                                FOREIGN KEY (songId) REFERENCES songs (songId) ON DELETE CASCADE
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

def add_song(conn, songId, title, artistName, learnDate, rating, complexity):
    """
    Add a new song into the songs table
    :param conn:
    :param songId:
    :param title:
    :param artistName:
    :param learnDate:
    :param rating:
    :param complexity:
    """
    sql = ''' INSERT INTO songs(songId, title, artistName, learnDate, rating, complexity)
              VALUES(?, ?, ?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (songId, title, artistName, learnDate, rating, complexity))
        conn.commit()
    except Error as e:
        print(e)

def init_song(conn):
    init = [(1, "grace", "jeffy", "2023", 10, 7), 
            (2, "anything", "adrienne lenker", "2021", 10, 8)
            ]
    for c in init:
        add_song(conn, c[0], c[1], c[2], c[3], c[4], c[5])


def add_practice(conn, practiceId, songId, duration, practiceDate):
    """
    Add a new song into the practices table
    :param conn:
    :param practiceId:
    :param songId:
    :param duration:
    :param date
    """
    sql = ''' INSERT INTO practices(practiceID, songId, duration, practiceDate)
              VALUES(?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (practiceId, songId, duration, practiceDate))
        conn.commit()
    except Error as e:
        print(e)

def init_practice(conn):
    init = [(1, 2, 50, 2023), 
            (2, 1, 28, 2021)
            ]
    for c in init:
        add_practice(conn, c[0], c[1], c[2], c[3])

#### DELETE #######
def delete_song(conn, songId):
    cur = conn.cursor()
    cur.execute("DELETE FROM songs WHERE songId = ?", (songId,))
    conn.commit() 
    cur.close()
    return

#### UPDATE ####
def update_song_info(conn, songId, title, artistName, rating, complexity):
    cur = conn.cursor()
    cur.execute("UPDATE songs SET title = ?, artistName = ?, rating = ?, complexity = ? WHERE songId = ?", (title, artistName, rating, complexity, songId))
    conn.commit()  
    cur.close()
    return 

#### SELECT #######
def find_songs_info(conn):
    cur = conn.cursor()
    cur.execute("SELECT songId, title, artistName, learnDate, rating, complexity FROM songs")
    songs = cur.fetchall()  
    
    songs_info = []
    for (songId, title, artistName, learnDate, rating, complexity) in songs:
        songs_info.append({ 
            "songId": songId, 
            "title": title,
            "artistName": artistName,
            "learnDate": learnDate,
            "rating": rating,
            "complexity": complexity
        })
    return songs_info

def find_song_info(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT title, artistName, learnDate, rating, complexity FROM songs WHERE songId = ?", (songId,))
    song_row = cur.fetchone()  
    
    title, artistName, learnDate, rating, complexity = song_row

    song_info = { 
        "songId": songId, 
        "title": title,
        "artistName": artistName,
        "learnDate": learnDate,
        "rating": rating,
        "complexity": complexity
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
        create_table(conn, sql_create_practices_table)
        init_song(conn)
        init_practice(conn)
        conn.close()

if __name__ == '__main__':
    setup()

