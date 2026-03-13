// =========================================================
// FIREBASE INIT & SYNC
// =========================================================
var app, db, dbRef;
var firebaseReady = false;
var pendingWrite = false;
var lastWriteAckAt = 0;
var writeErrorState = false;

try {
    app = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    dbRef = db.ref("tournament");
    firebaseReady = true;
} catch (e) {
    console.warn("Firebase init failed. Running in offline/demo mode.", e);
}

function setConnectionLabel(text, connectedClass) {
    var statusEl = document.getElementById("connectionStatus");
    var labelEl = document.getElementById("connectionLabel");
    if (!statusEl || !labelEl) return;
    statusEl.className = "connection-status " + connectedClass;
    labelEl.textContent = text;
}

function saveToFirebase() {
    if (!firebaseReady || !isScorer) return;
    localUpdate = true;
    var state = {
        teams: teams,
        schedule: schedule,
        matchData: matchData,
        positionRotationEnabled: positionRotationEnabled,
        serverRotationEnabled: serverRotationEnabled,
        activeMatchId: activeMatchId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    var safeState = JSON.parse(JSON.stringify(state));
    pendingWrite = true;
    writeErrorState = false;
    if (isScorer) setConnectionLabel("Syncing…", "connected");
    try {
        dbRef.set(safeState).then(function () {
            lastWriteAckAt = Date.now();
            pendingWrite = false;
            writeErrorState = false;
            if (isScorer) setConnectionLabel("Synced", "connected");
            setTimeout(function () { localUpdate = false; }, 500);
        }).catch(function (err) {
            console.error("Firebase write error:", err);
            pendingWrite = false;
            writeErrorState = true;
            if (isScorer) setConnectionLabel("Sync issue", "disconnected");
            localUpdate = false;
        });
    } catch (err) {
        console.error("Firebase write error:", err);
        pendingWrite = false;
        writeErrorState = true;
        if (isScorer) setConnectionLabel("Sync issue", "disconnected");
        localUpdate = false;
    }
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
            if (isScorer) {
                if (writeErrorState) setConnectionLabel("Sync issue", "disconnected");
                else if (pendingWrite) setConnectionLabel("Syncing…", "connected");
                else setConnectionLabel("Synced", "connected");
            } else {
                setConnectionLabel("Live", "connected");
            }
        } else {
            setConnectionLabel("Offline", "disconnected");
        }
    });

    setInterval(function () {
        if (!isScorer || !firebaseReady) return;
        if (writeErrorState) return;
        if (!pendingWrite && lastWriteAckAt && (Date.now() - lastWriteAckAt > 15000)) {
            setConnectionLabel("No recent sync", "disconnected");
        }
    }, 5000);
}

function applyState(data) {
    if (data.teams) teams = data.teams;
    if (data.schedule) schedule = data.schedule;
    if (data.matchData) matchData = data.matchData;
    if (data.positionRotationEnabled !== undefined) positionRotationEnabled = data.positionRotationEnabled;
    else if (data.autoRotate !== undefined) positionRotationEnabled = data.autoRotate;
    if (data.serverRotationEnabled !== undefined) serverRotationEnabled = data.serverRotationEnabled;
    if (data.activeMatchId !== undefined) activeMatchId = data.activeMatchId;

    renderTeamSetup();
    rebuildAllMatchUI();
}
