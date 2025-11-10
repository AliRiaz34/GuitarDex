import sqlite3
from sqlite3 import Error 
from datetime import date

database = r"./Flask/database.db"

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn
    except Error as e:
        print(f"Database connection error: {e}")
        raise

##### CREATE TABLES ######## 

sql_create_songs_table = """CREATE TABLE IF NOT EXISTS songs (
                                songId INTEGER PRIMARY KEY,
                                status TEXT CHECK(status IN ('seen', 'learning', 'refined', 'mastered', 'stale')) DEFAULT 'seen',
                                title TEXT NOT NULL,
                                artistName TEXT, 
                                level INTEGER,
                                xp FLOAT,
                                difficulty TEXT CHECK(difficulty IN ('easy', 'normal', 'hard')) DEFAULT 'normal',
                                songDuration FLOAT,
                                highestLevelReached INTEGER,
                                lastPracticeDate DATE,
                                lastDecayDate DATE,
                                addDate DATE
                            );"""

sql_create_practices_table = """CREATE TABLE IF NOT EXISTS practices (
                                practiceId INTEGER PRIMARY KEY,
                                songId INTEGER,
                                minPlayed INTEGER,
                                xpGained INTEGER,
                                practiceDate DATE,
                                FOREIGN KEY (songId) REFERENCES songs (songId) ON DELETE CASCADE
                            );"""

sql_create_teams_table = """CREATE TABLE IF NOT EXISTS teams (
                                teamId INTEGER PRIMARY KEY,
                                songId INTEGER,
                                teamName TEXT,
                                averageLevel INTEGER,
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

def add_song(conn, songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate):
    sql = ''' INSERT INTO songs(songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate)
              VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate))
        conn.commit()
    except Error as e:
        print(e)

def init_song(conn):
    init = [(1, "mastered", "grace", "jeffy", 10, 45, "normal", 5, 12, "2025-11-05", "2025-11-05", "2024-11-05"), 
            (2, "refined", "anything", "adrienne lenker", 10, 21, "easy", 5, 11, "2025-11-05", "2025-11-05", "2023-11-05")
            ]
    for c in init:
        add_song(conn, c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[10], c[11])

def add_practice(conn, practiceId, songId, minPlayed, xpGained, practiceDate):
    """
    Add a new song into the practices table
    :param conn:
    :param practiceId:
    :param songId:
    :param minPlayed:
    :param date
    """
    sql = ''' INSERT INTO practices(practiceID, songId, minPlayed, xpGained, practiceDate)
              VALUES(?, ?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (practiceId, songId, minPlayed, xpGained, practiceDate))
        conn.commit()
    except Error as e:
        print(e)

def init_practice(conn):
    init = [(1, 2, 50, 30, "2024-02-12"), 
            (2, 1, 28, 20, "2023-01-24")
            ]
    for c in init:
        add_practice(conn, c[0], c[1], c[2], c[3], c[4])

def add_team(conn, teamId, songId, teamName, averageLevel):
    """
    Add a new song into the practices table
    :param conn:
    :param teamId:
    :param songId:
    :param teamName:
    :param averageLevel:
    """
    sql = ''' INSERT INTO teams(teamId, songId, teamName, averageLevel)
              VALUES(?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (teamId, songId, teamName, averageLevel))
        conn.commit()
    except Error as e:
        print(e)

def init_team(conn):
    init = [(1, 1, "at your best", 0),
            (2, 1, "reverbing", 5)
            ]
    for c in init:
        add_team(conn, c[0], c[1], c[2], c[3])

#### DELETE #######
def delete_song(conn, songId):
    cur = conn.cursor()
    cur.execute("DELETE FROM songs WHERE songId = ?", (songId,))
    conn.commit()
    cur.close()
    return

#### UPDATE ####
def _execute_update(conn, sql, params):
    """Helper to reduce cursor management boilerplate"""
    cur = conn.cursor()
    cur.execute(sql, params)
    conn.commit()
    cur.close()

def update_song_info(conn, songId, title, artistName):
    sql = "UPDATE songs SET title = ?, artistName = ? WHERE songId = ?"
    _execute_update(conn, sql, (title, artistName, songId)) 

def update_song_level(conn, songId, level, xp, status, lastPracticeDate):
    sql = "UPDATE songs SET level = ?, xp = ?, status = ?, lastPracticeDate = ? WHERE songId = ?"
    _execute_update(conn, sql, (level, xp, status, lastPracticeDate, songId)) 

def update_song_status(conn, songId, status):
    sql = "UPDATE songs SET status = ? WHERE songId = ?"
    _execute_update(conn, sql, (status, songId)) 

def update_song_lastDecayDate(conn, songId, lastDecayDate):
    sql = "UPDATE songs SET lastDecayDate = ? WHERE songId = ?"
    _execute_update(conn, sql, (lastDecayDate, songId)) 

def update_song(conn, songId, status, level, xp, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate):
    sql = "UPDATE songs SET status = ?, level = ?, xp = ?, songDuration = ?, highestLevelReached = ?, lastPracticeDate = ?, lastDecayDate = ? WHERE songId = ?"
    _execute_update(conn, sql, (status, level, xp, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, songId)) 

def update_songDuration(conn, songId, songDuration):
    sql = "UPDATE songs SET songDuration = ? WHERE songId = ?"
    _execute_update(conn, sql, (songDuration, songId)) 



#### SELECT #######
def find_songs_info(conn):
    cur = conn.cursor()
    cur.execute("SELECT songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate FROM songs")
    songs = cur.fetchall()  
    
    songs_info = []
    for (songId, status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate) in songs:
        songs_info.append({ 
            "songId": songId, 
            "status": status,
            "title": title,
            "artistName": artistName,
            "level": level,
            "xp": xp,
            "difficulty": difficulty,
            "songDuration": songDuration,
            "highestLevelReached": highestLevelReached,
            "lastPracticeDate": lastPracticeDate,
            "lastDecayDate": lastDecayDate,
            "addDate": addDate
        })
    return songs_info

def find_practices_info(conn):
    cur = conn.cursor()
    cur.execute("SELECT practiceId, songId, minPlayed, xpGained, practiceDate FROM practices")
    practices = cur.fetchall()  

    practices_info = []
    for (practiceId, songId, minPlayed, xpGained, practiceDate) in practices:
        cur.execute("SELECT title FROM songs WHERE songId = ?", (songId,))
        title = cur.fetchone()[0] 

        practices_info.append({ 
            "practiceId": practiceId,
            "songId": songId, 
            "title": title, 
            "minPlayed": minPlayed,
            "xpGained": xpGained,
            "practiceDate": practiceDate
        })
    return practices_info

def find_song_info(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate FROM songs WHERE songId = ?", (songId,))
    song_row = cur.fetchone()  
    
    status, title, artistName, level, xp, difficulty, songDuration, highestLevelReached, lastPracticeDate, lastDecayDate, addDate = song_row

    song_info = { 
        "songId": songId, 
        "status": status,
        "title": title,
        "artistName": artistName,
        "level": level,
        "xp": xp,
        "difficulty": difficulty,
        "songDuration": songDuration,
        "highestLevelReached": highestLevelReached,
        "lastPracticeDate": lastPracticeDate,
        "lastDecayDate": lastDecayDate,
        "addDate": addDate
        }
    return song_info
 
def find_lastPracticeDate(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT lastPracticeDate FROM songs WHERE songId = ? ", (songId,))
    
    row = cur.fetchone()
    if not row or row[0] is None:
        return None  
    return (row[0]) 

def find_lastDecayDate(conn,  songId):
    cur = conn.cursor()
    cur.execute("SELECT lastDecayDate FROM songs WHERE songId = ? ", (songId,))
    
    result = cur.fetchone()[0]
    if result is None:
        return None  
    return (result)  

def find_sum_minPlayed(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT SUM(minPlayed) FROM practices WHERE songId = ? ", (songId,))
    
    result = cur.fetchone()[0]
    if result is None:
        return None  
    return (result)  

def find_sum_practices(conn, songId):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(songId) FROM practices WHERE songId = ? ", (songId,))
    
    result = cur.fetchone()[0]
    if result is None:
        return None  
    return (result)  


def create_new_songId(conn):
    cur = conn.cursor()
    cur.execute("SELECT MAX(songId) FROM songs")
    result = cur.fetchone()[0]
    return 1 if result is None else result + 1

def create_new_practiceId(conn):
    cur = conn.cursor()
    cur.execute("SELECT MAX(practiceId) FROM practices")
    result = cur.fetchone()[0]
    return 1 if result is None else result + 1

#### SETUP ####
def setup():
    conn = create_connection(database)
    if conn is not None:
        create_table(conn, sql_create_songs_table)
        create_table(conn, sql_create_practices_table)
        """ create_table(conn, sql_create_teams_table) """
        init_song(conn)
        init_practice(conn)
        """ init_team(conn) """
        conn.close()

if __name__ == '__main__':
    setup()

