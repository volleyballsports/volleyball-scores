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

    var t1Won = m.matchComplete && swA > swB;
    var t2Won = m.matchComplete && swB > swA;

    return (
        "<div class='compact-match-card " + summaryClass + "'>" +
        "  <div class='compact-match-info'>" +
        "    <div class='compact-match-title'>" + title + "</div>" +
        "    <div class='compact-teams'>" +
        "      <div class='compact-team-row'>" +
        "        <span class='compact-team-name'" + (t1Won ? " data-winner='1'" : "") + ">" + escHtml(t1.name) + "</span>" +
        "      </div>" +
        "      <div class='compact-team-row'>" +
        "        <span class='compact-team-name'" + (t2Won ? " data-winner='1'" : "") + ">" + escHtml(t2.name) + "</span>" +
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

        // Combined court view: horizontal layout — Team A on LEFT, vertical NET, Team B on RIGHT
        "  <div class='court-view'>" +
        "    <div class='court-main'>" +

        // LEFT: Team A
        "      <div class='court-half court-left' id='courtHalfA_" + matchId + "'>" +
        "        <div class='court-half-inner'>" +
        "          <div class='court-team-side'>" + escHtml(t1.name) + "</div>" +
        "          <div class='court-half-grid'>" +
        "            <div id='rotCourt_" + matchId + "_A' class='rotation-court'></div>" +
        "            <div class='court-half-btns scorer-only'>" +
        "              <button class='btn-rotate' onclick=\"manualRotate('" + matchId + "','A')\">↻ Rotate</button>" +
        "              <button class='btn-rotate' onclick=\"undoLastPoint('" + matchId + "','A')\">↺ Undo " + escHtml(t1.name) + "</button>" +
        "            </div>" +
        "          </div>" +
        "          <div class='court-net-score'>" +
        "            <button class='score-btn scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','A',1)\">+</button>" +
        "            <span id='score_" + matchId + "_A' class='net-score-num'>0</span>" +
        "            <button class='score-btn minus scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','A',-1)\">−</button>" +
        "          </div>" +
        "        </div>" +
        "      </div>" +

        // VERTICAL NET — label and set indicator
        "      <div class='court-net-col' id='courtNet_" + matchId + "'>" +
        "        <span class='net-label'>NET</span>" +
        "        <span id='setIndicator_" + matchId + "' class='net-set-label'>Set 1</span>" +
        "      </div>" +

        // RIGHT: Team B
        "      <div class='court-half court-right' id='courtHalfB_" + matchId + "'>" +
        "        <div class='court-half-inner'>" +
        "          <div class='court-net-score'>" +
        "            <button class='score-btn scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','B',1)\">+</button>" +
        "            <span id='score_" + matchId + "_B' class='net-score-num'>0</span>" +
        "            <button class='score-btn minus scorer-only'" + disabledAttr + " onclick=\"changeScore('" + matchId + "','B',-1)\">−</button>" +
        "          </div>" +
        "          <div class='court-half-grid'>" +
        "            <div id='rotCourt_" + matchId + "_B' class='rotation-court'></div>" +
        "            <div class='court-half-btns scorer-only'>" +
        "              <button class='btn-rotate' onclick=\"manualRotate('" + matchId + "','B')\">↻ Rotate</button>" +
        "              <button class='btn-rotate' onclick=\"undoLastPoint('" + matchId + "','B')\">↺ Undo " + escHtml(t2.name) + "</button>" +
        "            </div>" +
        "          </div>" +
        "          <div class='court-team-side'>" + escHtml(t2.name) + "</div>" +
        "        </div>" +
        "      </div>" +

        "    </div>" + // close court-main

        // Swap button (scorer only)
        "    <div class='court-footer scorer-only'>" +
        "      <button class='court-swap-btn' onclick=\"swapCourtView('" + matchId + "')\">⇄ Swap Teams</button>" +
        "    </div>" +

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

        // Viewer bench (available substitutions)
        "  <div class='mt-16 viewer-bench-section'>" +
        "    <div class='section-title'>Available Bench</div>" +
        "    <div class='viewer-bench-grid'>" +
        "      <div class='viewer-bench-team'>" +
        "        <strong>" + escHtml(t1.name) + "</strong><div id='viewerBench_" + matchId + "_A' class='viewer-bench-list'></div>" +
        "      </div>" +
        "      <div class='viewer-bench-team'>" +
        "        <strong>" + escHtml(t2.name) + "</strong><div id='viewerBench_" + matchId + "_B' class='viewer-bench-list'></div>" +
        "      </div>" +
        "    </div>" +
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
