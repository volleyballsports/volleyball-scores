// =========================================================
// TEAM SETUP FORM
// =========================================================

function renderTeamSetup() {
    var container = document.getElementById("teamSetup");
    if (!container) return;
    container.innerHTML = "";

    teams.forEach(function (t, i) {
        var html =
            "<div class='form-card'>" +
            "  <strong>Team " + (i + 1) + "</strong>" +
            "  <span class='form-label'>Team Name</span>" +
            "  <input type='text' id='teamName_" + i + "' value='" + escHtml(t.name) + "' />" +
            "  <span class='form-label'>Logo URL</span>" +
            "  <input type='text' id='logo_" + i + "' value='" + escHtml(t.logo || '') + "' />" +
            "  <span class='form-label'>Court Players (6, comma sep.)</span>" +
            "  <input type='text' id='players_" + i + "' value='" + escHtml((t.players || []).join(",")) + "' />" +
            "  <span class='form-label'>Subs (comma sep.)</span>" +
            "  <input type='text' id='subs_" + i + "' value='" + escHtml((t.subs || []).join(",")) + "' />" +
            "</div>";
        container.insertAdjacentHTML("beforeend", html);
    });

    var positionRotationToggle = document.getElementById("positionRotationToggle");
    if (positionRotationToggle) positionRotationToggle.checked = !!positionRotationEnabled;
    var serverRotationToggle = document.getElementById("serverRotationToggle");
    if (serverRotationToggle) serverRotationToggle.checked = !!serverRotationEnabled;
}
