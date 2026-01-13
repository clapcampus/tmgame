/**
 * gameEngine.js
 * Fruit Catcher Game Logic (3-Lane Airplane Version)
 */

class Airplane {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.size = 50; // Size of the airplane emoji
    this.laneIndex = 1; // 0: Left, 1: Center, 2: Right
    this.y = canvasHeight - 80; // Fixed Y position

    // Lane X coordinates (Centers of three equal columns)
    this.laneCenters = [
      canvasWidth * (1 / 6),
      canvasWidth * (3 / 6),
      canvasWidth * (5 / 6)
    ];
  }

  setLane(laneIndex) {
    if (laneIndex >= 0 && laneIndex <= 2) {
      this.laneIndex = laneIndex;
    }
  }

  draw(ctx) {
    const x = this.laneCenters[this.laneIndex];

    ctx.save();
    ctx.translate(x, this.y);
    // Rotate -45 degrees because default ✈️ points North-East
    ctx.rotate(-Math.PI / 4);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "50px serif";
    // ✈️ is the character, but let's try a better distinct one or just this
    // You can also use a simple shape if emoji rendering varies too much
    ctx.fillText("✈️", 0, 0);

    ctx.restore();

    // Optional: Draw a subtle highlight circle to show hit area
    // ctx.beginPath();
    // ctx.arc(x, this.y, 25, 0, Math.PI * 2);
    // ctx.lineWidth = 2;
    // ctx.strokeStyle = "rgba(0,0,0,0.2)";
    // ctx.stroke();
  }
}

class FallingItem {
  constructor(canvasWidth, laneIndex, type) {
    this.canvasWidth = canvasWidth;
    this.laneIndex = laneIndex; // 0, 1, 2
    this.type = type; // 'apple', 'banana', 'grape', 'bomb'

    this.laneCenters = [
      canvasWidth * (1 / 6),
      canvasWidth * (3 / 6),
      canvasWidth * (5 / 6)
    ];

    this.x = this.laneCenters[laneIndex];
    this.y = -50; // Start above screen
    this.speed = 3 + Math.random() * 2; // Random speed

    // Define properties based on type
    switch (type) {
      case 'apple':
        this.icon = '🍎';
        this.score = 50;
        break;
      case 'banana':
        this.icon = '🍌';
        this.score = 100;
        break;
      case 'grape':
        this.icon = '🍇';
        this.score = 150;
        break;
      case 'bomb':
        this.icon = '💣';
        this.score = 0;
        break;
    }
  }

  update(levelSpeedMultiplier) {
    this.y += this.speed * levelSpeedMultiplier;
  }

  draw(ctx) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "40px serif";
    ctx.fillText(this.icon, this.x, this.y);
  }
}

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 10;
    this.radius = 5;
  }

  update() {
    this.y -= this.speed;
  }

  draw(ctx) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0; // Opacity/Life (1.0 to 0.0)
    this.speed = 2; // Floating up speed
  }

  update() {
    this.y -= this.speed;
    this.life -= 0.02; // Fade out
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.textAlign = "center";
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.isGameActive = false;
    this.items = [];
    this.bullets = []; // Array to store bullets
    this.floatingTexts = []; // Array for floating texts
    this.airplane = null;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.lastSpawnTime = 0;
    this.spawnInterval = 1000;

    this.onScoreChange = null;
    this.onGameEnd = null;
    this.handleKeyDown = this.handleKeyDown.bind(this); // Bind properly
  }

  start(config = {}) {
    this.canvas = document.getElementById(config.canvasId || "game-canvas");
    if (!this.canvas) {
      console.error("Game Canvas not found");
      return;
    }
    this.ctx = this.canvas.getContext("2d");

    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.timeLimit = config.timeLimit || 60;
    this.items = [];
    this.bullets = [];
    this.floatingTexts = [];
    this.airplane = new Airplane(this.canvas.width, this.canvas.height);

    this.startDate = Date.now();

    // Add Keyboard Listener
    document.addEventListener("keydown", this.handleKeyDown);

    this.loop();
  }

  stop() {
    if (!this.isGameActive) return;
    this.isGameActive = false;
    cancelAnimationFrame(this.animationFrameId);

    // Remove Keyboard Listener
    document.removeEventListener("keydown", this.handleKeyDown);

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  handleKeyDown(event) {
    if (this.isGameActive && event.code === "Space") {
      this.shoot();
    }
  }

  shoot() {
    if (!this.airplane) return;
    // Spawn bullet at airplane's position
    const x = this.airplane.laneCenters[this.airplane.laneIndex];
    const y = this.airplane.y - 40; // Slightly above the airplane
    this.bullets.push(new Bullet(x, y));
  }

  spawnFloatingText(x, y, text, color) {
    this.floatingTexts.push(new FloatingText(x, y, text, color));
  }

  loop() {
    if (!this.isGameActive) return;

    this.update();
    this.draw();

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // 1. Timer check
    const elapsed = (Date.now() - this.startDate) / 1000;
    const remaining = Math.max(0, this.timeLimit - elapsed);

    if (remaining <= 0) {
      this.stop();
      alert(`Time's up! Final Score: ${this.score}`);
      return;
    }

    // 2. Spawn items
    const now = Date.now();
    // Spawns faster as level increases
    if (now - this.lastSpawnTime > this.spawnInterval / (1 + (this.level - 1) * 0.2)) {
      this.spawnItem();
      this.lastSpawnTime = now;
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.update();
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 3. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update();
      if (bullet.y < 0) {
        this.bullets.splice(i, 1);
      }
    }

    // 4. Update Items and Check Collisions
    const levelSpeedMultiplier = 1 + (this.level - 1) * 0.1;
    const hitDistance = 40; // Pixel distance for collision

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(levelSpeedMultiplier);
      let itemHit = false;

      // A. Collision with Bullets
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const bullet = this.bullets[j];
        const dx = bullet.x - item.x;
        const dy = bullet.y - item.y;
        // Simple distance check (approximate)
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          // Hit!
          if (item.type === 'bomb') {
            this.addScore(200); // Super Bonus for destroying bomb!
            this.spawnFloatingText(item.x, item.y, "+200", "blue");
          } else {
            this.addScore(-100); // Penalty for destroying precious fruit!
            this.spawnFloatingText(item.x, item.y, "-100", "red");
          }

          this.bullets.splice(j, 1); // Remove bullet
          this.items.splice(i, 1);   // Remove item (Destroyed)
          itemHit = true;
          break;
        }
      }
      if (itemHit) continue; // Item destroyed, move to next item

      // B. Collision with Airplane
      // Must be in same lane AND y-coordinates overlap
      if (item.laneIndex === this.airplane.laneIndex) {
        if (Math.abs(item.y - this.airplane.y) < hitDistance) {
          // Collision!
          if (item.type === 'bomb') {
            this.stop();
            alert("BOOM! Game Over! 💣");
            return;
          } else {
            this.addScore(item.score);
            this.spawnFloatingText(item.x, item.y, `+${item.score}`, "green");
            // Show simple floating text effect (optional, simplified here)
            this.items.splice(i, 1);
            continue;
          }
        }
      }

      // Out of bounds
      if (item.y > this.canvas.height + 50) {
        this.items.splice(i, 1);
      }
    }
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Background (Sky with lane dividers)
    this.ctx.fillStyle = "#87CEEB"; // Sky Blue
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Lane Dividers
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    // Line 1 (between lane 0 and 1) -> 1/3 width
    this.ctx.moveTo(this.canvas.width / 3, 0);
    this.ctx.lineTo(this.canvas.width / 3, this.canvas.height);
    // Line 2 (between lane 1 and 2) -> 2/3 width
    this.ctx.moveTo(this.canvas.width * 2 / 3, 0);
    this.ctx.lineTo(this.canvas.width * 2 / 3, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Reset dash

    // Draw Items
    this.items.forEach(item => item.draw(this.ctx));

    // Draw Bullets
    this.bullets.forEach(bullet => bullet.draw(this.ctx));

    // Draw Airplane
    this.airplane.draw(this.ctx);

    // Draw Floating Texts
    this.floatingTexts.forEach(ft => ft.draw(this.ctx));

    // Draw UI (Time)
    const elapsed = (Date.now() - this.startDate) / 1000;
    const remaining = Math.ceil(Math.max(0, this.timeLimit - elapsed));

    this.ctx.fillStyle = "#000";
    this.ctx.font = "bold 20px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`⏱️ ${remaining}s`, 10, 30);
    this.ctx.fillText(`🏆 ${this.score}`, 10, 60);
    this.ctx.fillText(`Lv. ${this.level}`, 10, 90);
  }

  spawnItem() {
    // Pick a random lane (0, 1, 2)
    const laneIndex = Math.floor(Math.random() * 3);

    const rand = Math.random();
    let type = 'apple';
    if (rand < 0.2) type = 'bomb';       // 20%
    else if (rand < 0.4) type = 'grape'; // 20%
    else if (rand < 0.7) type = 'banana';// 30%
    else type = 'apple';                 // 30%

    this.items.push(new FallingItem(this.canvas.width, laneIndex, type));
  }

  onPoseDetected(className) {
    if (!this.airplane) return;

    if (className === "Left") {
      this.airplane.setLane(0);
    } else if (className === "Right") {
      this.airplane.setLane(2);
    } else {
      this.airplane.setLane(1); // Center
    }
  }

  addScore(points) {
    this.score += points;

    // Level up every 500 points
    if (this.score >= this.level * 500) {
      this.level++;
    }

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  setScoreChangeCallback(callback) {
    this.onScoreChange = callback;
  }

  setGameEndCallback(callback) {
    this.onGameEnd = callback;
  }
}

window.GameEngine = GameEngine;
