var teams = [];
var schedule = [];
var matchData = {};
var activeMatchId = null;
var refereeSwapped = false;

var app = firebase.initializeApp(FIREBASE_CONFIG);
var db = firebase.database();
var dbRef = db.ref("tournament");

initializeTheme();
loadFromFirebase();

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

function getCooldownRemaining(m, teamKey, playerName) {
    var cooldowns = teamKey === "A" ? (m.serverCooldownA || {}) : (m.serverCooldownB || {});
    return cooldowns[playerName] || 0;
}

function getCooldownText(m, teamKey, playerName) {
    var remaining = getCooldownRemaining(m, teamKey, playerName);
    return remaining > 0 ? ("ready in " + remaining) : "ready";
}

function shouldShowNextServerCandidates(m, teamKey) {
    if (!m) return false;
    if (m.nextServerTeam) return m.nextServerTeam === teamKey;
    if (!m.serverTeam) return true;
    var selected = teamKey === "A" ? m.serverPlayerA : m.serverPlayerB;
    return m.serverTeam === teamKey && !selected;
}

function isNextServerCandidate(m, teamKey, playerName) {
    if (!m || !playerName) return false;
    if (m.nextServerTeam && teamKey !== m.nextServerTeam) return false;
    if (m.nextServerTeam && ((teamKey === "A" && m.serverPlayerA) || (teamKey === "B" && m.serverPlayerB))) return false;
    return shouldShowNextServerCandidates(m, teamKey) && getCooldownRemaining(m, teamKey, playerName) <= 0;
}

function renderRefereeView() {
    var emptyEl = document.getElementById("refereeEmpty");
    var viewEl = document.getElementById("refereeView");

    var currentMatchId = activeMatchId;
    if (!currentMatchId || (!matchData[currentMatchId] && !(schedule || []).some(function (s) { return s.id === currentMatchId; }))) {
        var unresolvedMatchId = null;
        (schedule || []).some(function (s) {
            var sm = matchData[s.id];
            if (!sm || !sm.matchComplete) {
                unresolvedMatchId = s.id;
                return true;
            }
            return false;
        });
        if (!unresolvedMatchId) {
            var allMatchIds = Object.keys(matchData || {});
            unresolvedMatchId = allMatchIds.length ? allMatchIds[0] : null;
        }
        currentMatchId = unresolvedMatchId;
    }

    if (!currentMatchId) {
        if (emptyEl) emptyEl.style.display = "block";
        if (viewEl) {
            viewEl.style.display = "none";
            viewEl.innerHTML = "";
        }
        return;
    }

    var scheduleMatch = (schedule || []).find(function (s) { return s.id === currentMatchId; }) || null;
    var m = matchData[currentMatchId] || {
        team1Index: scheduleMatch ? scheduleMatch.team1Index : 0,
        team2Index: scheduleMatch ? scheduleMatch.team2Index : 1,
        scoreA: 0,
        scoreB: 0,
        setsWonA: 0,
        setsWonB: 0,
        serviceLog: []
    };
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

    function teamServerHistory(teamKey) {
        var teamRows = [];
        var lastServer = null;
        (m.serviceLog || []).forEach(function (evt) {
            if (!evt.serverTeam || !evt.serverPlayer || evt.serverTeam !== teamKey) return;
            if (lastServer === evt.serverPlayer) return;
            lastServer = evt.serverPlayer;
            teamRows.push(evt.serverPlayer);
        });
        return teamRows;
    }

    function teamSubSummary(teamKey) {
        return (m.serviceLog || []).filter(function (evt) {
            return evt.eventType === "sub" && evt.teamKey === teamKey;
        });
    }

    function renderServerRows(teamKey) {
        var history = teamServerHistory(teamKey);
        if (!history.length) return "<div class='ref-muted'>No serves recorded yet.</div>";
        return history.map(function (player, i) {
            return "<div class='ref-server-row'><span>" + (i + 1) + ". " + escHtml(player) + "</span><span>" + getCooldownText(m, teamKey, player) + "</span></div>";
        }).join("");
    }

    function renderSubRows(teamKey) {
        var subs = teamSubSummary(teamKey);
        if (!subs.length) return "<div class='ref-muted'>No substitutions yet.</div>";
        return subs.map(function (evt, i) {
            var scoreLabel = (evt.scoreA != null && evt.scoreB != null) ? (evt.scoreA + "–" + evt.scoreB) : "—";
            var point = evt.rally != null ? ("Rally " + evt.rally) : ("Set " + (evt.set || 1) + ", " + scoreLabel);
            var players = evt.playerOut ? (evt.playerOut + " ⇄ " + evt.playerIn) : evt.playerIn;
            return "<div class='ref-server-row'><span>" + (i + 1) + ". " + escHtml(players) + "</span><span>" + escHtml(point) + "</span></div>";
        }).join("");
    }

    function renderPlayerPills(teamKey, players) {
        return players.map(function (p) {
            var classes = ["player-btn"];
            var isSelected = (teamKey === "A" && m.serverPlayerA === p) || (teamKey === "B" && m.serverPlayerB === p);
            if (isSelected) classes.push("server-highlight");
            if (getCooldownRemaining(m, teamKey, p) > 0) classes.push("cooling-down");
            if (!isSelected && isNextServerCandidate(m, teamKey, p)) classes.push("next-server-candidate");
            return "<span class='" + classes.join(" ") + "'>" + escHtml(p) + "</span>";
        }).join("");
    }

    var currentServer = "Not selected";
    if (m.serverTeam) {
        var serverPlayer = m.serverTeam === "A" ? m.serverPlayerA : m.serverPlayerB;
        currentServer = tName(m.serverTeam) + (serverPlayer ? (" — " + serverPlayer) : " — pending");
    }

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
        "<div class='ref-summary-grid'>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(leftKey)) + " · Server Summary</div><div class='ref-server-list'>" + renderServerRows(leftKey) + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(rightKey)) + " · Server Summary</div><div class='ref-server-list'>" + renderServerRows(rightKey) + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(leftKey)) + " · Substitution Summary</div><div class='ref-server-list'>" + renderSubRows(leftKey) + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(rightKey)) + " · Substitution Summary</div><div class='ref-server-list'>" + renderSubRows(rightKey) + "</div></div>" +
        "</div>" +
        "<div class='ref-rosters'>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(leftKey)) + " · On Court</div><div class='ref-pill-wrap'>" + renderPlayerPills(leftKey, activePlayers(leftKey)) + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(rightKey)) + " · On Court</div><div class='ref-pill-wrap'>" + renderPlayerPills(rightKey, activePlayers(rightKey)) + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(leftKey)) + " · Bench</div><div class='ref-pill-wrap'>" + renderPlayerPills(leftKey, benchPlayers(leftKey)) + "</div></div>" +
        "<div><div class='ref-section-title'>" + escHtml(tName(rightKey)) + " · Bench</div><div class='ref-pill-wrap'>" + renderPlayerPills(rightKey, benchPlayers(rightKey)) + "</div></div>" +
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
