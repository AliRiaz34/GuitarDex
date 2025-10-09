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
                                songID INTEGER PRIMARY KEY,
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

def add_song(conn, songID, title, artistName, learnDate, lastPracticeDate, rating):
    """
    Add a new song into the songs table
    :param conn:
    :param songID:
    :param title:
    :param artistName:
    :param learnDate:
    :param lastPracticeDate
    :param rating:
    """
    sql = ''' INSERT INTO songs(songID, title, artistName, learnDate, lastPracticeDate, rating)
              VALUES(?, ?, ?, ?, ?, ?) '''
    try:
        cur = conn.cursor()
        cur.execute(sql, (songID, title, artistName, learnDate, lastPracticeDate, rating))
        conn.commit()
    except Error as e:
        print(e)

def init_song(conn):
    init = [(1, "grace", "jeffy", "2023", "2025", 10)

            ]
    for c in init:
        add_song(conn, c[0], c[1], c[2], c[3], c[4], c[5])

#### DELETE #######

def delete_song(conn, songID):
    cur = conn.cursor()
    cur.execute("DELETE FROM songs WHERE songID = ?", (songID,))
    conn.commit() 
    return songID

#### UPDATE ####

def update_song_info(conn, songID, title, artistName, learnDate, lastPracticeDate, rating):
    cur = conn.cursor()
    cur.execute("UPDATE songs SET title = ?, artistName = ?, learnDate = ?, lastPracticeDate = ?, rating = ? WHERE songID = ?", (title, artistName, learnDate, lastPracticeDate, rating, songID))
    conn.commit()  
    cur.close()
    return 


#### SELECT #######
def find_songs(conn):
    cur = conn.cursor()
    cur.execute("SELECT songID, title, artistName, learnDate, lastPracticeDate, rating FROM songs")
    songs = cur.fetchall()  
    
    songs_info = []
    for (songID, title, artistName, learnDate, lastPracticeDate, rating) in songs:
        songs_info.append({ 
            "songID": songID, 
            "title": title,
            "artistName": artistName,
            "learnDate": learnDate,
            "lastPracticeDate": lastPracticeDate,
            "rating": rating
        })
    return songs_info

def new_songID(conn):
    cur = conn.cursor()
    cur.execute("SELECT MAX(songID) FROM songs") 
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

