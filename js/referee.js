var teams = [];
var schedule = [];
var matchData = {};
var activeMatchId = null;
var refereeLoggedIn = false;
var refereeSwapped = false;

var app = firebase.initializeApp(FIREBASE_CONFIG);
var db = firebase.database();
var dbRef = db.ref("tournament");

initializeTheme();

function attemptRefereeLogin() {
    var pw = document.getElementById("passwordInput").value;
    if (pw === SCORER_PASSWORD) {
        refereeLoggedIn = true;
        document.getElementById("loginOverlay").style.display = "none";
        document.getElementById("loginError").style.display = "none";
        loadFromFirebase();
    } else {
        document.getElementById("loginError").style.display = "block";
    }
}

function loadFromFirebase() {
    dbRef.on("value", function (snapshot) {
        var data = snapshot.val() || {};
        teams = data.teams || [];
        schedule = data.schedule || [];
        matchData = data.matchData || {};
        activeMatchId = data.activeMatchId || null;
        renderRefereeView();
    });
}

function getCooldownText(m, teamKey, playerName) {
    var cooldowns = teamKey === "A" ? (m.serverCooldownA || {}) : (m.serverCooldownB || {});
    var remaining = cooldowns[playerName] || 0;
    return remaining > 0 ? ("ready in " + remaining) : "ready";
}

function renderRefereeView() {
    if (!refereeLoggedIn) return;
    var emptyEl = document.getElementById("refereeEmpty");
    var viewEl = document.getElementById("refereeView");

    if (!activeMatchId || !matchData[activeMatchId]) {
        if (emptyEl) emptyEl.style.display = "block";
        if (viewEl) {
            viewEl.style.display = "none";
            viewEl.innerHTML = "";
        }
        return;
    }

    var m = matchData[activeMatchId];
    var leftKey = refereeSwapped ? "B" : "A";
    var rightKey = refereeSwapped ? "A" : "B";

    function tName(teamKey) {
        var idx = teamKey === "A" ? m.team1Index : m.team2Index;
        return (teams[idx] && teams[idx].name) || "?";
    }

    function score(teamKey) {
        return teamKey === "A" ? (m.scoreA || 0) : (m.scoreB || 0);
    }

    function sets(teamKey) {
        return teamKey === "A" ? (m.setsWonA || 0) : (m.setsWonB || 0);
    }

    function activePlayers(teamKey) {
        var idx = teamKey === "A" ? m.team1Index : m.team2Index;
        return (teamKey === "A" ? m.activePlayersA : m.activePlayersB) || ((teams[idx] && teams[idx].players) || []);
    }

    function benchPlayers(teamKey) {
        var idx = teamKey === "A" ? m.team1Index : m.team2Index;
        return (teamKey === "A" ? m.availableSubsA : m.availableSubsB) || ((teams[idx] && teams[idx].subs) || []);
    }

    var currentServer = "Not selected";
    if (m.serverTeam) {
        var serverPlayer = m.serverTeam === "A" ? m.serverPlayerA : m.serverPlayerB;
        currentServer = tName(m.serverTeam) + (serverPlayer ? (" — " + serverPlayer) : " — pending");
    }

    var serverHistory = (m.serviceLog || []).reduce(function (acc, evt) {
        if (!evt.serverTeam || !evt.serverPlayer) return acc;
        var id = evt.serverTeam + "::" + evt.serverPlayer;
        if (acc.lastId === id) return acc;
        acc.lastId = id;
        acc.rows.push({
            teamKey: evt.serverTeam,
            player: evt.serverPlayer
        });
        return acc;
    }, { lastId: null, rows: [] }).rows;

    var historyHtml = serverHistory.length
        ? serverHistory.map(function (entry, i) {
            return "<div class='ref-server-row'><span>" + (i + 1) + ". " + escHtml(tName(entry.teamKey)) + " — " + escHtml(entry.player) + "</span><span>" + getCooldownText(m, entry.teamKey, entry.player) + "</span></div>";
        }).join("")
        : "<div class='ref-muted'>No serves recorded yet.</div>";
    var subSummary = (m.serviceLog || []).filter(function (evt) {
        return evt.eventType === "sub";
    });
    var subSummaryHtml = subSummary.length
        ? subSummary.map(function (evt, i) {
            var score = (evt.scoreA != null && evt.scoreB != null) ? (evt.scoreA + "–" + evt.scoreB) : "—";
            var point = evt.rally != null ? ("Rally " + evt.rally) : ("Set " + (evt.set || 1) + ", " + score);
            var teamName = tName(evt.teamKey);
            var players = evt.playerOut ? (evt.playerOut + " ⇄ " + evt.playerIn) : evt.playerIn;
            return "<div class='ref-server-row'><span>" + (i + 1) + ". " + escHtml(teamName) + " — " + escHtml(players) + "</span><span>" + escHtml(point) + "</span></div>";
        }).join("")
        : "<div class='ref-muted'>No substitutions yet.</div>";

    var html = "" +
        "<div class='ref-scoreboard'>" +
        "<div class='ref-team-name'>" + escHtml(tName(leftKey)) + "</div>" +
        "<div class='ref-team-name'>" + escHtml(tName(rightKey)) + "</div>" +
        "<div class='ref-score'>" + score(leftKey) + "</div>" +
        "<div class='ref-score'>" + score(rightKey) + "</div>" +
        "<div class='ref-sets'>Sets: " + sets(leftKey) + "</div>" +
        "<div class='ref-sets'>Sets: " + sets(rightKey) + "</div>" +
        "</div>" +
        "<div class='ref-server-current'>Current Server: " + escHtml(currentServer) + "</div>" +
        "<div class='ref-section-title'>Server Order Summary</div>" +
        "<div class='ref-server-list'>" + historyHtml + "</div>" +
        "<div class='ref-section-title'>Substitution Summary</div>" +
        "<div class='ref-server-list'>" + subSummaryHtml + "</div>" +
        "<div class='ref-rosters'>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(leftKey)) + " · On Court</div><div class='ref-pill-wrap'>" + activePlayers(leftKey).map(function (p) { return "<span class='player-btn'>" + escHtml(p) + "</span>"; }).join("") + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(rightKey)) + " · On Court</div><div class='ref-pill-wrap'>" + activePlayers(rightKey).map(function (p) { return "<span class='player-btn'>" + escHtml(p) + "</span>"; }).join("") + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(leftKey)) + " · Bench</div><div class='ref-pill-wrap'>" + benchPlayers(leftKey).map(function (p) { return "<span class='player-btn'>" + escHtml(p) + "</span>"; }).join("") + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(rightKey)) + " · Bench</div><div class='ref-pill-wrap'>" + benchPlayers(rightKey).map(function (p) { return "<span class='player-btn'>" + escHtml(p) + "</span>"; }).join("") + "</div></div>" +
        "</div>";

    if (emptyEl) emptyEl.style.display = "none";
    if (viewEl) {
        viewEl.style.display = "block";
        viewEl.innerHTML = html;
    }
}

function swapRefereeSides() {
    refereeSwapped = !refereeSwapped;
    renderRefereeView();
}

document.getElementById("passwordInput").addEventListener("keyup", function (e) {
    if (e.key === "Enter") attemptRefereeLogin();
});
