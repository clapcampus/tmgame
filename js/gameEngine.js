/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 */

class Basket {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.width = 60;
    this.height = 40;
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - this.height - 10;
    this.speed = 5;
    this.velocity = 0; // -1 (Left), 0 (Stop), 1 (Right)
    this.color = "#8B4513"; // Brown color for basket
  }

  update() {
    this.x += this.velocity * this.speed;

    // Boundary checks
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvasWidth) {
      this.x = this.canvasWidth - this.width;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw handle
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y, this.width / 2, Math.PI, 0);
    ctx.stroke();
  }

  setDirection(direction) {
    if (direction === "Left") {
      this.velocity = -1;
    } else if (direction === "Right") {
      this.velocity = 1;
    } else {
      this.velocity = 0;
    }
  }
}

class FallingItem {
  constructor(canvasWidth, type) {
    this.canvasWidth = canvasWidth;
    this.type = type; // 'apple', 'banana', 'grape', 'bomb'
    this.size = 30;
    this.x = Math.random() * (canvasWidth - this.size);
    this.y = -this.size;
    this.speed = 2 + Math.random() * 2; // Random speed
    
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
    ctx.font = "24px serif";
    ctx.fillText(this.icon, this.x, this.y + 24);
  }
}

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.isGameActive = false;
    this.items = [];
    this.basket = null;
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.lastSpawnTime = 0;
    this.spawnInterval = 1000; // Spawn every 1 second
    
    this.onScoreChange = null;
    this.onGameEnd = null;
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
    this.basket = new Basket(this.canvas.width, this.canvas.height);
    
    this.startDate = Date.now();
    
    this.loop();
  }

  stop() {
    this.isGameActive = false;
    cancelAnimationFrame(this.animationFrameId);
    
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
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
        return;
    }

    // 2. Spawn items
    const now = Date.now();
    if (now - this.lastSpawnTime > this.spawnInterval / (1 + (this.level -1) * 0.1)) {
        this.spawnItem();
        this.lastSpawnTime = now;
    }

    // 3. Update Basket
    this.basket.update();

    // 4. Update Items and Check Collision
    const levelSpeedMultiplier = 1 + (this.level - 1) * 0.1;
    
    for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.update(levelSpeedMultiplier);

        // Collision with Basket
        if (
            item.x < this.basket.x + this.basket.width &&
            item.x + item.size > this.basket.x &&
            item.y < this.basket.y + this.basket.height &&
            item.y + item.size > this.basket.y
        ) {
            // Collision!
            if (item.type === 'bomb') {
                this.stop();
                alert("Game Over! 💣");
                return;
            } else {
                this.addScore(item.score);
                this.items.splice(i, 1);
                continue;
            }
        }

        // Out of bounds
        if (item.y > this.canvas.height) {
            this.items.splice(i, 1);
        }
    }
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw Background (simple sky blue)
    this.ctx.fillStyle = "#E0F7FA";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Basket
    this.basket.draw(this.ctx);

    // Draw Items
    this.items.forEach(item => item.draw(this.ctx));
    
    // Draw UI (Time)
    const elapsed = (Date.now() - this.startDate) / 1000;
    const remaining = Math.ceil(Math.max(0, this.timeLimit - elapsed));
    
    this.ctx.fillStyle = "black";
    this.ctx.font = "16px sans-serif";
    this.ctx.fillText(`Time: ${remaining}`, 10, 20);
    this.ctx.fillText(`Score: ${this.score}`, 10, 40);
    this.ctx.fillText(`Level: ${this.level}`, 10, 60);
  }

  spawnItem() {
      const rand = Math.random();
      let type = 'apple';
      if (rand < 0.1) type = 'bomb';      // 10%
      else if (rand < 0.3) type = 'grape'; // 20%
      else if (rand < 0.6) type = 'banana';// 30%
      else type = 'apple';                 // 40%
      
      this.items.push(new FallingItem(this.canvas.width, type));
  }

  onPoseDetected(className) {
      if (!this.basket) return;
      
      if (className === "Left") {
          this.basket.setDirection("Left");
      } else if (className === "Right") {
          this.basket.setDirection("Right");
      } else {
          this.basket.setDirection("Center");
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
