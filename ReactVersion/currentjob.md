### FUTURE IMPLEMENTATIONS

subparts for a song, user defined

descirption box, add overview of progress, 

MAKE ALBUM LIKE GYM, WHICH GYM BADGE!

be able to pin song in library

have playlists
have multiuser playlists with a table to show each users level
          User 1      User 2
Song 1    Lv            Lv
Song 2    Lv            Lv
Song 3    Lv            Lv
Song 4    Lv            Lv


Playlist operations:
getAllPlaylists()
getPlaylistById(playlistId)
addPlaylist(playlistData)
updatePlaylist(playlistId, updates)
deletePlaylist(playlistId) - cascades to playlist_songs
getNextPlaylistId()
Playlist-song operations:
addSongToPlaylist(playlistId, songId, order)
removeSongFromPlaylist(playlistId, songId)
getSongsInPlaylist(playlistId) - returns ordered array
getPlaylistsContainingSong(songId) - find which playlists have this song
updatePlaylistSongOrder(playlistId, songOrderArray) - reorder songs



### ISSUES

fix low battery mode making animations choppy

pwa swipe gesutre

