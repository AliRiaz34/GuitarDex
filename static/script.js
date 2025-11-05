//Index
const indexHeading = document.getElementById('index-heading');
const indexSongTable = document.getElementById('index-song-table');
const indexPracticeTable = document.getElementById('practice-table');

//Library
const libraryTable = document.getElementById('library-table');

//Edit
const songEditorH2 = document.getElementById("sEditor-h2");

//Practice
const titleSelect = document.getElementById("title-select");

//Add
const addDiv = document.getElementById("sAdd-div");


document.addEventListener('DOMContentLoaded', function () {
    if (indexSongTable) {
        loadIndexSongs();
    }
    if (libraryTable) {
        loadLibrary();
        searchbarLogic();
    }
    if (songEditorH2) {
        let songId = parseInt(document.getElementById('songId').value);
        loadSongEditor(songId);
    }
    if (titleSelect) {
        //let songId = parseInt(document.getElementById('songId').value);    IMPLEMENT LATER TO PARSE SONG TITLE AUTO
        loadPractice();
    }
    if (addDiv) {
        loadAdd();
    }
})

//Check

function checkIfEmpty(array, table) {
    if (array.length == 0) {
        table.style.visibility = "hidden";
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
        songsInfo.forEach(function(song) {
            let newSongRow = indexSongTable.children[1].insertRow();

            for (let i = 0; i < 5; i++) {
                let newCell = newSongRow.insertCell(); 
                newCell.className = 'song-td';
            }   
            
            newSongRow.cells[0].innerText = song.title;
            newSongRow.cells[1].innerText = song.artistName;
            newSongRow.cells[2].innerText = song.level;
            newSongRow.cells[3].innerText = song.difficulty;
            createLink("edit", `/songs/${song.songId}/edit`,"","", newSongRow.cells[4]);
        })
    })

    fetch(`/practices`)
    .then(response => response.json())
    .then(practicesInfo => {   
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
    })
}

let allSongs = [];

async function loadLibrary() {
    const response = await fetch('/songs');
    allSongs = await response.json();

    renderTable(allSongs); 
}

async function searchbarLogic() {
    let searchbar = document.getElementById("searchbar");

    searchbar.addEventListener('input', () => {
        const query = searchbar.value.toLowerCase();

        const filteredSongs = allSongs.filter(song => 
            song.title.toLowerCase().includes(query) || 
            song.artistName.toLowerCase().includes(query)
        );

        
        if (filteredSongs.length > 0){
            renderTable(filteredSongs);
        } else {
            libraryTable.children[0].innerHTML = ''; 
            createLink("Seen a new song?", `/songs/add/${query}`, null, null, libraryTable.children[0])
        }
    });
}


function renderTable(songs) {
    document.getElementById("song-view").style.display = "none";
    document.getElementById("library-view").style.display = "block";

    const tableBody = document.querySelector('#library-table tbody');
    tableBody.innerHTML = ''; 

    songs.forEach(song => {
        const row = tableBody.insertRow();

        const cell0 = row.insertCell();
        const cell1 = row.insertCell();

        cell0.innerHTML = `
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artistName}</div>
        `;        
        cell1.textContent = song.level != null ? `Lv ${song.level}` : '???';

        cell0.className = 'song-td';
        cell1.className = 'song-td-lv';
        row.className = 'song-tr';


        cell0.addEventListener('click', () => {
            loadSongView(song, songs) // need both to render table when back button is clicked
        });
    });
}

function loadSongView(song, songs) {
    document.getElementById("song-view").style.display = "block";
    document.getElementById("library-view").style.display = "none";

    document.getElementById("title").innerText = `${song.title}`;
    document.getElementById("artistName").innerText = `${song.artistName}`;
    document.getElementById("duration").innerText = `${song.songDuration} min`;
        document.getElementById("status").innerText = `Status: ${song.status.toUpperCase()}`;
    document.getElementById("difficulty").innerText = `Difficulty: ${song.difficulty.toUpperCase()}`;
    document.getElementById("level").innerText = `Lv ${song.level}`;
    document.getElementById("xp").innerText = `XP ${Math.floor(song.xp)} / ${Math.floor(song.xpThreshold)}`

    document.getElementById("back-button").addEventListener('click', () => {
            renderTable(songs)
    });

    document.getElementById("practice-button-link").href = `/practices/add/${song.title}`

    // --- XP Bar ---
    const xpBar = document.getElementById("xp-bar");
    const maxXP = song.xpThreshold; // Or your max XP per level
    const xpPercent = Math.min((song.xp / maxXP) * 100, 100); // Calculate % filled

    xpBar.style.width = `${xpPercent}%`;

    // Color based on XP (like Pokémon)
    xpBar.style.backgroundColor = "#4dff88"; // green
}

function loadAdd() {
    const difficultyButtons = document.querySelectorAll('.difficulty-menu button');
    const hiddenInput = document.getElementById('difficulty-input');

    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // remove 'selected' from all
            difficultyButtons.forEach(b => b.classList.remove('selected'));
            // add 'selected' to clicked button
            btn.classList.add('selected');
            // update hidden input for form submission
            hiddenInput.value = btn.value;
            console.log(btn.value);
        });
    });
    
    // if title is parsed, start text cursor at end
    let titleInput = document.getElementById('title-input');

    if (titleInput.value) {
        // Move cursor to the end of the text
        titleInput.selectionStart = titleInput.selectionEnd = titleInput.value.length;
    }

    titleInput.focus();
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
        
        titleSelect.addEventListener('change', () => {
        const selectedId = titleSelect.value;
        const selectedSong = songs_info.find(s => s.songId == selectedId);

        const durationDiv = document.getElementById("duration-div");
        document.getElementById("duration-input").value = selectedSong.songDuration;

        if (selectedSong && selectedSong.songDuration != null) {
        durationDiv.style.display = "none";
        } else {
        durationDiv.style.display = "block"; 
        }
        });
    })
}


// SORT

function sortTable(n, which) {
    let scoreObjects = [];
    let tableToSortDict = [index-song-table];
    let tableToSort = tableToSortDict[which];
    let tableheads = tableToSort.children[0].children[0].children;

    if (!tableToSort.originalHeads) {
        tableToSort.originalHeads = {};
        for (let i = 0; i < tableheads.length; i++) {
            tableToSort.originalHeads[i] = tableheads[i].innerHTML;
        }
    }
      
    for (let row = 0; row < tableToSort.children[1].children.length; row++) {
        scoreObjects[row] = {};
        for (let cell = 0; cell < tableheads.length; cell++) {
            scoreObjects[row][cell] = tableToSort.children[1].children[row].children[cell].children[0];
        }
    }

    for (let th = 0; th < tableheads.length; th++) {
        if (th !== n) {
            tableheads[th].innerHTML = tableToSort.originalHeads[th];
        } 
    }
    
    let currentHeader = tableheads[n];
    let originalHead = tableToSort.originalHeads[n];

    if (sortDirection[which].split(":")[1] == "ascend") {
        currentHeader.innerText = `${originalHead} ▴`;
        scoreObjects.sort((a, b) => (a[n].innerHTML > b[n].innerHTML) ? 1 : (a[n].innerHTML < b[n].innerHTML) ? -1 : 0);
        sortDirection[which] = String(n) + ":descend";
    }
    else {
        currentHeader.innerText = `${originalHead} ▾`;
        scoreObjects.sort((a, b) => (a[n].innerHTML < b[n].innerHTML) ? 1 : (a[n].innerHTML > b[n].innerHTML) ? -1 : 0);
        sortDirection[which] = String(n) + ":ascend";
    }
       
    for (let row = 0; row < tableToSort.children[1].children.length; row++) {
        for (let m = 0; m < tableheads.length; m++) {
            
            tableToSort.children[1].children[row].children[m].innerHTML = "";
            tableToSort.children[1].children[row].children[m].append(scoreObjects[row][m]);
        } 
    }
}


//progress bar