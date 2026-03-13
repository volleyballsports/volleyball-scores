// =========================================================
// PLAYER SUBSTITUTION
// =========================================================

// Step 1: Scorer taps a court player to mark them for substitution.
function selectSubOut(matchId, teamKey, playerIdx) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;
    var current = (teamKey === "A") ? m.pendingSubA : m.pendingSubB;
    // Toggle: tap again to deselect
    var next = (current === playerIdx) ? -1 : playerIdx;
    if (teamKey === "A") m.pendingSubA = next; else m.pendingSubB = next;
    updateSubUI(matchId, teamKey);
}

// Step 2: Scorer taps a bench player to complete the substitution.
function substitutePlayer(matchId, teamKey, subName) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;
    ensureActivePlayers(matchId);

    var pendingIdx = (teamKey === "A") ? m.pendingSubA : m.pendingSubB;
    if (pendingIdx < 0) {
        alert("Tap a court player first to select who to substitute out.");
        return;
    }

    var activePlayers = (teamKey === "A") ? m.activePlayersA : m.activePlayersB;
    var availSubs = (teamKey === "A") ? m.availableSubsA : m.availableSubsB;
    var playerOut = activePlayers[pendingIdx];

    // Swap: bench player comes onto court, court player goes to bench
    activePlayers[pendingIdx] = subName;
    var benchIdx = availSubs.indexOf(subName);
    if (benchIdx >= 0) availSubs[benchIdx] = playerOut;

    // If the subbed-out player was the current server, update server pointer
    if ((teamKey === "A" && m.serverPlayerA === playerOut) ||
        (teamKey === "B" && m.serverPlayerB === playerOut)) {
        if (teamKey === "A") m.serverPlayerA = subName;
        else m.serverPlayerB = subName;
    }

    // Clear pending selection
    if (teamKey === "A") m.pendingSubA = -1; else m.pendingSubB = -1;

    // Log
    var time = new Date().toLocaleTimeString();
    var arr = (teamKey === "A") ? m.subsA : m.subsB;
    if (!arr) { arr = []; if (teamKey === "A") m.subsA = arr; else m.subsB = arr; }
    arr.push({ time: time, playerIn: subName, playerOut: playerOut, scoreA: m.scoreA, scoreB: m.scoreB, set: m.currentSet || 1 });
    var logDiv = document.getElementById("subLog_" + matchId + "_" + teamKey);
    if (logDiv) {
        var entry = document.createElement("div");
        entry.textContent = "• " + playerOut + " ⇄ " + subName + "  (Set " + (m.currentSet || 1) + "  " + m.scoreA + "–" + m.scoreB + "  " + time + ")";
        logDiv.appendChild(entry);
    }

    renderRotation(matchId, teamKey);
    updateSubUI(matchId, teamKey);
    renderServerButtons(matchId);
    updateViewerBenchUI(matchId);
    saveToFirebase();
}


function updateViewerBenchUI(matchId) {
    var m = matchData[matchId]; if (!m) return;
    ensureActivePlayers(matchId);

    ["A", "B"].forEach(function (teamKey) {
        var container = document.getElementById("viewerBench_" + matchId + "_" + teamKey);
        if (!container) return;
        var availSubs = (teamKey === "A") ? m.availableSubsA : m.availableSubsB;
        if (availSubs && availSubs.length) {
            container.innerHTML = availSubs.map(function (p) {
                return "<span class='viewer-bench-player'>" + escHtml(p) + "</span>";
            }).join("");
        } else {
            container.innerHTML = "<span class='viewer-bench-empty'>No bench players</span>";
        }
    });
}

// Render the substitution panel for one team (court players + bench players).
function updateSubUI(matchId, teamKey) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;
    ensureActivePlayers(matchId);

    var panelEl = document.getElementById("subPanel_" + matchId + "_" + teamKey);
    if (!panelEl) return;

    var activePlayers = (teamKey === "A") ? m.activePlayersA : m.activePlayersB;
    var availSubs = (teamKey === "A") ? m.availableSubsA : m.availableSubsB;
    var pendingIdx = (teamKey === "A") ? m.pendingSubA : m.pendingSubB;

    var hasPending = (pendingIdx >= 0);
    var hint = hasPending
        ? "<div class='sub-hint active-hint'>✅ " + escHtml(activePlayers[pendingIdx]) + " selected — now tap a bench player to sub in</div>"
        : "<div class='sub-hint'>Tap a court player to select who comes off</div>";

    var courtHtml = "<div style='margin-bottom:2px;font-size:0.68rem;color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.05em;'>On Court</div>";
    activePlayers.forEach(function (p, idx) {
        var sel = (idx === pendingIdx) ? " sub-out-selected" : "";
        courtHtml += "<span class='sub-court-player" + sel + "' onclick=\"selectSubOut('" + matchId + "','" + teamKey + "'," + idx + ")\">" + escHtml(p) + "</span>";
    });

    var benchHtml = "<div style='margin:6px 0 2px;font-size:0.68rem;color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:.05em;'>Bench</div>";
    if (availSubs && availSubs.length) {
        availSubs.forEach(function (p) {
            var inactive = hasPending ? "" : " inactive";
            benchHtml += "<span class='sub-bench-player" + inactive + "' onclick=\"substitutePlayer('" + matchId + "','" + teamKey + "','" + escJs(p) + "')\">" + escHtml(p) + "</span>";
        });
    } else {
        benchHtml += "<span style='font-size:0.68rem;color:var(--text-dim);'>No bench players</span>";
    }

    panelEl.innerHTML = hint + courtHtml + benchHtml;
}
