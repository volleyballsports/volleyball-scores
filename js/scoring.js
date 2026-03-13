// =========================================================
// SCORING & SET LOGIC
// =========================================================

function changeScore(matchId, teamKey, delta) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;
    if (delta === 0) return;

    if (delta > 0) {
        // Block scoring after match is complete
        if (m.matchComplete) {
            alert("Match is complete. No more points can be scored.");
            return;
        }

        // Block scoring until a server is selected
        if (!m.serverTeam) {
            alert(positionRotationEnabled
                ? "Please select a server first using the 'Choose Server' section below."
                : "Please select a server first from the court visualization.");
            return;
        }
        var activeServerPlayer = m.serverTeam === "A" ? m.serverPlayerA : m.serverPlayerB;
        if (!activeServerPlayer) {
            alert("Please select the current server before adding the next point.");
            return;
        }

        if (!m.rallyHistory) m.rallyHistory = [];
        m.rallyHistory.push({
            scoringTeam: teamKey,
            prevScoreA: m.scoreA,
            prevScoreB: m.scoreB,
            prevRotationA: (m.rotationA || []).slice(),
            prevRotationB: (m.rotationB || []).slice(),
            prevServerTeam: m.serverTeam,
            prevServerPlayerA: m.serverPlayerA,
            prevServerPlayerB: m.serverPlayerB,
            prevNextServerTeam: m.nextServerTeam || null,
            prevServerReminder: m.serverReminder || "",
            prevRecentServersA: (m.recentServersA || []).slice(),
            prevRecentServersB: (m.recentServersB || []).slice(),
            prevRallyCounter: m.rallyCounter,
            prevCurrentSet: m.currentSet || 1,
            prevSetsWonA: m.setsWonA || 0,
            prevSetsWonB: m.setsWonB || 0,
            prevSets: (m.sets || []).slice(),
            prevMatchComplete: m.matchComplete || false
        });
        if (teamKey === "A") m.scoreA += delta; else m.scoreB += delta;
        m.rallyCounter += 1;
        logServiceEvent(matchId, teamKey);
        var sideOut = m.serverTeam && m.serverTeam !== teamKey;
        if (sideOut) {
            var brokenServerTeam = m.serverTeam;
            var brokenServerPlayer = brokenServerTeam === "A" ? m.serverPlayerA : m.serverPlayerB;
            applyServeCompletionCooldown(matchId, brokenServerTeam, brokenServerPlayer);

            if (positionRotationEnabled) {
                rotateTeamPositionsInternal(matchId, teamKey);
            }

            m.serverTeam = teamKey;
            m.serverPlayerA = null;
            m.serverPlayerB = null;

            var servingTeamName = teamKey === "A" ? teams[m.team1Index].name : teams[m.team2Index].name;
            m.serverReminder = "Serve broken. Pick a new server for " + servingTeamName + ".";
            m.nextServerTeam = teamKey;
        }
        checkSetComplete(matchId);
    } else {
        undoLastPoint(matchId);
        return;
    }

    refreshScoreUI(matchId);
    renderRotation(matchId, "A");
    renderRotation(matchId, "B");
    highlightServerButton(matchId);
    updateServerWarnings(matchId);
    renderServerReminder(matchId);
    updateStandings();
    renderServiceLogTable(matchId);
    saveToFirebase();
}

// Check if the current set is complete and advance if so.
// A set ends when one team reaches 15+ points with a 2+ point lead.
function checkSetComplete(matchId) {
    var m = matchData[matchId]; if (!m) return;
    var a = m.scoreA, b = m.scoreB;
    var diff = Math.abs(a - b);
    if (!((a >= 15 || b >= 15) && diff >= 2)) return;

    var winner = (a > b) ? "A" : "B";
    m.sets = m.sets || [];
    m.sets.push({ scoreA: a, scoreB: b });
    if (winner === "A") m.setsWonA = (m.setsWonA || 0) + 1;
    else m.setsWonB = (m.setsWonB || 0) + 1;

    // Match ends when one team wins 2 sets
    if (m.setsWonA >= 2 || m.setsWonB >= 2) {
        m.matchComplete = true;
        return;
    }

    // Start next set — reset server so scorer must pick who serves first
    m.currentSet = (m.currentSet || 1) + 1;
    m.scoreA = 0;
    m.scoreB = 0;
    m.serverTeam = null;
    m.serverPlayerA = null;
    m.serverPlayerB = null;
    m.nextServerTeam = null;
    m.serverReminder = "";
    m.recentServersA = [];
    m.recentServersB = [];
}

function undoLastPoint(matchId) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;
    var history = m.rallyHistory || [];
    if (!history.length) return;
    var last = history[history.length - 1];
    history.pop();
    m.scoreA = last.prevScoreA;
    m.scoreB = last.prevScoreB;
    m.rotationA = last.prevRotationA;
    m.rotationB = last.prevRotationB;
    m.serverTeam = last.prevServerTeam;
    m.serverPlayerA = last.prevServerPlayerA;
    m.serverPlayerB = last.prevServerPlayerB;
    m.nextServerTeam = last.prevNextServerTeam || null;
    m.serverReminder = last.prevServerReminder || "";
    m.recentServersA = last.prevRecentServersA || [];
    m.recentServersB = last.prevRecentServersB || [];
    m.rallyCounter = last.prevRallyCounter;
    m.pendingSubLogA = null;
    m.pendingSubLogB = null;
    if (m.serviceLog && m.serviceLog.length) m.serviceLog.pop();
    if (last.prevCurrentSet !== undefined) m.currentSet = last.prevCurrentSet;
    if (last.prevSetsWonA !== undefined) m.setsWonA = last.prevSetsWonA;
    if (last.prevSetsWonB !== undefined) m.setsWonB = last.prevSetsWonB;
    if (last.prevSets !== undefined) m.sets = last.prevSets;
    if (last.prevMatchComplete !== undefined) m.matchComplete = last.prevMatchComplete;

    refreshScoreUI(matchId);
    renderRotation(matchId, "A");
    renderRotation(matchId, "B");
    highlightServerButton(matchId);
    updateServerWarnings(matchId);
    renderServerReminder(matchId);
    updateStandings();
    renderServiceLogTable(matchId);
    saveToFirebase();
}
