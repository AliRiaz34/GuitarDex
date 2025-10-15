//Index
const indexHeading = document.getElementById('index-heading');
const indexSongTable = document.getElementById('index-song-table');

document.addEventListener('DOMContentLoaded', function () {
    if (indexSongTable) {
        loadIndexSongs();
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
    .then(songs_info => {   
        if (checkIfEmpty(songs_info, indexSongTable) == true) {
        } else {
            songs_info.forEach(function(song) {
                let newSongRow = indexSongTable.children[1].insertRow();

                for (let i = 0; i < 6; i++) {
                    let newCell = newSongRow.insertCell(); 
                    newCell.className = 'song-td';
                }   
                
                newSongRow.cells[0].innerText = song.title;
                newSongRow.cells[1].innerText = song.artistName;
                newSongRow.cells[2].innerText = song.learnDate;
                newSongRow.cells[3].innerText = song.lastPracticeDate;
                newSongRow.cells[4].innerText = song.rating;
                createLink("edit", `/song/edit/${song.songID}`,"","", newSongRow.cells[5]);
            })
        }
    })
}