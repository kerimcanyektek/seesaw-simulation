/* CONSTANTS & CONFIGURATION */
const CONFIG = {
    SELECTORS: {
        plank: "plank",
        previewBall: "preview-ball",
        objectsContainer: "objects-container",
        simulationArea: "simulation-area",
        leftWeight: "left-weight-display",
        rightWeight: "right-weight-display",
        nextWeight: "next-weight-display",
        tiltAngle: "tilt-angle-display",
        logArea: "log-area",
        resetBtn: "reset-button"
    },
    PHYSICS: {
        MAX_ANGLE: 30,
        ANGLE_DIVISOR: 10,
        CENTER_THRESHOLD: 5,
        MAX_WEIGHT: 10,
        MIN_WEIGHT: 1
    },
    UI: {
        COLORS: {
            LIGHT: "#4caf50",  // 1-3kg
            MEDIUM: "#ff9800", // 4-6kg
            HEAVY: "#e53935"   // 7-10kg
        },
        TRANSITION_DELAY: 50 // ms
    },
    STORAGE_KEY: "seesaw_state_v3"
};

/* DOM ELEMENTS */

const DOM = {};

function cacheDOMElements() {
    for (const [key, id] of Object.entries(CONFIG.SELECTORS)) {
        const el = document.getElementById(id);
        if (el) DOM[key] = el;
        else console.warn(`Element with ID '${id}' not found.`);
    }
}

/* STATE MANAGEMENT */

const State = {
    objects: [],
    upcomingWeight: 0,
    lastAngle: 0,
    currentPlankWidth: 0,
    cachedPlankRect: null,
    cachedSimRect: null,

    reset() {
        this.objects = [];
        this.lastAngle = 0;
        this.currentPlankWidth = 0;
        this.generateNextWeight();
    },

    generateNextWeight() {
        this.upcomingWeight = Math.floor(Math.random() * CONFIG.PHYSICS.MAX_WEIGHT) + 1;
    },

    addObject(weight, distance, clickX) {
        this.objects.push({ weight, distance, clickX });
    }
};

/* INITIALIZATION */

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
    cacheDOMElements();
    loadState();

    renderStaticUI();

    if (State.objects.length > 0) {
        requestAnimationFrame(() => {
            getPlankDimensions();
            restoreObjectsToDOM();
            updatePhysics();
        });
    } else {
        if (State.upcomingWeight === 0) State.generateNextWeight();
        renderStaticUI();
    }

    attachEventListeners();
}

/* CORE LOGIC */

function getBallColor(weight) {
    if (weight <= 3) return CONFIG.UI.COLORS.LIGHT;
    if (weight <= 6) return CONFIG.UI.COLORS.MEDIUM;
    return CONFIG.UI.COLORS.HEAVY;
}

function getBallSize(weight) {
    return 20 + weight * 4;
}

function calculatePhysicsState() {
    let leftTorque = 0;
    let rightTorque = 0;
    let leftSum = 0;
    let rightSum = 0;

    State.objects.forEach(obj => {
        const d = Math.abs(obj.distance);

        if (d < CONFIG.PHYSICS.CENTER_THRESHOLD) {
            leftSum += obj.weight / 2;
            rightSum += obj.weight / 2;
        } else if (obj.distance < 0) {
            leftSum += obj.weight;
            leftTorque += obj.weight * d;
        } else {
            rightSum += obj.weight;
            rightTorque += obj.weight * d;
        }
    });

    const torqueDifference = rightTorque - leftTorque;
    const rawAngle = torqueDifference / CONFIG.PHYSICS.ANGLE_DIVISOR;
    const finalAngle = Math.max(
        -CONFIG.PHYSICS.MAX_ANGLE,
        Math.min(CONFIG.PHYSICS.MAX_ANGLE, rawAngle)
    );

    return {
        leftSum,
        rightSum,
        angle: finalAngle
    };
}

function getPlankDimensions() {
    if (!DOM.plank) return { width: 0, left: 0 };
    const rect = DOM.plank.getBoundingClientRect();
    if (rect.width > 0) {
        State.currentPlankWidth = rect.width;
    }
    return rect;
}

/* UI & RENDERING */

function createBallElement(weight, leftPos) {
    const ball = document.createElement("div");
    ball.className = "object";
    ball.textContent = `${weight}kg`;
    ball.style.left = `${leftPos}px`;
    ball.style.top = "50%";

    const size = getBallSize(weight);
    ball.style.width = `${size}px`;
    ball.style.height = `${size}px`;
    ball.style.background = getBallColor(weight);

    return ball;
}

function renderStaticUI() {
    if (DOM.nextWeight) DOM.nextWeight.textContent = `${State.upcomingWeight} kg`;
    updatePreviewBallVisuals();
}

function updatePreviewBallVisuals() {
    if (!DOM.previewBall) return;
    DOM.previewBall.textContent = `${State.upcomingWeight}kg`;
    const size = getBallSize(State.upcomingWeight);
    DOM.previewBall.style.width = `${size}px`;
    DOM.previewBall.style.height = `${size}px`;
    DOM.previewBall.style.background = getBallColor(State.upcomingWeight);
}

function restoreObjectsToDOM() {
    if (!DOM.objectsContainer) return;
    DOM.objectsContainer.innerHTML = "";

    const rect = getPlankDimensions();
    const center = rect.width / 2;

    State.objects.forEach(obj => {
        let clickX = center + obj.distance;
        clickX = Math.max(0, Math.min(rect.width, clickX));

        obj.clickX = clickX;

        const el = createBallElement(obj.weight, clickX);
        DOM.objectsContainer.appendChild(el);
        obj.el = el;
    });
}

function updatePhysics() {
    const calc = calculatePhysicsState();

    if (DOM.plank) {
        DOM.plank.style.transform = `translate(-50%, -50%) rotate(${calc.angle}deg)`;
    }

    if (DOM.leftWeight) DOM.leftWeight.textContent = `${calc.leftSum.toFixed(1)} kg`;
    if (DOM.rightWeight) DOM.rightWeight.textContent = `${calc.rightSum.toFixed(1)} kg`;
    if (DOM.tiltAngle) DOM.tiltAngle.textContent = `${calc.angle.toFixed(1)}°`;

    State.lastAngle = calc.angle;
    saveState();
}

function logDrop(weight, distance) {
    if (!DOM.logArea) return;

    const side = Math.abs(distance) < CONFIG.PHYSICS.CENTER_THRESHOLD
        ? "center"
        : distance < 0 ? "left" : "right";
    const px = Math.abs(distance).toFixed(0);

    const div = document.createElement("div");
    div.textContent = `${weight}kg dropped on ${side} side at ${px}px from center`;
    DOM.logArea.prepend(div);
}

/* EVENT HANDLERS */

function handlePlankClick(e) {
    const rect = getPlankDimensions();
    // Calculate click position relative to plank
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const center = rect.width / 2;
    const distance = clickX - center;

    // 1. Add to State
    State.addObject(State.upcomingWeight, distance, clickX);

    // 2. Render Object
    const ballEl = createBallElement(State.upcomingWeight, clickX);
    if (DOM.objectsContainer) DOM.objectsContainer.appendChild(ballEl);

    // Link element to the last added object
    const lastObj = State.objects[State.objects.length - 1];
    if (lastObj) lastObj.el = ballEl;

    // 3. Log
    logDrop(State.upcomingWeight, distance);

    // 4. Prepare Next
    State.generateNextWeight();
    renderStaticUI();

    // 5. Update Physics
    updatePhysics();
}

function handleReset() {
    // Clear DOM
    if (DOM.objectsContainer) DOM.objectsContainer.innerHTML = "";
    if (DOM.logArea) DOM.logArea.innerHTML = "";

    // Reset State
    State.reset();
    localStorage.removeItem(CONFIG.STORAGE_KEY);

    // Reset UI
    if (DOM.plank) DOM.plank.style.transform = `translate(-50%, -50%) rotate(0deg)`;
    if (DOM.leftWeight) DOM.leftWeight.textContent = "0.0 kg";
    if (DOM.rightWeight) DOM.rightWeight.textContent = "0.0 kg";
    if (DOM.tiltAngle) DOM.tiltAngle.textContent = "0.0°";

    renderStaticUI();
}

function attachEventListeners() {
    // Plank Click
    if (DOM.plank) DOM.plank.addEventListener("click", handlePlankClick);

    // Reset Click
    if (DOM.resetBtn) DOM.resetBtn.addEventListener("click", handleReset);

    // Hover Effects (Preview Ball)
    if (DOM.plank && DOM.previewBall) {
        DOM.plank.addEventListener("mouseenter", () => {
            State.cachedPlankRect = DOM.plank.getBoundingClientRect();
            if (DOM.simulationArea) {
                State.cachedSimRect = DOM.simulationArea.getBoundingClientRect();
            }
            DOM.previewBall.style.opacity = "0.45";
        });

        DOM.plank.addEventListener("mouseleave", () => {
            DOM.previewBall.style.opacity = "0";
            State.cachedPlankRect = null;
            State.cachedSimRect = null;
        });

        DOM.plank.addEventListener("mousemove", (e) => {
            if (!State.cachedSimRect) return;
            const mouseX = e.clientX - State.cachedSimRect.left;
            DOM.previewBall.style.left = `${mouseX}px`;
            const topY = State.cachedSimRect.height / 2;
            DOM.previewBall.style.top = `${topY}px`;
        });
    }
}

/* STORAGE */

function saveState() {
    const data = {
        upcomingWeight: State.upcomingWeight,
        lastAngle: State.lastAngle,
        objects: State.objects.map(o => ({
            weight: o.weight,
            distance: o.distance
        }))
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
        try {
            const data = JSON.parse(raw);
            if (data.upcomingWeight) State.upcomingWeight = data.upcomingWeight;
            if (data.lastAngle !== undefined) State.lastAngle = data.lastAngle;
            if (Array.isArray(data.objects)) {
                State.objects = data.objects.map(o => ({
                    weight: o.weight,
                    distance: o.distance
                }));
            }
        } catch (e) {
            console.error("Failed to load state", e);
        }
    }
}