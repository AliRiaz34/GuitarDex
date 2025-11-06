//Index
const indexHeading = document.getElementById('index-heading');
const indexSongTable = document.getElementById('index-song-table');
const indexPracticeTable = document.getElementById('practice-table');

//Library
const libraryTable = document.getElementById('library-table');

//Edit
const songEditorH2 = document.getElementById("sEditor-h2");

//Practice
const durationDiv = document.getElementById("duration-div");

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
    if (durationDiv) {
        let songId = parseInt(document.getElementById('songId').value);
        loadPractice(songId);
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
let sortState = "recent";
let filteredSongs = [];

async function loadLibrary() {
    const response = await fetch('/songs');
    allSongs = await response.json();
    filteredSongs = allSongs;

    renderTable(allSongs, "recent"); 
    sortLibrary();
}

async function searchbarLogic() {
    let searchbar = document.getElementById("searchbar");

    searchbar.addEventListener('input', () => {
        const query = searchbar.value.toLowerCase();

        filteredSongs = allSongs.filter(song => 
            song.title.toLowerCase().includes(query) || 
            song.artistName.toLowerCase().includes(query)
        );

        if (filteredSongs.length > 0){
            renderTable(filteredSongs);
        } else {
            libraryTable.children[0].innerHTML = ''; 
            createLink("Seen a new song?", `/songs/add/${query}`, null, null, libraryTable.children[0]);
        }
    });
}

async function sortLibrary() {
    let sortMenuIcon = document.getElementById("sort-icon");
    let sortMenuTextDiv = document.getElementById("sort-menu-text-div");
    let sortRecentText = document.getElementById("sort-state-recent");
    let sortLevelText = document.getElementById("sort-state-level");
    let sortSeenText = document.getElementById("sort-state-seen");
    let sortEasyText = document.getElementById("sort-state-easy");
    let sortHardText = document.getElementById("sort-state-hard");
    let sortStateText = document.getElementById("sort-state");

    let sortTextArray = [sortRecentText, sortLevelText, sortSeenText, sortEasyText, sortHardText];
    
    // default is recent
    sortMenuTextDiv.style.display = "none";
    
    sortMenuIcon.addEventListener('click', () => {
        const isOpen = sortMenuTextDiv.style.display === "flex";

        if (isOpen) {
            sortMenuTextDiv.style.display = "none";
            sortStateText.style.display = "block";
        } else {
            sortMenuTextDiv.style.display = "flex";
            sortStateText.style.display = "none";
        }
    });

    for (let i = 0; i < sortTextArray.length; i++) {
        sortTextArray[i].addEventListener('click', () => {
            sortMenuTextDiv.style.display = "none";
            sortStateText.style.display = "block";
            sortStateText.innerText = sortTextArray[i].innerText;
            sortState = sortTextArray[i].innerText;
            renderTable(filteredSongs);
        });
    }
    
}

function renderTable(songs) {
    document.getElementById("song-view").style.display = "none";
    document.getElementById("library-view").style.display = "block";

    const tableBody = document.querySelector('#library-table tbody');
    tableBody.innerHTML = ''; 

    if (sortState == "recent") {
        songs.sort((a, b) => new Date(b.lastPracticeDate) - new Date(a.lastPracticeDate));
    }
    else if (sortState == "level") {
        songs.sort((a, b) => {
        const aSeen = a.status === "seen";
        const bSeen = b.status === "seen";

        if (aSeen && !bSeen) return 1;
        if (!aSeen && bSeen) return -1;
        return b.level - a.level;
        });
    }
    else if (sortState == "seen") {
        songs.sort((a, b) => {
            const aSeen = a.status === "seen";
            const bSeen = b.status === "seen";

            if (aSeen && !bSeen) return -1;
            if (!aSeen && bSeen) return 1;

            if (aSeen && bSeen) {
                return new Date(a.seenDate) - new Date(b.seenDate);
            }
            return a.level - b.level;
        });
    }
    else if (sortState == "easy") {
         songs.sort((a, b) => {
            const difficultyConv = {
            "easy": 1,
            "normal": 2,
            "hard": 3
            };
            return difficultyConv[a.difficulty] - difficultyConv[b.difficulty];
        });
    }
    else if (sortState == "hard") {
         songs.sort((a, b) => {
            const difficultyConv = {
            "easy": 1,
            "normal": 2,
            "hard": 3
            };
            return difficultyConv[b.difficulty] - difficultyConv[a.difficulty];
        });
    }

    songs.forEach(song => {
        const row = tableBody.insertRow();
        const cell0 = row.insertCell();
        const cell1 = row.insertCell();
        const cell2 = row.insertCell();

        cell0.innerHTML = `
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artistName}</div>
        `;        
        cell1.textContent = song.level != null ? `Lv ${song.level}` : '???';

        let quickPracticeLink = document.createElement('a');
        quickPracticeLink.innerHTML = "+";
        quickPracticeLink.href = `/practices/add/${parseInt(song.songId)}`;
        cell2.appendChild(quickPracticeLink);

        cell0.className = 'song-td';
        cell1.className = 'song-td-lv';
        cell2.className = 'song-td-qprac';

        row.className = 'song-tr';

        cell0.addEventListener('click', () => {
            loadSongView(song, songs) // need both to render table when back button is clicked
        });
    });
}

function loadSongView(song, songs) {
    let songView = document.getElementById("song-view");
    songView.style.display = "block";

    document.getElementById("library-view").style.display = "none";
    let xpDiv = document.getElementById("song-xp-div");
    let emptyInfo = document.getElementById("empty-info-p");
    let duration = document.getElementById("duration");
    let difficulty = document.getElementById("difficulty");
    let level = document.getElementById("level");
    let xp = document.getElementById("xp");
    let status = document.getElementById("status");

    if (song.level == null) {
        duration.innerText = "";
        difficulty.innerText = "";
        level.innerText = "";
        xp.innerText = "";
        status.innerText = "";
        xpDiv.style.display = "none";
        emptyInfo.style.display = "block"
    } else {
        emptyInfo.style.display = "none"
        xpDiv.style.display = "block";
        duration.innerText = `${song.songDuration} min`;
        difficulty.innerText = `Difficulty: ${song.difficulty.toUpperCase()}`;
        level.innerText = `Lv ${song.level}`;
        xp.innerText = `XP ${Math.floor(song.xp)} / ${Math.floor(song.xpThreshold)}`
        status.innerText = `Status: ${song.status.toUpperCase()}`;
    }
    
    document.getElementById("title").innerText = `${song.title}`;
    document.getElementById("artistName").innerText = `${song.artistName}`;
    
    document.getElementById("back-button").addEventListener('click', () => {
            renderTable(songs)
    });

    document.getElementById("practice-button-link").href = `/practices/add/${song.songId}`

    // XP Bar 
    const xpBar = document.getElementById("xp-bar");
    const maxXP = song.xpThreshold; // Or your max XP per level
    const xpPercent = Math.min((song.xp / maxXP) * 100, 100); // Calculate % filled

    xpBar.style.width = `${xpPercent}%`;

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

function loadPractice(songId) {    
    fetch(`/songs/${songId}/info`)
    .then(response => response.json())
    .then(songInfo => {   
        document.getElementById("song-practice-title").innerText = songInfo.title;
        let practiceInput = document.getElementById("minPlayed-input");
        let songDurationInput = document.getElementById("songDuration-input");  

        if (songInfo.songDuration != null) {
            durationDiv.style.display = "none";
            songDurationInput.value = songInfo.songDuration;
        } else {
            durationDiv.style.display = "flex"; 

            const songButtons = [
            document.getElementById("QSelect-3-song-duration-button"),
            document.getElementById("QSelect-4-song-duration-button"),
            document.getElementById("QSelect-5-song-duration-button")
            ];

            for (let i = 0; i < songButtons.length; i++) {
                songButtons[i].addEventListener('click', () => {
                    songDurationInput.innerHTML = parseFloat(songButtons[i].innerHTML);
                    songDurationInput.value = parseFloat(songButtons[i].value);
                });
            }
        }

        const practiceButtons = [
            document.getElementById("QSelect-15-practice-duration-button"),
            document.getElementById("QSelect-30-practice-duration-button"),
            document.getElementById("QSelect-45-practice-duration-button"),
            document.getElementById("QSelect-60-practice-duration-button")
        ];
    
        for (let i = 0; i < practiceButtons.length; i++) {
            practiceButtons[i].addEventListener('click', () => {
                practiceInput.innerHTML = practiceButtons[i].innerHTML;
                practiceInput.value = practiceButtons[i].value;
            });
        }
    });
}
