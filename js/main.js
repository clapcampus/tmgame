/**
 * main.js
 * Entry point: Connects PoseEngine (Webcam/AI) and GameEngine (Logic/UI)
 */

// Global Variables
let poseEngine;
let gameEngine;
let stabilizer;
let ctx; // Context for Webcam Canvas
let labelContainer;

/**
 * Initialize Application
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;
  startBtn.innerText = "Loading...";

  try {
    // 1. Initialize PoseEngine
    poseEngine = new PoseEngine("./my_model/");
    // Initialize with standard size, flip for mirror effect handled in CSS/PoseEngine
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 200,
      flip: true
    });

    // 2. Initialize Stabilizer
    stabilizer = new PredictionStabilizer({
      threshold: 0.7,
      smoothingFrames: 3
    });

    // 3. Initialize GameEngine
    gameEngine = new GameEngine();

    // 4. Setup Webcam Canvas (Left Side)
    const canvas = document.getElementById("canvas");
    canvas.width = 200;
    canvas.height = 200;
    ctx = canvas.getContext("2d");

    // 5. Setup Label Container
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. Set Callbacks
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);

    // 7. Start PoseEngine Loop
    poseEngine.start();

    // 8. Start Game Loop!
    gameEngine.start({
      canvasId: "game-canvas",
      timeLimit: 60
    });

    // Update UI
    stopBtn.disabled = false;
    startBtn.innerText = "Running...";

  } catch (error) {
    console.error("Initialization Error:", error);
    alert("Failed to initialize. Check console for details.");
    startBtn.disabled = false;
    startBtn.innerText = "Start Game";
  }
}

/**
 * Stop Application
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (gameEngine) {
    gameEngine.stop();
  }

  if (stabilizer) {
    stabilizer.reset();
  }

  startBtn.disabled = false;
  startBtn.innerText = "Start Game";
  stopBtn.disabled = true;
}

/**
 * Handle Prediction Results
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilize prediction
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Update Labels
  if (labelContainer && labelContainer.childNodes.length > 0) {
    for (let i = 0; i < predictions.length; i++) {
      const classPrediction =
        predictions[i].className + ": " + predictions[i].probability.toFixed(2);
      labelContainer.childNodes[i].innerHTML = classPrediction;
    }
  }

  // 3. Show Max Prediction
  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "Detecting...";

  // 4. Send command to GameEngine
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * Draw Pose on Webcam Canvas
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    // Draw webcam frame
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0);

    // Draw Skeleton
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}
