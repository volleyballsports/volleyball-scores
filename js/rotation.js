// =========================================================
// ROTATION MANAGEMENT
// =========================================================

var touchDragOverElement = null;
var tapSwapState = null; // { matchId, teamKey, courtPos } — first cell of a tap-to-swap
var courtSwapped = {}; // matchId -> bool: whether Team B is displayed on top

function swapCourtView(matchId) {
    courtSwapped[matchId] = !courtSwapped[matchId];
    var swapped = courtSwapped[matchId];

    var halfA = document.getElementById('courtHalfA_' + matchId);
    var halfB = document.getElementById('courtHalfB_' + matchId);
    var netEl = document.getElementById('courtNet_' + matchId);
    if (!halfA || !halfB || !netEl) return;
    var courtView = netEl.parentElement;

    // Remove both halves, then re-insert in the desired order around the net
    courtView.removeChild(halfA);
    courtView.removeChild(halfB);

    if (swapped) {
        // B on top (before net), A on bottom (after net)
        courtView.insertBefore(halfB, netEl);
        courtView.insertBefore(halfA, netEl.nextSibling);
        halfB.classList.remove('court-bottom'); halfB.classList.add('court-top');
        halfA.classList.remove('court-top');    halfA.classList.add('court-bottom');
    } else {
        // A on top (before net), B on bottom (after net)
        courtView.insertBefore(halfA, netEl);
        courtView.insertBefore(halfB, netEl.nextSibling);
        halfA.classList.remove('court-bottom'); halfA.classList.add('court-top');
        halfB.classList.remove('court-top');    halfB.classList.add('court-bottom');
    }
}

function renderRotation(matchId, teamKey) {
    var m = matchData[matchId]; if (!m) return;
    var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
    // Use active (possibly substituted) roster if available
    var players = (teamKey === "A" ? m.activePlayersA : m.activePlayersB)
        || teams[(teamKey === "A") ? m.team1Index : m.team2Index].players || [];

    function slotLabel(posNum) {
        var name = players[posNum - 1] || ("P" + posNum);
        return posNum + ": " + name;
    }

    var containerId = "rotCourt_" + matchId + "_" + teamKey;
    var container = document.getElementById(containerId);
    if (!container) return;

    // pos1–pos6: the player slot number currently occupying each court position
    // Court layout (viewed from server/rear side, net at top):
    //   Front row (net): [2-left] [3-mid] [4-right]
    //   Rear  row (svc): [1-left] [6-mid] [5-right]
    var pos1 = rot[0], pos2 = rot[1], pos3 = rot[2];
    var pos4 = rot[3], pos5 = rot[4], pos6 = rot[5];

    // Find which court position holds the selected server player
    var serverPlayer = (teamKey === "A") ? m.serverPlayerA : m.serverPlayerB;
    var serverCourtPos = null;
    if (serverPlayer) {
        for (var si = 0; si < 6; si++) {
            if (players[rot[si] - 1] === serverPlayer) {
                serverCourtPos = si + 1;
                break;
            }
        }
    }

    function posCell(courtPos, label, isServerSlot) {
        var isSelected = tapSwapState
            && tapSwapState.matchId === matchId
            && tapSwapState.teamKey === teamKey
            && tapSwapState.courtPos === courtPos;
        var classes = "rot-pos"
            + (isServerSlot ? " server-slot" : "")
            + (isScorer ? " draggable" : "")
            + (isSelected ? " tap-selected" : "");
        if (!isScorer) return "<div class='" + classes + "'>" + label + "</div>";
        // data attributes used by touch handlers; onclick handles tap-to-swap on both mobile and desktop
        return "<div class='" + classes + "'" +
            " data-match-id='" + matchId + "'" +
            " data-team-key='" + teamKey + "'" +
            " data-court-pos='" + courtPos + "'" +
            " draggable='true'" +
            " ondragstart=\"onRotationDragStart(event,'" + matchId + "','" + teamKey + "'," + courtPos + ")\"" +
            " ondragover='onRotationDragOver(event)'" +
            " ondragleave='onRotationDragLeave(event)'" +
            " ondrop=\"onRotationDrop(event,'" + matchId + "','" + teamKey + "'," + courtPos + ")\"" +
            " onclick=\"onRotationCellClick('" + matchId + "','" + teamKey + "'," + courtPos + ")\">" +
            label + "</div>";
    }

    container.innerHTML =
        "<div class='rot-row'>" +
        "  " + posCell(2, slotLabel(pos2), serverCourtPos === 2) +
        "  " + posCell(3, slotLabel(pos3), serverCourtPos === 3) +
        "  " + posCell(4, slotLabel(pos4), serverCourtPos === 4) +
        "</div>" +
        "<div class='rot-row'>" +
        "  " + posCell(1, slotLabel(pos1), serverCourtPos === 1) +
        "  " + posCell(6, slotLabel(pos6), serverCourtPos === 6) +
        "  " + posCell(5, slotLabel(pos5), serverCourtPos === 5) +
        "</div>";

    // Attach touch listeners after rendering.
    // passive:false on touchmove/touchend so preventDefault() can block scroll and suppress click.
    if (isScorer) {
        var cells = container.querySelectorAll('.rot-pos');
        for (var i = 0; i < cells.length; i++) {
            cells[i].addEventListener('touchstart', onRotationTouchStart, { passive: true });
            cells[i].addEventListener('touchmove', onRotationTouchMove, { passive: false });
            cells[i].addEventListener('touchend', onRotationTouchEnd, { passive: false });
        }
    }
}

// ---- Tap-to-swap (click — works on both desktop and mobile taps) ----

function onRotationCellClick(matchId, teamKey, courtPos) {
    if (!isScorer) return;

    if (!tapSwapState) {
        // First tap: select this cell
        tapSwapState = { matchId: matchId, teamKey: teamKey, courtPos: courtPos };
        renderRotation(matchId, teamKey);
        return;
    }

    if (tapSwapState.matchId === matchId && tapSwapState.teamKey === teamKey) {
        var fromPos = tapSwapState.courtPos;
        tapSwapState = null;
        if (fromPos === courtPos) {
            // Tapped same cell again: deselect
            renderRotation(matchId, teamKey);
            return;
        }
        // Second tap on different cell: swap
        var m = matchData[matchId]; if (!m) return;
        var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
        var temp = rot[fromPos - 1];
        rot[fromPos - 1] = rot[courtPos - 1];
        rot[courtPos - 1] = temp;
        if (teamKey === "A") m.rotationA = rot; else m.rotationB = rot;
        renderRotation(matchId, teamKey);
        saveToFirebase();
    } else {
        // Tapped a cell from a different team/match: move selection there
        var prevMatchId = tapSwapState.matchId, prevTeamKey = tapSwapState.teamKey;
        tapSwapState = { matchId: matchId, teamKey: teamKey, courtPos: courtPos };
        renderRotation(prevMatchId, prevTeamKey); // re-render old to clear highlight
        renderRotation(matchId, teamKey);
    }
}

// ---- Mouse drag-and-drop (desktop) ----

function onRotationDragStart(event, matchId, teamKey, courtPos) {
    if (!isScorer) return;
    rotationDragState = { matchId: matchId, teamKey: teamKey, courtPos: courtPos };
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function onRotationDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
}

function onRotationDragLeave(event) {
    event.currentTarget.classList.remove("drag-over");
}

function onRotationDrop(event, matchId, teamKey, targetPos) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");
    if (!isScorer || !rotationDragState) return;
    if (rotationDragState.matchId !== matchId || rotationDragState.teamKey !== teamKey) return;
    var fromPos = rotationDragState.courtPos;
    rotationDragState = null;
    if (fromPos === targetPos) return;
    var m = matchData[matchId]; if (!m) return;
    var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
    var temp = rot[fromPos - 1];
    rot[fromPos - 1] = rot[targetPos - 1];
    rot[targetPos - 1] = temp;
    if (teamKey === "A") m.rotationA = rot; else m.rotationB = rot;
    renderRotation(matchId, teamKey);
    saveToFirebase();
}

// ---- Touch drag-and-drop (mobile) ----

function onRotationTouchStart(event) {
    if (!isScorer) return;
    var el = event.currentTarget;
    rotationDragState = {
        matchId: el.getAttribute('data-match-id'),
        teamKey: el.getAttribute('data-team-key'),
        courtPos: parseInt(el.getAttribute('data-court-pos'), 10)
    };
}

function onRotationTouchMove(event) {
    if (!rotationDragState) return;
    event.preventDefault(); // block page scroll while dragging
    var touch = event.touches[0];
    var el = document.elementFromPoint(touch.clientX, touch.clientY);

    if (touchDragOverElement && touchDragOverElement !== el) {
        touchDragOverElement.classList.remove('drag-over');
    }

    if (el && el.classList && el.classList.contains('rot-pos')) {
        el.classList.add('drag-over');
        touchDragOverElement = el;
    } else {
        touchDragOverElement = null;
    }
}

function onRotationTouchEnd(event) {
    if (!isScorer || !rotationDragState) return;

    if (touchDragOverElement) {
        touchDragOverElement.classList.remove('drag-over');
        touchDragOverElement = null;
    }

    var touch = event.changedTouches[0];
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el || !el.classList || !el.classList.contains('rot-pos')) {
        rotationDragState = null;
        return;
    }

    var targetMatchId = el.getAttribute('data-match-id');
    var targetTeamKey = el.getAttribute('data-team-key');
    var targetPos = parseInt(el.getAttribute('data-court-pos'), 10);

    if (targetMatchId !== rotationDragState.matchId || targetTeamKey !== rotationDragState.teamKey) {
        rotationDragState = null;
        return;
    }

    var fromPos = rotationDragState.courtPos;
    rotationDragState = null;

    if (fromPos === targetPos) return; // tap not drag — let click fire for tap-to-swap

    // Actual drag swap: prevent the subsequent click event from also firing
    event.preventDefault();
    var m = matchData[targetMatchId]; if (!m) return;
    var rot = (targetTeamKey === "A") ? m.rotationA : m.rotationB;
    var temp = rot[fromPos - 1];
    rot[fromPos - 1] = rot[targetPos - 1];
    rot[targetPos - 1] = temp;
    if (targetTeamKey === "A") m.rotationA = rot; else m.rotationB = rot;
    renderRotation(targetMatchId, targetTeamKey);
    saveToFirebase();
}

// ---- Manual rotation buttons ----

function manualRotate(matchId, teamKey) {
    if (!isScorer) return;
    var m = matchData[matchId]; if (!m) return;
    var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
    rot = rotateArray(rot);
    if (teamKey === "A") m.rotationA = rot; else m.rotationB = rot;

    // NOTE: Do NOT change m.serverTeam here — manual rotation is only for
    // arranging player positions, not for declaring who's serving.
    // Only setServer() and side-out logic in changeScore() change serverTeam.

    renderRotation(matchId, teamKey);
    highlightServerButton(matchId);
    saveToFirebase();
}

// Internal rotate that doesn't trigger a separate save
function manualRotateInternal(matchId, teamKey) {
    var m = matchData[matchId]; if (!m) return;
    var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
    rot = rotateArray(rot);
    if (teamKey === "A") m.rotationA = rot; else m.rotationB = rot;

    var players = (teamKey === "A")
        ? (m.activePlayersA || teams[m.team1Index].players || [])
        : (m.activePlayersB || teams[m.team2Index].players || []);
    var pos1Num = rot[0];
    var newServerPlayer = players[pos1Num - 1] || null;
    m.serverTeam = teamKey;
    if (teamKey === "A") m.serverPlayerA = newServerPlayer;
    else m.serverPlayerB = newServerPlayer;

    renderRotation(matchId, teamKey);
    highlightServerButton(matchId);
}
