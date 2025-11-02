//Index
const indexHeading = document.getElementById('index-heading');
const indexSongTable = document.getElementById('index-song-table');
const indexPracticeTable = document.getElementById('practice-table');

1
//Edit
const songEditorH2 = document.getElementById("sEditor-h2");

//Practice
const titleSelect = document.getElementById("title-select");

document.addEventListener('DOMContentLoaded', function () {
    if (indexSongTable) {
        loadIndexSongs();
    }
    if (songEditorH2) {
        let songId = parseInt(document.getElementById('songId').value);
        loadSongEditor(songId);
    }
    if (titleSelect) {
        //let songId = parseInt(document.getElementById('songId').value);    IMPLEMENT LATER TO PARSE SONG TITLE AUTO
        loadPractice();
    }
})

//Check

function checkIfEmpty(array, table) {
    if (array.length == 0) {
        table.style.visibility = "hIdden";
        table.children[0].style.display = "none";
        table.children[1].style.display = "none";
        let emptyText = document.createElement("p");
        emptyText.innerText = "none found";
        emptyText.style.fontSize = "1.3em";
        emptyText.style.paddingLeft = "20px";
        emptyText.style.margin = "0px";
        table.appendChild(emptyText);
        emptyText.style.visibility = "visible";
        return true;
    } else {
        return false;
    }
}

//Create
function createButton(innerHTML, className, id, type) {
    let button = document.createElement('button');
    button.innerHTML = innerHTML;
    button.id = id;
    button.type = type;
    button.className = className;
    return(button)
}

function createLink(innerHTML, href, className, id, parent) {
    let link = document.createElement('a');
    link.innerHTML = innerHTML;
    link.id = id;
    link.className = className;
    link.href = href;
    parent.appendChild(link);
    return(link);
}

//Load

function loadIndexSongs() {
    fetch(`/songs`)
    .then(response => response.json())
    .then(songsInfo => {   
        if (checkIfEmpty(songsInfo, indexSongTable) == true) {
        } else {
            songsInfo.forEach(function(song) {
                let newSongRow = indexSongTable.children[1].insertRow();

                for (let i = 0; i < 6; i++) {
                    let newCell = newSongRow.insertCell(); 
                    newCell.className = 'song-td';
                }   
                
                newSongRow.cells[0].innerText = song.title;
                newSongRow.cells[1].innerText = song.artistName;
                newSongRow.cells[2].innerText = song.learnDate;
                newSongRow.cells[3].innerText = song.level;
                newSongRow.cells[4].innerText = song.difficulty;
                createLink("edit", `/songs/${song.songId}/edit`,"","", newSongRow.cells[5]);
            })
        }
    })

    fetch(`/practices`)
    .then(response => response.json())
    .then(practicesInfo => {   
        if (checkIfEmpty(practicesInfo, indexPracticeTable) == true) {
        } else {
            practicesInfo.forEach(function(practice) {
                let newPracticeRow = indexPracticeTable.children[1].insertRow();

                for (let i = 0; i < 3; i++) {
                    let newCell = newPracticeRow.insertCell(); 
                    newCell.className = 'song-td';
                }   
                
                newPracticeRow.cells[0].innerText = practice.title;
                newPracticeRow.cells[1].innerText = practice.minPlayed;
                newPracticeRow.cells[2].innerText = practice.practiceDate;
            })
        }
    })
}

function loadSongEditor(songId) {    
    fetch(`/songs/${songId}/info`)
    .then(response => response.json())
    .then(song_info => { 
        songEditorH2.innerHTML = `Edit ${song_info.title} by ${song_info.artistName}`;
        document.getElementById("title-input").value = song_info.title;
        document.getElementById("artistName-input").value = song_info.artistName;
    })
}  

function loadPractice() {    
    fetch(`/songs`)
    .then(response => response.json())
    .then(songs_info => {     
        songs_info.forEach((song, key) => {
           titleSelect[key+1] = new Option(song.title, song.songId);
        })
    })
}