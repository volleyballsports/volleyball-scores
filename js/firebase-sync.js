// =========================================================
// FIREBASE INIT & SYNC
// =========================================================
var app, db, dbRef;
var firebaseReady = false;

try {
    app = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    dbRef = db.ref("tournament");
    firebaseReady = true;
} catch (e) {
    console.warn("Firebase init failed. Running in offline/demo mode.", e);
}

function saveToFirebase() {
    if (!firebaseReady || !isScorer) return;
    localUpdate = true;
    var state = {
        teams: teams,
        schedule: schedule,
        matchData: matchData,
        autoRotate: autoRotate,
        activeMatchId: activeMatchId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    dbRef.set(state).then(function () {
        setTimeout(function () { localUpdate = false; }, 2000);
    }).catch(function (err) {
        console.error("Firebase write error:", err);
        localUpdate = false;
    });
}

function loadFromFirebase() {
    if (!firebaseReady) return;

    // One-time load
    dbRef.once("value").then(function (snapshot) {
        var data = snapshot.val();
        if (data) applyState(data);
    });

    // Real-time listener
    dbRef.on("value", function (snapshot) {
        if (localUpdate) return;
        var data = snapshot.val();
        if (data) applyState(data);
    });

    // Connection monitoring
    var connRef = firebase.database().ref(".info/connected");
    connRef.on("value", function (snap) {
        var statusEl = document.getElementById("connectionStatus");
        var labelEl = document.getElementById("connectionLabel");
        if (snap.val() === true) {
            statusEl.className = "connection-status connected";
            labelEl.textContent = "Live";
        } else {
            statusEl.className = "connection-status disconnected";
            labelEl.textContent = "Offline";
        }
    });
}

function applyState(data) {
    if (data.teams) teams = data.teams;
    if (data.schedule) schedule = data.schedule;
    if (data.matchData) matchData = data.matchData;
    if (data.autoRotate !== undefined) autoRotate = data.autoRotate;
    if (data.activeMatchId !== undefined) activeMatchId = data.activeMatchId;

    renderTeamSetup();
    rebuildAllMatchUI();
}
