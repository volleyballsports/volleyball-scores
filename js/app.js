// =========================================================
// APP INITIALIZATION
// =========================================================

// Allow Enter key in password field
document.getElementById("passwordInput").addEventListener("keyup", function (e) {
    if (e.key === "Enter") attemptScorerLogin();
});

window.addEventListener("DOMContentLoaded", function () {
    initializeTheme();
    renderTeamSetup();
    showModeBanner("viewer", "👁 Viewer Mode — Live scores update automatically");
    loadFromFirebase();
});
