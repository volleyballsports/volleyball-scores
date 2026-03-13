// =========================================================
// STANDINGS & FINAL MATCH
// =========================================================

function getStandingsData() {
    var n = teams.length;
    var wins = new Array(n).fill(0);   // match wins
    var matches = new Array(n).fill(0); // matches completed
    var pf = new Array(n).fill(0);     // points for
    var pa = new Array(n).fill(0);     // points against
    schedule.forEach(function (s) {
        var m = matchData[s.id]; if (!m) return;
        var totalPointsA = 0;
        var totalPointsB = 0;
        (m.sets || []).forEach(function (setScore) {
            totalPointsA += setScore.scoreA || 0;
            totalPointsB += setScore.scoreB || 0;
        });
        totalPointsA += m.scoreA || 0;
        totalPointsB += m.scoreB || 0;
        if (m.matchComplete) {
            matches[s.team1Index]++;
            matches[s.team2Index]++;
        }
        pf[s.team1Index] += totalPointsA;
        pa[s.team1Index] += totalPointsB;
        pf[s.team2Index] += totalPointsB;
        pa[s.team2Index] += totalPointsA;

        var setsA = m.setsWonA || 0;
        var setsB = m.setsWonB || 0;
        if (m.matchComplete) {
            if (setsA > setsB) wins[s.team1Index]++;
            else wins[s.team2Index]++;
        }
    });
    var data = [];
    for (var i = 0; i < n; i++) data.push({ idx: i, name: teams[i].name, wins: wins[i], matches: matches[i], pf: pf[i], pa: pa[i] });
    data.sort(function (a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        var diffA = a.pf - a.pa;
        var diffB = b.pf - b.pa;
        if (diffB !== diffA) return diffB - diffA;
        return b.pf - a.pf;
    });
    return data;
}

function updateStandings() {
    var table = document.getElementById("standingsTable");
    if (!table) return;
    var data = getStandingsData();
    var html = "<tr><th>#</th><th>Team</th><th>MW</th><th>M</th><th>PF</th><th>PA</th><th>Diff</th></tr>";
    data.forEach(function (row, idx) {
        var diff = row.pf - row.pa;
        html += "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td>" + escHtml(row.name) + "</td>" +
            "<td style='font-weight:700;'>" + row.wins + "</td>" +
            "<td>" + row.matches + "</td>" +
            "<td>" + row.pf + "</td>" +
            "<td>" + row.pa + "</td>" +
            "<td style='color:" + (diff >= 0 ? "var(--green)" : "var(--red)") + ";font-weight:600;'>" + (diff >= 0 ? "+" : "") + diff + "</td>" +
            "</tr>";
    });
    table.innerHTML = html;
}

function buildFinalMatch() {
    if (!isScorer) return;
    var data = getStandingsData();
    if (!data || data.length < 2) { alert("Need at least 2 teams."); return; }

    var t1Index = data[0].idx, t2Index = data[1].idx;
    matchData[FINAL_MATCH_ID] = createEmptyMatchState(FINAL_MATCH_ID, t1Index, t2Index);

    var finalCard = document.getElementById("finalCard");
    var finalContent = document.getElementById("finalContent");
    var finalLabel = document.getElementById("finalTeamsLabel");

    var html = buildMatchCardHTML(FINAL_MATCH_ID, t1Index, t2Index, true);
    if (finalContent) finalContent.innerHTML = html;
    if (finalLabel) finalLabel.textContent = teams[t1Index].name + " vs " + teams[t2Index].name;
    if (finalCard) finalCard.style.display = "block";

    renderRotation(FINAL_MATCH_ID, "A");
    renderRotation(FINAL_MATCH_ID, "B");
    refreshScoreUI(FINAL_MATCH_ID);
    renderServerButtons(FINAL_MATCH_ID);
    renderServiceLogTable(FINAL_MATCH_ID);
    updateSubUI(FINAL_MATCH_ID, "A");
    updateSubUI(FINAL_MATCH_ID, "B");
    saveToFirebase();
}
