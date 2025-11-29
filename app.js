// DOM 

const plank = document.getElementById("plank");
const previewBall = document.getElementById("preview-ball");
const objectsContainer = document.getElementById("objects-container");
const simulationArea = document.getElementById("simulation-area");

const leftWeightDisplay = document.getElementById("left-weight-display");
const rightWeightDisplay = document.getElementById("right-weight-display");
const nextWeightDisplay = document.getElementById("next-weight-display");
const tiltAngleDisplay = document.getElementById("tilt-angle-display");
const logArea = document.getElementById("log-area");
const resetBtn = document.getElementById("reset-button");

// SETTINGS 

const MAX_ANGLE = 30;
const STORAGE_KEY = "seesaw_state_v3";
const CENTER_THRESHOLD = 5;

// STATE 

let objects = [];
let upcomingWeight = randomWeight();
let cachedPlankRect = null;
let cachedSimRect = null;
let currentPlankWidth = 0;
let lastAngle = 0;

// INIT 

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const state = JSON.parse(raw);
            if (state.upcomingWeight) upcomingWeight = state.upcomingWeight;
            if (state.lastAngle !== undefined) lastAngle = state.lastAngle;
        } catch (e) {
            console.error("Could not load local storage data:", e);
        }
    }

    nextWeightDisplay.textContent = `${upcomingWeight} kg`;
    updatePreviewBall();

    requestAnimationFrame(() => {
        plank.style.transform = `translate(-50%, -50%) rotate(${lastAngle}deg)`;
        requestAnimationFrame(() => {
            loadStateObjects();
            updatePhysics();
        });
    });
}

// HELPERS 

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
    previewBall.textContent = `${upcomingWeight}kg`;
    previewBall.style.width = ballSize(upcomingWeight) + "px";
    previewBall.style.height = ballSize(upcomingWeight) + "px";
    previewBall.style.background = ballColor(upcomingWeight);
}

// LOG 

function writeLog(weight, distance) {
    const side =
        Math.abs(distance) < CENTER_THRESHOLD
            ? "center"
            : distance < 0
                ? "left"
                : "right";

    const px = Math.abs(distance).toFixed(0);

    const div = document.createElement("div");
    div.textContent = `${weight}kg dropped on ${side} side at ${px}px from center`;
    logArea.prepend(div);
}

// STORAGE 

function saveState() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            upcomingWeight,
            lastAngle,
            objects: objects.map(o => ({
                weight: o.weight,
                distance: o.distance
            }))
        })
    );
}

function loadStateObjects() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let state;
    try {
        state = JSON.parse(raw);
    } catch (e) {
        console.error("Could not parse stored JSON:", e);
        return;
    }

    if (!state.objects || state.objects.length === 0) return;

    const rect = plank.getBoundingClientRect();
    if (rect.width === 0) {
        setTimeout(loadStateObjects, 50);
        return;
    }

    currentPlankWidth = rect.width;
    const center = rect.width / 2;

    objectsContainer.innerHTML = "";
    objects = [];

    state.objects.forEach(o => {
        let clickX = center + o.distance;
        clickX = Math.max(0, Math.min(rect.width, clickX));
        spawnObject(clickX, o.weight, o.distance);
    });
}

// CREATE OBJECT 

function spawnObject(clickX, weight, distance) {
    const ball = document.createElement("div");
    ball.className = "object";
    ball.textContent = `${weight}kg`;
    ball.style.left = clickX + "px";
    ball.style.top = "50%";
    ball.style.width = ballSize(weight) + "px";
    ball.style.height = ballSize(weight) + "px";
    ball.style.background = ballColor(weight);

    objectsContainer.appendChild(ball);

    objects.push({ weight, distance, clickX, el: ball });
}

// PREVIEW MOUSE 

plank.addEventListener("mouseenter", () => {
    cachedPlankRect = plank.getBoundingClientRect();
    cachedSimRect = simulationArea.getBoundingClientRect();
    previewBall.style.opacity = "0.45";
});

plank.addEventListener("mouseleave", () => {
    previewBall.style.opacity = "0";
    cachedPlankRect = null;
    cachedSimRect = null;
});

plank.addEventListener("mousemove", e => {
    if (!cachedSimRect) return;
    const mouseX = e.clientX - cachedSimRect.left;
    previewBall.style.left = mouseX + "px";
    previewBall.style.top = cachedSimRect.height / 2 + "px";
});

// DROP 

plank.addEventListener("click", e => {
    const rect = plank.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));

    if (!currentPlankWidth) currentPlankWidth = rect.width;

    const center = rect.width / 2;
    const distance = clickX - center;

    spawnObject(clickX, upcomingWeight, distance);
    writeLog(upcomingWeight, distance);

    upcomingWeight = randomWeight();
    nextWeightDisplay.textContent = `${upcomingWeight} kg`;
    updatePreviewBall();

    updatePhysics();
    saveState();
});

// PHYSICS 

function updatePhysics() {
    let leftTorque = 0;
    let rightTorque = 0;
    let leftSum = 0;
    let rightSum = 0;

    objects.forEach(o => {
        const d = Math.abs(o.distance);

        if (d < CENTER_THRESHOLD) {
            leftSum += o.weight / 2;
            rightSum += o.weight / 2;
        } else if (o.distance < 0) {
            leftSum += o.weight;
            leftTorque += o.weight * d;
        } else {
            rightSum += o.weight;
            rightTorque += o.weight * d;
        }
    });

    const torqueDifference = rightTorque - leftTorque;

    const angle = torqueDifference / 10;

    const finalAngle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));

    plank.style.transform = `translate(-50%, -50%) rotate(${finalAngle}deg)`;

    leftWeightDisplay.textContent = `${leftSum.toFixed(1)} kg`;
    rightWeightDisplay.textContent = `${rightSum.toFixed(1)} kg`;
    tiltAngleDisplay.textContent = `${finalAngle.toFixed(1)}°`;

    lastAngle = finalAngle;
    saveState();
}

// RESET 

resetBtn.addEventListener("click", () => {
    objects.forEach(o => o.el.remove());
    objects = [];

    lastAngle = 0;
    plank.style.transform = `translate(-50%, -50%) rotate(0deg)`;

    leftWeightDisplay.textContent = "0.0 kg";
    rightWeightDisplay.textContent = "0.0 kg";
    tiltAngleDisplay.textContent = "0.0°";
    logArea.innerHTML = "";

    upcomingWeight = randomWeight();
    nextWeightDisplay.textContent = `${upcomingWeight} kg`;
    updatePreviewBall();

    localStorage.removeItem(STORAGE_KEY);
});