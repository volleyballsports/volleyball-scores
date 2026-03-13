// =========================================================
// ROTATION MANAGEMENT
// =========================================================

var touchDragOverElement = null;
var tapSwapState = null; // { matchId, teamKey, courtPos } — first cell of a tap-to-swap
var courtSwapped = {}; // matchId -> bool: whether Team B is displayed on top

// Apply a specific swap state to the DOM without toggling the flag.
// Called both by swapCourtView (user action) and after any card rebuild.
function applyCourtSwap(matchId, swapped) {
    var halfA = document.getElementById('courtHalfA_' + matchId);
    var halfB = document.getElementById('courtHalfB_' + matchId);
    var netEl = document.getElementById('courtNet_' + matchId);
    if (!halfA || !halfB || !netEl) return;
    var courtView = netEl.parentElement; // .court-main
    var outerCourtView = courtView.parentElement; // .court-view

    courtView.removeChild(halfA);
    courtView.removeChild(halfB);

    if (swapped) {
        // B on left (before net), A on right (after net)
        courtView.insertBefore(halfB, netEl);
        courtView.insertBefore(halfA, netEl.nextSibling);
        halfB.classList.remove('court-right'); halfB.classList.add('court-left');
        halfA.classList.remove('court-left');  halfA.classList.add('court-right');
    } else {
        // A on left (before net), B on right (after net)
        courtView.insertBefore(halfA, netEl);
        courtView.insertBefore(halfB, netEl.nextSibling);
        halfA.classList.remove('court-right'); halfA.classList.add('court-left');
        halfB.classList.remove('court-left');  halfB.classList.add('court-right');
    }

    // Swap team header labels to match court side
    var teamHeader = outerCourtView.querySelector('.court-team-header');
    if (teamHeader && teamHeader.children.length === 2) {
        var headerChildren = [teamHeader.children[0], teamHeader.children[1]];
        teamHeader.removeChild(headerChildren[0]);
        teamHeader.removeChild(headerChildren[1]);
        if (swapped) {
            teamHeader.appendChild(headerChildren[1]);
            teamHeader.appendChild(headerChildren[0]);
        } else {
            teamHeader.appendChild(headerChildren[0]);
            teamHeader.appendChild(headerChildren[1]);
        }
    }

    // Swap score values and +/- buttons to match court side
    var scoreStrip = outerCourtView.querySelector('.court-score-strip');
    var scoreElemA = document.getElementById('score_' + matchId + '_A');
    var scoreElemB = document.getElementById('score_' + matchId + '_B');
    if (scoreStrip && scoreElemA && scoreElemB) {
        var scoreTeamA = scoreElemA.parentElement;
        var scoreTeamB = scoreElemB.parentElement;
        var setIndicator = scoreStrip.querySelector('.court-score-set');
        scoreStrip.removeChild(scoreTeamA);
        scoreStrip.removeChild(scoreTeamB);
        if (swapped) {
            if (setIndicator) {
                scoreStrip.insertBefore(scoreTeamB, setIndicator);
            } else {
                scoreStrip.insertBefore(scoreTeamB, scoreStrip.firstChild);
            }
            scoreStrip.appendChild(scoreTeamA);
        } else {
            if (setIndicator) {
                scoreStrip.insertBefore(scoreTeamA, setIndicator);
            } else {
                scoreStrip.insertBefore(scoreTeamA, scoreStrip.firstChild);
            }
            scoreStrip.appendChild(scoreTeamB);
        }
    }

    renderRotation(matchId, 'A');
    renderRotation(matchId, 'B');
}

function swapCourtView(matchId) {
    courtSwapped[matchId] = !courtSwapped[matchId];
    applyCourtSwap(matchId, courtSwapped[matchId]);
}

// Restore the court swap state after a card rebuild (e.g. triggered by Firebase sync).
function restoreCourtSwap(matchId) {
    if (courtSwapped[matchId]) applyCourtSwap(matchId, true);
}

function renderRotation(matchId, teamKey) {
    var m = matchData[matchId]; if (!m) return;
    var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
    // Use active (possibly substituted) roster if available
    var players = (teamKey === "A" ? m.activePlayersA : m.activePlayersB)
        || teams[(teamKey === "A") ? m.team1Index : m.team2Index].players || [];

    function slotLabel(posNum) {
        var name = players[posNum - 1] || ("P" + posNum);
        return name;
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
        var canRearrange = isScorer && positionRotationEnabled;
        var canPickServerFromCourt = isScorer && !positionRotationEnabled;
        var courtPlayer = slotLabel(courtPos === 1 ? pos1 : courtPos === 2 ? pos2 : courtPos === 3 ? pos3 : courtPos === 4 ? pos4 : courtPos === 5 ? pos5 : pos6);
        var isSelected = tapSwapState
            && tapSwapState.matchId === matchId
            && tapSwapState.teamKey === teamKey
            && tapSwapState.courtPos === courtPos;
        var isValidServerCandidate = canPickServerFromCourt && !isServerSlot && isServerSelectionAllowed(m, teamKey, courtPlayer);
        var classes = "rot-pos"
            + (isServerSlot ? " server-slot" : "")
            + (canRearrange ? " draggable" : "")
            + (canPickServerFromCourt ? " server-selectable" : "")
            + (isValidServerCandidate ? " next-server-candidate" : "")
            + (isSelected ? " tap-selected" : "");
        if (!isScorer) return "<div class='" + classes + "'>" + label + "</div>";
        if (!canRearrange && canPickServerFromCourt) {
            return "<div class='" + classes + "'" +
                " onclick=\"setServer('" + matchId + "','" + teamKey + "','" + escJs(courtPlayer) + "')\">" +
                label + "</div>";
        }
        if (!canRearrange) return "<div class='" + classes + "'>" + label + "</div>";
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

    // Vertical layout: 3 rows × 2 cols.
    // Left half:  [back | front] — positions 1,6,5 on left;  2,3,4 on right (nearest net).
    // Right half: [front | back] — positions 2,3,4 on left (nearest net); 1,6,5 on right.
    var halfEl = document.getElementById('courtHalf' + teamKey + '_' + matchId);
    var isRight = halfEl && halfEl.classList.contains('court-right');

    function rotRow(left, right) {
        return "<div class='rot-row'>" +
            posCell(left,  slotLabel(left  === 1 ? pos1 : left  === 2 ? pos2 : left  === 3 ? pos3 : left  === 4 ? pos4 : left  === 5 ? pos5 : pos6), serverCourtPos === left) +
            posCell(right, slotLabel(right === 1 ? pos1 : right === 2 ? pos2 : right === 3 ? pos3 : right === 4 ? pos4 : right === 5 ? pos5 : pos6), serverCourtPos === right) +
            "</div>";
    }

    if (isRight) {
        // Mirrored: front row (2,3,4) on the left side, back row (1,6,5) on the right
        container.innerHTML = rotRow(4, 5) + rotRow(3, 6) + rotRow(2, 1);
    } else {
        // Normal: back row (1,6,5) on the left side, front row (2,3,4) on the right
        container.innerHTML = rotRow(1, 2) + rotRow(6, 3) + rotRow(5, 4);
    }

    updateServerWarnings(matchId);

    // Attach touch listeners after rendering.
    // passive:false on touchmove/touchend so preventDefault() can block scroll and suppress click.
    if (isScorer && positionRotationEnabled) {
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
    if (!isScorer || !positionRotationEnabled) return;

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
    if (!isScorer || !positionRotationEnabled) return;
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
    if (!isScorer || !positionRotationEnabled || !rotationDragState) return;
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
    if (!isScorer || !positionRotationEnabled) return;
    var el = event.currentTarget;
    rotationDragState = {
        matchId: el.getAttribute('data-match-id'),
        teamKey: el.getAttribute('data-team-key'),
        courtPos: parseInt(el.getAttribute('data-court-pos'), 10)
    };
}

function onRotationTouchMove(event) {
    if (!positionRotationEnabled || !rotationDragState) return;
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
    if (!isScorer || !positionRotationEnabled || !rotationDragState) return;

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
    if (!isScorer || !positionRotationEnabled) return;
    var m = matchData[matchId]; if (!m) return;
    rotateTeamPositionsInternal(matchId, teamKey);

    // NOTE: Do NOT change m.serverTeam here — manual rotation is only for
    // arranging player positions, not for declaring who's serving.
    // Only setServer() and side-out logic in changeScore() change serverTeam.

    renderRotation(matchId, teamKey);
    highlightServerButton(matchId);
    updateServerWarnings(matchId);
    saveToFirebase();
}

// Internal rotate that doesn't trigger a separate save
function rotateTeamPositionsInternal(matchId, teamKey) {
    var m = matchData[matchId]; if (!m) return;
    var rot = (teamKey === "A") ? m.rotationA : m.rotationB;
    rot = rotateArray(rot);
    if (teamKey === "A") m.rotationA = rot; else m.rotationB = rot;

    renderRotation(matchId, teamKey);
}
