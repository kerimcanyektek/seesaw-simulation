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

// STATE 

let objects = [];
let upcomingWeight = randomWeight();

// INIT

init();

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
        loadStateObjects();
        updatePhysics();
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
    const side = distance < 0 ? "left" : distance > 0 ? "right" : "center";
    const px = Math.abs(distance).toFixed(0);

    const div = document.createElement("div");
    div.textContent = `${weight}kg dropped on ${side} side at ${px}px from center`;
    logArea.prepend(div);
}

// LOCAL STORAGE

function saveState() {
    const plankRect = plank.getBoundingClientRect();
    const width = plankRect.width;

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            upcomingWeight,
            objects: objects.map(o => ({
                weight: o.weight,
                relX: o.clickX / width
            }))
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
        const center = width / 2;

        objectsContainer.innerHTML = "";
        objects = [];

        state.objects.forEach(o => {
            const clickX = o.relX * width;
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
    previewBall.style.opacity = "0.45";
});

plank.addEventListener("mouseleave", () => {
    previewBall.style.opacity = "0";
});

plank.addEventListener("mousemove", (e) => {
    const plankRect = plank.getBoundingClientRect();
    const simRect = simulationArea.getBoundingClientRect();
    
    const mouseX = e.clientX - simRect.left;
    const centerY = plankRect.top - simRect.top + plankRect.height / 2;

    previewBall.style.left = mouseX + "px";
    previewBall.style.top = centerY + "px";
});

// DROP — CLICK ON PLANK ONLY

plank.addEventListener("click", (e) => {
    e.stopPropagation();
    
    const plankRect = plank.getBoundingClientRect();
    const clickX = e.clientX - plankRect.left;
    const center = plankRect.width / 2;
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
        if (o.distance < 0) {
            leftSum += o.weight;
            leftTorque += o.weight * d;
        } else if (o.distance > 0) {
            rightSum += o.weight;
            rightTorque += o.weight * d;
        } else {
            leftSum += o.weight / 2;
            rightSum += o.weight / 2;
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

    localStorage.removeItem(STORAGE_KEY);
});