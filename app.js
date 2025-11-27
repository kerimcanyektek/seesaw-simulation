const plank = document.getElementById("plank");
const previewBall = document.getElementById("preview-ball");
const objectsContainer = document.getElementById("objects-container");

const leftWeightDisplay = document.getElementById("left-weight-display");
const rightWeightDisplay = document.getElementById("right-weight-display");
const nextWeightDisplay = document.getElementById("next-weight-display");
const tiltAngleDisplay = document.getElementById("tilt-angle-display");
const logArea = document.getElementById("log-area");
const resetBtn = document.getElementById("reset-button");


let objects = [];
let upcomingWeight = randomWeight();

const MAX_ANGLE = 30;
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

plank.addEventListener("mousemove", (e) => {
    const rect = plank.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    previewBall.style.left = mouseX + "px";
});


plank.addEventListener("click", (e) => {
    const rect = plank.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const center = rect.width / 2;
    const distance = clickX - center;

    const weight = upcomingWeight;

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
        el: ball
    });

    writeLog(weight, distance);

    upcomingWeight = randomWeight();
    nextWeightDisplay.textContent = upcomingWeight + " kg";
    updatePreviewBall();

    updatePhysics();
});


function updatePhysics() {
    let leftTorque = 0;
    let rightTorque = 0;
    let leftTotal = 0;
    let rightTotal = 0;

    objects.forEach(o => {
        const d = Math.abs(o.distance);

        if (o.distance < 0) {
            leftTotal += o.weight;
            leftTorque += o.weight * d;
        } else {
            rightTotal += o.weight;
            rightTorque += o.weight * d;
        }
    });

    const torqueDiff = rightTorque - leftTorque;
    const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, torqueDiff / 10));

    plank.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    leftWeightDisplay.textContent = leftTotal.toFixed(1) + " kg";
    rightWeightDisplay.textContent = rightTotal.toFixed(1) + " kg";
    tiltAngleDisplay.textContent = angle.toFixed(1) + "°";
}

resetBtn.addEventListener("click", () => {
    objects.forEach(o => o.el.remove());
    objects = [];

    plank.style.transform = "translate(-50%, -50%) rotate(0deg)";
    leftWeightDisplay.textContent = "0.0 kg";
    rightWeightDisplay.textContent = "0.0 kg";
    tiltAngleDisplay.textContent = "0.0°";
    logArea.innerHTML = "";

    upcomingWeight = randomWeight();
    updatePreviewBall();
});