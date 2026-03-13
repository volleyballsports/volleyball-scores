// =========================================================
// GLOBAL STATE
// =========================================================
var teams = [
    { name: "Team A", logo: "", players: ["A1", "A2", "A3", "A4", "A5", "A6"], subs: ["A7", "A8", "A9"] },
    { name: "Team B", logo: "", players: ["B1", "B2", "B3", "B4", "B5", "B6"], subs: ["B7", "B8", "B9"] },
    { name: "Team C", logo: "", players: ["C1", "C2", "C3", "C4", "C5", "C6"], subs: ["C7", "C8", "C9"] },
    { name: "Team D", logo: "", players: ["D1", "D2", "D3", "D4", "D5", "D6"], subs: ["D7", "D8", "D9"] }
];

var schedule = [];
var matchData = {};
var positionRotationEnabled = true;
var serverRotationEnabled = false;
var activeMatchId = null;  // which match is currently being played (set by scorer)
var isScorer = false;
var localUpdate = false;   // flag to skip listener re-renders during local writes
var rotationDragState = null;
