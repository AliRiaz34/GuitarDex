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
                                level FLOAT,
                                xp FLOAT,
                                difficulty FLOAT
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

def add_song(conn, songId, title, artistName, learnDate, level, xp, difficulty):
    """
    Add a new song into the songs table
    :param conn:
    :param songId:
    :param title:
    :param artistName:
    :param learnDate:
    :param level:
    :param xp:
    :param difficulty:
    """
    sql = ''' INSERT INTO songs(songId, title, artistName, learnDate, level, xp, difficulty)
              VALUES(?, ?, ?, ?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (songId, title, artistName, learnDate, level, xp, difficulty))
        conn.commit()
    except Error as e:
        print(e)

def init_song(conn):
    init = [(1, "grace", "jeffy", "2023", 10, 45, 7), 
            (2, "anything", "adrienne lenker", "2021", 10, 21, 8)
            ]
    for c in init:
        add_song(conn, c[0], c[1], c[2], c[3], c[4], c[5], c[6])


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
def update_song_info(conn, songId, title, artistName):
    cur = conn.cursor()
    cur.execute("UPDATE songs SET title = ?, artistName = ? WHERE songId = ?", (title, artistName, songId))
    conn.commit()  
    cur.close()
    return 

def update_song_level(conn, songId, level, xp, difficulty):
    cur = conn.cursor()
    cur.execute("UPDATE songs SET title level, xp WHERE songId = ?", (level, xp, difficulty, songId))
    conn.commit() 
    cur.close()
    return 

#### SELECT #######
def find_songs_info(conn):
    cur = conn.cursor()
    cur.execute("SELECT songId, title, artistName, learnDate, level, xp, difficulty FROM songs")
    songs = cur.fetchall()  
    
    songs_info = []
    for (songId, title, artistName, learnDate, level, xp, difficulty) in songs:
        songs_info.append({ 
            "songId": songId, 
            "title": title,
            "artistName": artistName,
            "learnDate": learnDate,
            "level": level,
            "xp": xp,
            "difficulty": difficulty
        })
    return songs_info

def find_practices_info(conn):
    cur = conn.cursor()
    cur.execute("SELECT practiceId, songId, duration, practiceDate FROM practices")
    practices = cur.fetchall()  

    practices_info = []
    for (practiceId, songId, duration, practiceDate) in practices:
        cur.execute("SELECT title FROM songs WHERE songId = ?", (songId,))
        title = cur.fetchone()[0] 

        practices_info.append({ 
            "practiceId": practiceId,
            "songId": songId, 
            "title": title, 
            "duration": duration,
            "practiceDate": practiceDate
        })
    return practices_info

def find_song_info(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT title, artistName, learnDate, level, xp, difficulty FROM songs WHERE songId = ?", (songId,))
    song_row = cur.fetchone()  
    
    title, artistName, learnDate, level, xp, difficulty = song_row

    song_info = { 
        "songId": songId, 
        "title": title,
        "artistName": artistName,
        "learnDate": learnDate,
        "level": level,
        "xp": xp,
        "difficulty": difficulty
        }
    return song_info

def create_new_songId(conn):
    cur = conn.cursor()
    cur.execute("SELECT MAX(songId) FROM songs") 
    result = cur.fetchone()[0]
    return result+1

def create_new_practiceId(conn):
    cur = conn.cursor()
    cur.execute("SELECT MAX(practiceId) FROM practices") 
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

