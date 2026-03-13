// =========================================================
// SERVER SELECTION & SERVICE LOG
// =========================================================

function setServer(matchId, teamKey, playerName) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;

    var activeServerTeam = m.serverTeam;
    var activeServerPlayer = activeServerTeam === "A" ? m.serverPlayerA : m.serverPlayerB;
    var canChangeServer = !!m.nextServerTeam;
    var isOpeningScore = (m.scoreA || 0) === 0 && (m.scoreB || 0) === 0;
    if (!canChangeServer && activeServerTeam && activeServerPlayer &&
        teamKey !== activeServerTeam && !isOpeningScore) {
        alert("Server can only be changed after a side-out or if the current server is substituted.");
        return;
    }

    if (m.nextServerTeam && teamKey !== m.nextServerTeam) {
        var requiredTeamName = m.nextServerTeam === "A" ? teams[m.team1Index].name : teams[m.team2Index].name;
        alert("Serve was just broken. Please pick the next server from " + requiredTeamName + ".");
        return;
    }

    if (serverRotationEnabled) {
        var cooldowns = teamKey === "A" ? (m.serverCooldownA || {}) : (m.serverCooldownB || {});
        var remaining = cooldowns[playerName] || 0;
        if (remaining > 0) {
            alert(playerName + " must wait for " + remaining + " more server change" + (remaining === 1 ? "" : "s") + " before serving again.");
            return;
        }
    }

    m.serverTeam = teamKey;
    m.serverPlayerA = null;
    m.serverPlayerB = null;
    if (teamKey === "A") m.serverPlayerA = playerName;
    else m.serverPlayerB = playerName;
    m.nextServerTeam = null;

    applyServerSelectionCooldown(matchId, teamKey, playerName);
    m.serverReminder = "";

    // Keep the court visualization in sync immediately when server is picked
    // from a court cell. Without this, the server slot highlight appears only
    // after the next score update triggers a re-render.
    renderRotation(matchId, "A");
    renderRotation(matchId, "B");

    renderServerButtons(matchId);
    saveToFirebase();
}

function isServerSelectionAllowed(m, teamKey, playerName) {
    if (!m || !playerName) return false;
    if (m.nextServerTeam && teamKey !== m.nextServerTeam) return false;
    if (m.nextServerTeam && ((teamKey === "A" && m.serverPlayerA) || (teamKey === "B" && m.serverPlayerB))) return false;
    var cooldowns = teamKey === "A" ? (m.serverCooldownA || {}) : (m.serverCooldownB || {});
    return (cooldowns[playerName] || 0) <= 0;
}

function renderServerReminder(matchId) {
    var m = matchData[matchId]; if (!m) return;
    var reminderEl = document.getElementById("serverReminder_" + matchId);
    if (!reminderEl) return;
    var msg = m.serverReminder || "";
    reminderEl.textContent = msg;
    reminderEl.className = "server-rotation-reminder" + (msg ? " show" : "");
}

function applyServerSelectionCooldown(matchId, teamKey, selectedPlayer) {
    if (!serverRotationEnabled) return;
    var m = matchData[matchId]; if (!m) return;
    var cooldowns = teamKey === "A" ? (m.serverCooldownA || {}) : (m.serverCooldownB || {});
    Object.keys(cooldowns).forEach(function (name) {
        if (name === selectedPlayer) return;
        cooldowns[name] = Math.max(0, (cooldowns[name] || 0) - 1);
        if (cooldowns[name] <= 0) delete cooldowns[name];
    });
    if (teamKey === "A") m.serverCooldownA = cooldowns;
    else m.serverCooldownB = cooldowns;
}

function applyServerBreakCooldown(matchId, teamKey, serverName) {
    if (!serverRotationEnabled || !serverName) return;
    var m = matchData[matchId]; if (!m) return;
    var cooldowns = teamKey === "A" ? (m.serverCooldownA || {}) : (m.serverCooldownB || {});
    cooldowns[serverName] = 5;
    if (teamKey === "A") m.serverCooldownA = cooldowns;
    else m.serverCooldownB = cooldowns;
}

function getServerPositionWarning(matchId, teamKey, playerName) {
    if (!positionRotationEnabled) return "";
    var m = matchData[matchId]; if (!m) return "";
    var players = teamKey === "A" ? (m.activePlayersA || teams[m.team1Index].players || []) : (m.activePlayersB || teams[m.team2Index].players || []);
    var rot = teamKey === "A" ? (m.rotationA || []) : (m.rotationB || []);
    var pos1Player = players[(rot[0] || 1) - 1];
    if (!playerName || !pos1Player || pos1Player === playerName) return "";
    return "⚠ Selected server is not in position 1 (rear-left). Current position-1 player: " + pos1Player;
}

function updateServerWarnings(matchId) {
    var m = matchData[matchId]; if (!m) return;
    ["A","B"].forEach(function (teamKey) {
        var warnEl = document.getElementById("serverWarning_" + matchId + "_" + teamKey);
        if (!warnEl) return;
        var selected = teamKey === "A" ? m.serverPlayerA : m.serverPlayerB;
        var msg = getServerPositionWarning(matchId, teamKey, selected);
        warnEl.textContent = msg;
        warnEl.className = "server-position-warning" + (msg ? " show" : "");
    });
}

// Render server-selection buttons using the active (possibly substituted) roster.
function renderServerButtons(matchId) {
    var m = matchData[matchId]; if (!m) return;
    ensureActivePlayers(matchId);
    var t1 = teams[m.team1Index], t2 = teams[m.team2Index];
    var playersA = m.activePlayersA || t1.players || [];
    var playersB = m.activePlayersB || t2.players || [];

    var containerA = document.getElementById("srvContainer_" + matchId + "_A");
    var containerB = document.getElementById("srvContainer_" + matchId + "_B");

    if (!positionRotationEnabled) {
        if (containerA) containerA.innerHTML = "";
        if (containerB) containerB.innerHTML = "";
        renderServerReminder(matchId);
        return;
    }

    if (containerA) {
        containerA.innerHTML = playersA.map(function (p) {
            var sid = "srv_" + matchId + "_A_" + safeId(p);
            var remaining = (m.serverCooldownA || {})[p] || 0;
            var blockedBySideOut = m.nextServerTeam && m.nextServerTeam !== "A";
            var title = remaining > 0
                ? " title='Wait " + remaining + " change(s)'"
                : (blockedBySideOut ? " title='Pick the next server from the other team first'" : "");
            var isSelected = m.serverPlayerA === p;
            var isCandidate = !isSelected && isServerSelectionAllowed(m, "A", p);
            var classes = "player-btn" + (remaining > 0 ? " cooling-down" : "") + (blockedBySideOut ? " cooling-down" : "") + (isCandidate ? " next-server-candidate" : "");
            return "<span id='" + sid + "' class='" + classes + "'" + title + " onclick=\"setServer('" + matchId + "','A','" + escJs(p) + "')\">" + escHtml(p) + "</span>";
        }).join("");
    }
    if (containerB) {
        containerB.innerHTML = playersB.map(function (p) {
            var sid = "srv_" + matchId + "_B_" + safeId(p);
            var remaining = (m.serverCooldownB || {})[p] || 0;
            var blockedBySideOut = m.nextServerTeam && m.nextServerTeam !== "B";
            var title = remaining > 0
                ? " title='Wait " + remaining + " change(s)'"
                : (blockedBySideOut ? " title='Pick the next server from the other team first'" : "");
            var isSelected = m.serverPlayerB === p;
            var isCandidate = !isSelected && isServerSelectionAllowed(m, "B", p);
            var classes = "player-btn" + (remaining > 0 ? " cooling-down" : "") + (blockedBySideOut ? " cooling-down" : "") + (isCandidate ? " next-server-candidate" : "");
            return "<span id='" + sid + "' class='" + classes + "'" + title + " onclick=\"setServer('" + matchId + "','B','" + escJs(p) + "')\">" + escHtml(p) + "</span>";
        }).join("");
    }
    highlightServerButton(matchId);
    updateServerWarnings(matchId);
    renderServerReminder(matchId);
}

function highlightServerButton(matchId) {
    var m = matchData[matchId]; if (!m) return;
    var t1 = teams[m.team1Index], t2 = teams[m.team2Index];
    // Clear highlights from all possible names (original + active roster)
    var pA = (t1.players || []).concat(m.activePlayersA || []);
    var pB = (t2.players || []).concat(m.activePlayersB || []);

    pA.forEach(function (p) {
        var el = document.getElementById("srv_" + matchId + "_A_" + safeId(p));
        if (el) el.classList.remove("server-highlight");
    });
    pB.forEach(function (p) {
        var el = document.getElementById("srv_" + matchId + "_B_" + safeId(p));
        if (el) el.classList.remove("server-highlight");
    });

    if (m.serverPlayerA) {
        var elA = document.getElementById("srv_" + matchId + "_A_" + safeId(m.serverPlayerA));
        if (elA) elA.classList.add("server-highlight");
    }
    if (m.serverPlayerB) {
        var elB = document.getElementById("srv_" + matchId + "_B_" + safeId(m.serverPlayerB));
        if (elB) elB.classList.add("server-highlight");
    }

    pA.forEach(function (p) {
        var el = document.getElementById("srv_" + matchId + "_A_" + safeId(p));
        if (el && p !== m.serverPlayerA && isServerSelectionAllowed(m, "A", p)) el.classList.add("next-server-candidate");
    });
    pB.forEach(function (p) {
        var el = document.getElementById("srv_" + matchId + "_B_" + safeId(p));
        if (el && p !== m.serverPlayerB && isServerSelectionAllowed(m, "B", p)) el.classList.add("next-server-candidate");
    });
}

function logServiceEvent(matchId, scoringTeam) {
    var m = matchData[matchId]; if (!m) return;
    var serverTeam = m.serverTeam;
    var serverPlayer = (serverTeam === "A") ? m.serverPlayerA : m.serverPlayerB;
    if (!m.serviceLog) m.serviceLog = [];
    m.pendingSubLogA = null;
    m.pendingSubLogB = null;
    m.serviceLog.push({
        time: new Date().toLocaleTimeString(),
        serverTeam: serverTeam,
        serverPlayer: serverPlayer || "",
        scoringTeam: scoringTeam,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        rally: m.rallyCounter
    });
}
