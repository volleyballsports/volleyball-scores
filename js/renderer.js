// =========================================================
// MATCH CARD HTML GENERATION
// =========================================================

// Build a compact summary card for a non-active match
function buildMatchSummaryHTML(matchId, t1Index, t2Index, isFinal) {
    var t1 = teams[t1Index] || { name: "?" }, t2 = teams[t2Index] || { name: "?" };
    var m = matchData[matchId] || {};
    var num = isFinal ? "Final" : "Match " + (parseInt(matchId.replace(LEAGUE_PREFIX, ""), 10) + 1);
    var title = num + ": " + escHtml(t1.name) + " vs " + escHtml(t2.name);
    var sA = m.scoreA || 0, sB = m.scoreB || 0;
    var swA = m.setsWonA || 0, swB = m.setsWonB || 0;
    var curSet = m.currentSet || 1;
    var statusText;
    var summaryClass = "in-progress";
    if (m.matchComplete) {
        var winner = swA > swB ? escHtml(t1.name) : escHtml(t2.name);
        statusText = winner + " won " + swA + "–" + swB + " in sets";
        summaryClass = "complete";
    } else if (sA + sB > 0 || swA + swB > 0) {
        statusText = "Set " + curSet + " in progress";
    } else {
        statusText = "Not started";
        summaryClass = "not-started";
    }

    var playedSets = (m.sets || []).slice();
    if (!m.matchComplete && (sA + sB > 0)) {
        playedSets.push({ scoreA: sA, scoreB: sB, inProgress: true });
    }
    var allSetScores = playedSets.length
        ? playedSets.map(function (set, i) {
            var setLabel = "S" + (i + 1) + ": " + set.scoreA + "–" + set.scoreB;
            return "<span class='compact-set-chip" + (set.inProgress ? " active" : "") + "'>" + setLabel + "</span>";
        }).join("")
        : "<span class='compact-set-chip empty'>No set scores yet</span>";

    return (
        "<div class='compact-match-card " + summaryClass + "'>" +
        "  <div class='compact-match-info'>" +
        "    <div class='compact-match-title'>" + title + "</div>" +
        "    <div class='compact-teams'>" +
        "      <div class='compact-team-row'>" +
        "        <span class='compact-team-name'>" + escHtml(t1.name) + "</span>" +
        "      </div>" +
        "      <div class='compact-team-row'>" +
        "        <span class='compact-team-name'>" + escHtml(t2.name) + "</span>" +
        "      </div>" +
        "    </div>" +
        "    <div class='compact-set-history'>" + allSetScores + "</div>" +
        "    <div class='compact-status'>" + statusText + "</div>" +
        "  </div>" +
        "  <div class='compact-sets'>Sets " + swA + "–" + swB + "</div>" +
        "</div>"
    );
}

function buildMatchCardHTML(matchId, t1Index, t2Index, isFinal) {
    var t1 = teams[t1Index], t2 = teams[t2Index];

    var title = isFinal ?
        "Final: " + escHtml(t1.name) + " vs " + escHtml(t2.name) :
        "Match " + (parseInt(matchId.replace(LEAGUE_PREFIX, ""), 10) + 1) + ": " + escHtml(t1.name) + " vs " + escHtml(t2.name);

    var disabledAttr = isScorer ? "" : " disabled";

    return (
        "<div class='card' id='card_" + matchId + "'>" +
        "  <div class='match-header'>" +
        "    <span class='match-title'>" + title + "</span>" +
        "  </div>" +

        // Match complete banner
        "  <div id='matchBanner_" + matchId + "' class='match-complete-banner'></div>" +

        // Sets score bar
        "  <div class='sets-bar'>" +
        "    <span class='sets-label'>Sets (Best of 3)</span>" +
        "    <div class='sets-score'>" +
        "      <span id='setsWonA_" + matchId + "' class='set-num'>0</span>" +
        "      <span class='set-sep'>–</span>" +
        "      <span id='setsWonB_" + matchId + "' class='set-num'>0</span>" +
        "    </div>" +
        "    <div id='setHistory_" + matchId + "' class='set-history'></div>" +
        "  </div>" +

        // Team A row
        "  <div class='team-row'>" +
        "    <div class='team-left'>" +
        (t1.logo ? "      <div class='team-logo' style=\"background-image:url('" + escHtml(t1.logo) + "')\"></div>" : "") +
        "      <span class='team-name'>" + escHtml(t1.name) + "</span>" +
        "    </div>" +
        "    <div class='score-panel'>" +
        "      <button class='score-btn minus scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','A',-1)\">−</button>" +
        "      <span id='score_" + matchId + "_A' class='score-value'>0</span>" +
        "      <button class='score-btn scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','A',1)\">+</button>" +
        "    </div>" +
        "  </div>" +

        // Team B row
        "  <div class='team-row'>" +
        "    <div class='team-left'>" +
        (t2.logo ? "      <div class='team-logo' style=\"background-image:url('" + escHtml(t2.logo) + "')\"></div>" : "") +
        "      <span class='team-name'>" + escHtml(t2.name) + "</span>" +
        "    </div>" +
        "    <div class='score-panel'>" +
        "      <button class='score-btn minus scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','B',-1)\">−</button>" +
        "      <span id='score_" + matchId + "_B' class='score-value'>0</span>" +
        "      <button class='score-btn scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','B',1)\">+</button>" +
        "    </div>" +
        "  </div>" +

        // Current set indicator
        "  <div style='text-align:center;margin:4px 0 8px;font-size:0.72rem;color:var(--text-dim);font-family:var(--mono);'>" +
        "    <span id='setIndicator_" + matchId + "'>Set 1 · First to 15 (2-point lead)</span>" +
        "  </div>" +

        // Rotations
        "  <div class='rotation-section'>" +
        "    <div class='rotation-label'>" + escHtml(t1.name) + " Rotation</div>" +
        "    <div id='rotCourt_" + matchId + "_A' class='rotation-court'></div>" +
        "    <button class='btn-rotate scorer-only' onclick=\"manualRotate('" + matchId + "','A')\">↻ Rotate</button>" +
        "    <button class='btn-rotate scorer-only' onclick=\"undoLastPoint('" + matchId + "','A')\">↺ Undo " + escHtml(t1.name) + " Point</button>" +
        "  </div>" +
        "  <div class='rotation-section'>" +
        "    <div class='rotation-label'>" + escHtml(t2.name) + " Rotation</div>" +
        "    <div id='rotCourt_" + matchId + "_B' class='rotation-court'></div>" +
        "    <button class='btn-rotate scorer-only' onclick=\"manualRotate('" + matchId + "','B')\">↻ Rotate</button>" +
        "    <button class='btn-rotate scorer-only' onclick=\"undoLastPoint('" + matchId + "','B')\">↺ Undo " + escHtml(t2.name) + " Point</button>" +
        "  </div>" +

        // Server selection (scorer only)
        "  <div class='scorer-only mt-16'>" +
        "    <div class='section-title'>Choose Server</div>" +
        "    <div class='mt-6'><strong style='font-size:0.8rem;'>" + escHtml(t1.name) + ":</strong><br/><span id='srvContainer_" + matchId + "_A'></span></div>" +
        "    <div class='mt-6'><strong style='font-size:0.8rem;'>" + escHtml(t2.name) + ":</strong><br/><span id='srvContainer_" + matchId + "_B'></span></div>" +
        "  </div>" +

        // Substitutions
        "  <div class='mt-16 scorer-only'>" +
        "    <div class='section-title'>" + escHtml(t1.name) + " Substitution</div>" +
        "    <div id='subPanel_" + matchId + "_A'></div>" +
        "    <div id='subLog_" + matchId + "_A' class='sub-log mt-6'></div>" +
        "  </div>" +
        "  <div class='mt-10 scorer-only'>" +
        "    <div class='section-title'>" + escHtml(t2.name) + " Substitution</div>" +
        "    <div id='subPanel_" + matchId + "_B'></div>" +
        "    <div id='subLog_" + matchId + "_B' class='sub-log mt-6'></div>" +
        "  </div>" +

        // Service log
        "  <div class='mt-16'>" +
        "    <div class='section-title'>Service & Point Log</div>" +
        "    <div id='serviceLogTable_" + matchId + "' class='service-log-view mt-6'></div>" +
        "    <button class='btn-small mt-6' onclick=\"downloadServiceLog('" + matchId + "')\">↓ Download CSV</button>" +
        "  </div>" +
        "</div>"
    );
}
