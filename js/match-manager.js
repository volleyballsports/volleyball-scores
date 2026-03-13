// =========================================================
// MATCH STATE & UI MANAGEMENT
// =========================================================

function createEmptyMatchState(matchId, t1, t2) {
    return {
        id: matchId,
        team1Index: t1,
        team2Index: t2,
        scoreA: 0, scoreB: 0,
        rotationA: [1, 2, 3, 4, 5, 6],
        rotationB: [1, 2, 3, 4, 5, 6],
        rallyHistory: [],
        serverTeam: null,
        serverPlayerA: null,
        serverPlayerB: null,
        rallyCounter: 0,
        serviceLog: [],
        subsA: [],
        subsB: [],
        activePlayersA: null,
        activePlayersB: null,
        availableSubsA: null,
        availableSubsB: null,
        pendingSubA: -1,
        pendingSubB: -1,
        currentSet: 1,
        setsWonA: 0,
        setsWonB: 0,
        sets: [],
        matchComplete: false
    };
}

// Ensure set-tracking fields exist on loaded match data (backwards-compat with Firebase data)
function ensureSetState(matchId) {
    var m = matchData[matchId]; if (!m) return;
    if (m.currentSet === undefined) m.currentSet = 1;
    if (m.setsWonA === undefined) m.setsWonA = 0;
    if (m.setsWonB === undefined) m.setsWonB = 0;
    if (!m.sets) m.sets = [];
    if (m.matchComplete === undefined) m.matchComplete = false;
}

// Ensure per-match rosters are initialized (call before using activePlayers)
function ensureActivePlayers(matchId) {
    var m = matchData[matchId]; if (!m) return;
    if (!m.activePlayersA) {
        m.activePlayersA = (teams[m.team1Index].players || []).slice();
        m.availableSubsA = (teams[m.team1Index].subs || []).slice();
    }
    if (!m.activePlayersB) {
        m.activePlayersB = (teams[m.team2Index].players || []).slice();
        m.availableSubsB = (teams[m.team2Index].subs || []).slice();
    }
    if (m.pendingSubA === undefined) m.pendingSubA = -1;
    if (m.pendingSubB === undefined) m.pendingSubB = -1;
}

function clearFinalUI() {
    var fc = document.getElementById("finalCard");
    var fco = document.getElementById("finalContent");
    var fl = document.getElementById("finalTeamsLabel");
    if (fc) fc.style.display = "none";
    if (fco) fco.innerHTML = "";
    if (fl) fl.textContent = "";
}

function buildLeagueMatches() {
    var container = document.getElementById("tournament");
    if (container) container.innerHTML = "";

    schedule.forEach(function (s) {
        var mid = s.id;
        matchData[mid] = createEmptyMatchState(mid, s.team1Index, s.team2Index);
        var html = buildMatchCardHTML(mid, s.team1Index, s.team2Index, false);
        if (container) container.insertAdjacentHTML("beforeend", html);
        renderRotation(mid, "A");
        renderRotation(mid, "B");
    });
}

function setActiveMatch(matchId) {
    if (!isScorer) return;
    activeMatchId = matchId || null;
    saveToFirebase();
    rebuildAllMatchUI();
}

function populateMatchSelector() {
    var sel = document.getElementById("activeMatchSelect");
    if (!sel) return;
    sel.innerHTML = "<option value=''>— Select a match to score —</option>";
    schedule.forEach(function (s) {
        var m = matchData[s.id];
        var t1 = teams[s.team1Index] || {}, t2 = teams[s.team2Index] || {};
        var num = parseInt(s.id.replace(LEAGUE_PREFIX, ""), 10) + 1;
        var label = "Match " + num + ": " + (t1.name || "?") + " vs " + (t2.name || "?");
        if (m && m.matchComplete) label += " ✓";
        var opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = label;
        sel.appendChild(opt);
    });
    // Also add final if it exists
    if (matchData[FINAL_MATCH_ID]) {
        var mf = matchData[FINAL_MATCH_ID];
        var tf1 = teams[mf.team1Index] || {}, tf2 = teams[mf.team2Index] || {};
        var opt = document.createElement("option");
        opt.value = FINAL_MATCH_ID;
        opt.textContent = "Final: " + (tf1.name || "?") + " vs " + (tf2.name || "?");
        sel.appendChild(opt);
    }
    // Restore selection
    if (activeMatchId) sel.value = activeMatchId;
}

function rebuildAllMatchUI() {
    tapSwapState = null; // clear any pending tap-to-swap selection
    var tDiv = document.getElementById("tournament");
    var ongoingDiv = document.getElementById("ongoingMatch");
    if (tDiv) tDiv.innerHTML = "";
    if (ongoingDiv) ongoingDiv.innerHTML = "";

    if (!schedule || !schedule.length) return;

    // Show/hide match selector bar for scorer
    var selectorBar = document.getElementById("matchSelectorBar");
    if (selectorBar) selectorBar.style.display = isScorer ? "flex" : "none";
    if (isScorer) populateMatchSelector();

    // Verify activeMatchId still refers to a real match
    var validIds = schedule.map(function (s) { return s.id; });
    if (matchData[FINAL_MATCH_ID]) validIds.push(FINAL_MATCH_ID);
    if (activeMatchId && validIds.indexOf(activeMatchId) < 0) activeMatchId = null;

    // Helper: fully render a match card into a container element
    function renderFullCard(container, matchId, t1Index, t2Index, isFinal) {
        if (!matchData[matchId]) {
            matchData[matchId] = createEmptyMatchState(matchId, t1Index, t2Index);
        }
        ensureActivePlayers(matchId);
        ensureSetState(matchId);

        var html = buildMatchCardHTML(matchId, t1Index, t2Index, isFinal);
        container.insertAdjacentHTML("beforeend", html);

        renderRotation(matchId, "A");
        renderRotation(matchId, "B");
        restoreCourtSwap(matchId);
        refreshScoreUI(matchId);
        renderServerButtons(matchId);
        renderServiceLogTable(matchId);
        updateSubUI(matchId, "A");
        updateSubUI(matchId, "B");
        updateViewerBenchUI(matchId);

        var m = matchData[matchId];
        ["A", "B"].forEach(function (tk) {
            var subs = (tk === "A") ? m.subsA : m.subsB;
            if (!subs) return;
            subs.forEach(function (sub) {
                var logDiv = document.getElementById("subLog_" + matchId + "_" + tk);
                if (logDiv) {
                    var entry = document.createElement("div");
                    entry.textContent = sub.playerOut
                        ? "• " + sub.playerOut + " ⇄ " + sub.playerIn + "  (Set " + (sub.set || 1) + "  " + (sub.scoreA || 0) + "–" + (sub.scoreB || 0) + "  " + sub.time + ")"
                        : "• " + sub.player + " at " + sub.time;
                    logDiv.appendChild(entry);
                }
            });
        });
    }

    // Render active match (full card) at the top
    if (activeMatchId && matchData[activeMatchId] !== undefined) {
        var activeSchedule = null;
        schedule.forEach(function (s) { if (s.id === activeMatchId) activeSchedule = s; });
        var isFinalActive = (activeMatchId === FINAL_MATCH_ID);
        var aT1 = isFinalActive ? matchData[FINAL_MATCH_ID].team1Index : (activeSchedule ? activeSchedule.team1Index : 0);
        var aT2 = isFinalActive ? matchData[FINAL_MATCH_ID].team2Index : (activeSchedule ? activeSchedule.team2Index : 1);

        if (ongoingDiv) {
            var labelDiv = document.createElement("div");
            labelDiv.className = "active-match-label";
            labelDiv.textContent = "Current Match";
            ongoingDiv.appendChild(labelDiv);
            renderFullCard(ongoingDiv, activeMatchId, aT1, aT2, isFinalActive);
        }
    }

    // Render other league matches — compact summary cards (or full if no active match set)
    var hasOtherMatches = false;
    schedule.forEach(function (s) {
        if (s.id === activeMatchId) return;
        if (!matchData[s.id]) {
            matchData[s.id] = createEmptyMatchState(s.id, s.team1Index, s.team2Index);
        }
        ensureSetState(s.id);
        hasOtherMatches = true;
        if (tDiv) {
            if (activeMatchId) {
                tDiv.insertAdjacentHTML("beforeend", buildMatchSummaryHTML(s.id, s.team1Index, s.team2Index, false));
            } else {
                renderFullCard(tDiv, s.id, s.team1Index, s.team2Index, false);
            }
        }
    });

    // Add "Other Matches" label when there's an active match and other matches exist
    if (activeMatchId && hasOtherMatches && tDiv) {
        var otherLabel = document.createElement("div");
        otherLabel.className = "other-matches-label";
        otherLabel.textContent = "Other Matches";
        tDiv.insertBefore(otherLabel, tDiv.firstChild);
    }

    // Standings
    var standCard = document.getElementById("standingsCard");
    if (standCard && schedule.length > 0) {
        standCard.style.display = "block";
        updateStandings();
    }

    // Final match
    if (matchData[FINAL_MATCH_ID] && activeMatchId !== FINAL_MATCH_ID) {
        var mf = matchData[FINAL_MATCH_ID];
        var finalCard = document.getElementById("finalCard");
        var finalContent = document.getElementById("finalContent");
        var finalLabel = document.getElementById("finalTeamsLabel");
        if (finalCard && finalContent) {
            if (activeMatchId) {
                finalContent.innerHTML = buildMatchSummaryHTML(FINAL_MATCH_ID, mf.team1Index, mf.team2Index, true);
            } else {
                var html = buildMatchCardHTML(FINAL_MATCH_ID, mf.team1Index, mf.team2Index, true);
                finalContent.innerHTML = html;
                renderRotation(FINAL_MATCH_ID, "A");
                renderRotation(FINAL_MATCH_ID, "B");
                refreshScoreUI(FINAL_MATCH_ID);
                renderServerButtons(FINAL_MATCH_ID);
                renderServiceLogTable(FINAL_MATCH_ID);
            }
            finalLabel.textContent = teams[mf.team1Index].name + " vs " + teams[mf.team2Index].name;
            finalCard.style.display = "block";
        }
    } else if (!matchData[FINAL_MATCH_ID]) {
        var fcHide = document.getElementById("finalCard");
        if (fcHide) fcHide.style.display = "none";
    }
}
