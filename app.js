const plank = document.getElementById("plank");
const previewBall = document.getElementById("preview-ball");
const objectsContainer = document.getElementById("objects-container");

const leftWeightDisplay = document.getElementById("left-weight-display");
const rightWeightDisplay = document.getElementById("right-weight-display");
const nextWeightDisplay = document.getElementById("next-weight-display");
const tiltAngleDisplay = document.getElementById("tilt-angle-display");
const logArea = document.getElementById("log-area");
const resetBtn = document.getElementById("reset-button");


let objects = []; // {weight, distance, el}
let upcomingWeight = randomWeight();


const MAX_ANGLE = 30; // degree limit
const PLANK_WIDTH = 400;

nextWeightDisplay.textContent = upcomingWeight + " kg";
updatePreviewBall();

function randomWeight() {
    return Math.floor(Math.random() * 10) + 1;
}


function ballSize(weight) {
    return 20 + weight * 4;
}

function ballColor(weight) {
    if (weight <= 3) return "#4caf50";
    if (weight <= 6) return "#ff9800";
    return "#e53935";
}

function updatePreviewBall() {
    previewBall.textContent = upcomingWeight + "kg";
    previewBall.style.width = ballSize(upcomingWeight) + "px";
    previewBall.style.height = ballSize(upcomingWeight) + "px";
    previewBall.style.background = ballColor(upcomingWeight);
}

function writeLog(weight, d) {
    const div = document.createElement("div");
    div.textContent =
        `${weight}kg dropped on ${d < 0 ? "← LEFT" : "RIGHT →"} | ${Math.abs(d).toFixed(0)}px`;
    logArea.prepend(div);
}