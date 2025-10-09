//Index
const indexHeading = document.getElementById('index-heading');
const indexSongTable = document.getElementById('index-song-table');

document.addEventListener('DOMContentLoaded', function () {
    if (indexSongTable) {
        loadIndexScores();
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

//Load

function loadIndexScores(which) {
    let table;
    fetchURL = `/songs`;
    table = indexSongTable;    

    fetch(fetchURL)
    .then(response => response.json())
    .then(scores_info => {   
        if (checkIfEmpty(scores_info, table) == true) {
        } else {
            scores_info.forEach(function(score) {
                let newScoreRow = table.children[1].insertRow();

                for (let i = 0; i < 4; i++) {
                    let newCell = newScoreRow.insertCell(); 
                    newCell.className = 'song-td';
                }   
                
                createLink(score.artistName,"", "", `/search/${score.artistName}`, newScoreRow.cells[0]);
                newScoreRow.cells[0].width = "25%";
                createLink(score.scoreName,"", "", `/scores/${score.scoreID}`, newScoreRow.cells[1]);
                newScoreRow.cells[1].width = "40%";
                let dateEmtpyLink = createLink(score.lastModified,"", "", `#`, newScoreRow.cells[2]);
                dateEmtpyLink.style.textDecoration = "none";
                dateEmtpyLink.style.cursor = "inherit";

                scoresID.push(score.scoreID);
                createLink(score.creatorName,"", "", `/profile/${score.creatorID}`, newScoreRow.cells[3]);
            })
        }
    })
}