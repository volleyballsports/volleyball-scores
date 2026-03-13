// =========================================================
// UI UPDATES — SCORE DISPLAY & SERVICE LOG
// =========================================================

function refreshScoreUI(matchId) {
    var m = matchData[matchId]; if (!m) return;
    var a = document.getElementById("score_" + matchId + "_A");
    var b = document.getElementById("score_" + matchId + "_B");
    if (a) a.textContent = m.scoreA;
    if (b) b.textContent = m.scoreB;

    // Update sets won display
    var swA = document.getElementById("setsWonA_" + matchId);
    var swB = document.getElementById("setsWonB_" + matchId);
    if (swA) swA.textContent = m.setsWonA || 0;
    if (swB) swB.textContent = m.setsWonB || 0;

    // Render set history chips
    var histEl = document.getElementById("setHistory_" + matchId);
    if (histEl) {
        var sets = m.sets || [];
        histEl.innerHTML = sets.map(function (s, i) {
            var aWon = s.scoreA > s.scoreB;
            return "<span class='set-chip " + (aWon ? "won-a" : "won-b") + "'>S" + (i + 1) + ": " + s.scoreA + "–" + s.scoreB + "</span>";
        }).join("");
    }

    // Update current set indicator (net column)
    var indEl = document.getElementById("setIndicator_" + matchId);
    if (indEl) {
        if (m.matchComplete) {
            indEl.textContent = "Match complete";
        } else {
            var curSet = m.currentSet || 1;
            var aScore = m.scoreA || 0;
            var bScore = m.scoreB || 0;
            var deuce = (aScore >= 14 && bScore >= 14);
            indEl.textContent = "Set " + curSet + (deuce ? " · 2-pt lead" : " · to 15");
        }
    }

    // Update set number in score strip center
    var scoreSetEl = document.getElementById("scoreSetNum_" + matchId);
    if (scoreSetEl) {
        scoreSetEl.textContent = m.matchComplete ? "Final" : "Set " + (m.currentSet || 1);
    }

    // Show/hide match complete banner
    var bannerEl = document.getElementById("matchBanner_" + matchId);
    if (bannerEl) {
        if (m.matchComplete) {
            var winnerName = (m.setsWonA || 0) > (m.setsWonB || 0)
                ? teams[m.team1Index].name
                : teams[m.team2Index].name;
            bannerEl.textContent = "🏆 Match complete — " + winnerName + " wins " + (m.setsWonA || 0) + "–" + (m.setsWonB || 0) + " in sets!";
            bannerEl.style.display = "block";
        } else {
            bannerEl.style.display = "none";
        }
    }
}

function renderServiceLogTable(matchId) {
    var m = matchData[matchId]; if (!m) return;
    var container = document.getElementById("serviceLogTable_" + matchId);
    if (!container) return;
    var currentSet = m.currentSet || 1;
    var log = (m.serviceLog || []).filter(function (e) { return (e.set || 1) === currentSet; });
    if (!log.length) {
        container.innerHTML = "<div style='color:var(--text-dim);font-size:0.72rem;padding:4px;'>No serves recorded yet.</div>";
        return;
    }
    function teamLabel(teamKey) {
        if (!teamKey) return "";
        var name = teamKey === "A" ? teams[m.team1Index].name : teams[m.team2Index].name;
        return name;
    }

    var html = "<table><thead><tr><th>Event</th><th>Rally</th><th>Time</th><th>Server</th><th>Scorer</th><th>Details</th><th>Score</th></tr></thead><tbody>";
    log.forEach(function (e) {
        var isSub = e.eventType === "sub";
        var eventLabel = isSub ? "Sub" : "Rally";
        var details = isSub
            ? ((e.teamKey === "A" ? teams[m.team1Index].name : teams[m.team2Index].name) + ": " + (e.playerOut || "") + " ⇄ " + (e.playerIn || ""))
            : "";
        html += "<tr>" +
            "<td>" + eventLabel + "</td>" +
            "<td>" + (e.rally || "") + "</td>" +
            "<td>" + (e.time || "") + "</td>" +
            "<td>" + (isSub ? "—" : (teamLabel(e.serverTeam) + (e.serverPlayer ? " (" + e.serverPlayer + ")" : ""))) + "</td>" +
            "<td>" + (isSub ? "—" : teamLabel(e.scoringTeam)) + "</td>" +
            "<td>" + details + "</td>" +
            "<td>" + (e.scoreA != null ? e.scoreA : "") + " – " + (e.scoreB != null ? e.scoreB : "") + "</td>" +
            "</tr>";
    });
    html += "</tbody></table>";
    container.innerHTML = html;
}

function downloadServiceLog(matchId) {
    var m = matchData[matchId];
    if (!m || !m.serviceLog || !m.serviceLog.length) { alert("No service log."); return; }
    var rows = [["Rally", "Time", "ServerTeam", "ServerPlayer", "ScoringTeam", "ScoreA", "ScoreB"].join(",")];
    m.serviceLog.forEach(function (e) {
        var row = [e.rally || "", e.time || "", e.serverTeam || "", e.serverPlayer || "", e.scoringTeam || "", (e.scoreA != null ? e.scoreA : ""), (e.scoreB != null ? e.scoreB : "")];
        row = row.map(function (c) { var s = String(c).replace(/"/g, '""'); return (s.indexOf(",") >= 0 || s.indexOf('"') >= 0) ? '"' + s + '"' : s; });
        rows.push(row.join(","));
    });
    var blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = "service_log_" + matchId + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
