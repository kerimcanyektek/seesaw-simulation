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
const STORAGE_KEY = "seesaw_state_v2";
const CENTER_THRESHOLD = 5;

// STATE 

let objects = [];
let upcomingWeight = randomWeight();
let cachedPlankRect = null;
let cachedSimRect = null;
let currentPlankWidth = 0;

// INIT

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const state = JSON.parse(raw);
            if (state.upcomingWeight) {
                upcomingWeight = state.upcomingWeight;
            }
        } catch (e) {
            console.error("Failed to parse saved state:", e);
        }
    }

    nextWeightDisplay.textContent = `${upcomingWeight} kg`;
    updatePreviewBall();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const savedTransform = plank.style.transform;
            plank.style.transform = 'translate(-50%, -50%) rotate(0deg)';

            requestAnimationFrame(() => {
                loadStateObjects();
                if (objects.length > 0) {
                    updatePhysics();
                } else {
                    plank.style.transform = savedTransform;
                }
            });
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
    const s = ballSize(upcomingWeight);
    previewBall.style.width = s + "px";
    previewBall.style.height = s + "px";
    previewBall.style.background = ballColor(upcomingWeight);
}

// LOG

function writeLog(weight, distance) {
    const side = Math.abs(distance) < CENTER_THRESHOLD
        ? "center"
        : distance < 0
            ? "left"
            : "right";
    const px = Math.abs(distance).toFixed(0);

    const div = document.createElement("div");
    div.textContent = `${weight}kg dropped on ${side} side at ${px}px from center`;
    logArea.prepend(div);
}

// LOCAL STORAGE

function saveState() {
    const width = currentPlankWidth || plank.getBoundingClientRect().width;

    if (width === 0) {
        console.warn("Cannot save state: plank width is 0");
        return;
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            upcomingWeight,
            plankWidth: width,
            objects: objects.map(o => {
                const relX = Math.max(0, Math.min(1, o.clickX / width));
                return {
                    weight: o.weight,
                    relX: relX
                };
            })
        })
    );
}

function loadStateObjects() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
        const state = JSON.parse(raw);
        if (!state || !state.objects || state.objects.length === 0) return;

        const plankRect = plank.getBoundingClientRect();
        const width = plankRect.width;

        if (width === 0 || plankRect.height === 0) {
            console.warn("Plank not ready yet, delaying load...");
            setTimeout(loadStateObjects, 50);
            return;
        }

        currentPlankWidth = width;

        const center = width / 2;

        objectsContainer.innerHTML = "";
        objects = [];

        state.objects.forEach(o => {
            const clampedRelX = Math.max(0, Math.min(1, o.relX));
            const clickX = clampedRelX * width;
            const distance = clickX - center;
            spawnObject(clickX, o.weight, distance);
        });
    } catch (e) {
        console.error("Failed to load saved state:", e);
    }
}

// CREATE OBJECT

function spawnObject(clickX, weight, distance) {
    const ball = document.createElement("div");
    ball.className = "object";
    ball.textContent = weight + "kg";
    ball.style.left = clickX + "px";
    ball.style.top = "50%";
    ball.style.width = ballSize(weight) + "px";
    ball.style.height = ballSize(weight) + "px";
    ball.style.background = ballColor(weight);

    objectsContainer.appendChild(ball);

    objects.push({
        weight,
        distance,
        el: ball,
        clickX
    });
}

// PREVIEW — MOUSE FOLLOW

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

plank.addEventListener("mousemove", (e) => {
    if (!cachedPlankRect || !cachedSimRect) return;

    const mouseX = e.clientX - cachedSimRect.left;
    const centerY = cachedSimRect.height / 2;

    previewBall.style.left = mouseX + "px";
    previewBall.style.top = centerY + "px";
});

// DROP — CLICK ON PLANK ONLY

plank.addEventListener("click", (e) => {
    e.stopPropagation();

    const plankRect = plank.getBoundingClientRect();
    const clickX = e.clientX - plankRect.left;

    if (currentPlankWidth === 0) {
        currentPlankWidth = plankRect.width;
    }

    const clampedClickX = Math.max(0, Math.min(plankRect.width, clickX));

    const center = plankRect.width / 2;
    const distance = clampedClickX - center;

    spawnObject(clampedClickX, upcomingWeight, distance);
    writeLog(upcomingWeight, distance);

    upcomingWeight = randomWeight();
    nextWeightDisplay.textContent = `${upcomingWeight} kg`;
    updatePreviewBall();

    updatePhysics();
    saveState();

    cachedPlankRect = plank.getBoundingClientRect();
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

    const diff = rightTorque - leftTorque;
    const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, diff / 10));

    plank.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    leftWeightDisplay.textContent = `${leftSum.toFixed(1)} kg`;
    rightWeightDisplay.textContent = `${rightSum.toFixed(1)} kg`;
    tiltAngleDisplay.textContent = `${angle.toFixed(1)}°`;
}

// RESET

resetBtn.addEventListener("click", () => {
    objects.forEach(o => o.el.remove());
    objects = [];

    plank.style.transform = `translate(-50%, -50%) rotate(0deg)`;
    leftWeightDisplay.textContent = "0.0 kg";
    rightWeightDisplay.textContent = "0.0 kg";
    tiltAngleDisplay.textContent = "0.0°";
    logArea.innerHTML = "";

    upcomingWeight = randomWeight();
    nextWeightDisplay.textContent = `${upcomingWeight} kg`;
    updatePreviewBall();

    currentPlankWidth = 0;

    localStorage.removeItem(STORAGE_KEY);
});