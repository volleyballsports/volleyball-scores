// =========================================================
// TOURNAMENT INITIALIZATION
// =========================================================

function initializeTournament() {
    if (!isScorer) return;

    var pw = prompt("Re-enter scorer password to confirm reset:");
    if (pw !== SCORER_PASSWORD) {
        alert("Incorrect password. Tournament reset cancelled.");
        return;
    }

    var autoRotateCheckbox = document.getElementById("autoRotateToggle");
    autoRotate = !!(autoRotateCheckbox && autoRotateCheckbox.checked);

    var rrSelect = document.getElementById("rrFormat");
    var rounds = rrSelect ? (parseInt(rrSelect.value, 10) || 1) : 1;

    teams.forEach(function (t, i) {
        var nameInput = document.getElementById("teamName_" + i);
        var logoInput = document.getElementById("logo_" + i);
        var playersInput = document.getElementById("players_" + i);
        var subsInput = document.getElementById("subs_" + i);

        t.name = nameInput ? nameInput.value.trim() || t.name : t.name;
        t.logo = logoInput ? logoInput.value.trim() || "" : "";
        if (playersInput) t.players = playersInput.value.split(",").map(function (p) { return p.trim(); }).filter(Boolean);
        if (subsInput) t.subs = subsInput.value.split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    });

    schedule = generateSchedule(rounds);
    matchData = {};
    activeMatchId = null;
    clearFinalUI();
    buildLeagueMatches();
    if (isScorer) populateMatchSelector();

    var standCard = document.getElementById("standingsCard");
    if (standCard) standCard.style.display = "block";
    updateStandings();

    saveToFirebase();
}

function generateSchedule(rounds) {
    var result = [];
    var counter = 0;
    for (var r = 0; r < rounds; r++) {
        for (var i = 0; i < teams.length; i++) {
            for (var j = i + 1; j < teams.length; j++) {
                result.push({ id: LEAGUE_PREFIX + counter, team1Index: i, team2Index: j });
                counter++;
            }
        }
    }
    return result;
}
