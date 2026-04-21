const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreValue');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startGameBtn');

let width, height;
let animationId;
let score = 0;
let gameActive = false;

// Game State
const player = { x: 0, y: 0, size: 20, speed: 5, color: '#38bdf8' };
let bullets = [];
let enemies = [];
let particles = [];
let mouse = { x: 0, y: 0 };

// Setup Canvas
function resize() {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
    // Reset player position to bottom center
    player.x = width / 2;
    player.y = height - 100;
}
window.addEventListener('resize', resize);
resize();

// Input
canvas.addEventListener('mousemove', (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('touchmove', (e) => {
    if (!gameActive) return;
    e.preventDefault(); // Prevent scrolling
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
});
canvas.addEventListener('mousedown', shoot);
// Auto-shoot also works, but click/tap adds impact

// Classes
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.size = 3;
        this.color = '#fff';
        this.markedForDeletion = false;
    }
    update() {
        this.y -= this.speed;
        if (this.y < 0) this.markedForDeletion = true;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor() {
        this.x = Math.random() * width;
        this.y = -30;
        this.speed = Math.random() * 1 + 0.5; // Slower speed: 0.5 to 1.5
        this.size = Math.random() * 15 + 10;
        this.color = '#94a3b8'; // Muted slate color
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.1;
        this.markedForDeletion = false;
    }
    update() {
        this.y += this.speed;
        this.angle += this.spin;
        if (this.y > height + this.size) {
            this.markedForDeletion = true;
            // Penalize score for missing? Maybe not for simple relaxation
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Draw a simple square or diamond shape
        ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.stroke();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.color = color;
        this.life = 1; // Opacity
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.05;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

const shipImg = new Image();
shipImg.src = 'assets/ship.png';

// Game Logic
function shoot() {
    if (!gameActive) return;
    bullets.push(new Bullet(player.x, player.y - 30)); // Shoot from nose
}

let lastShot = 0;
function autoShoot(timestamp) {
    if (timestamp - lastShot > 200) { // Shoot every 200ms
        shoot();
        lastShot = timestamp;
    }
}

function spawnEnemies() {
    if (Math.random() < 0.01) { // Lower spawn rate, fixed low probability
        enemies.push(new Enemy());
    }
}

function checkCollisions() {
    // Bullets hit Enemies
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (
                bullet.x > enemy.x - enemy.size / 2 &&
                bullet.x < enemy.x + enemy.size / 2 &&
                bullet.y > enemy.y - enemy.size / 2 &&
                bullet.y < enemy.y + enemy.size / 2
            ) {
                createParticles(enemy.x, enemy.y, '#38bdf8');
                enemy.markedForDeletion = true;
                bullet.markedForDeletion = true;
                score += 10;
                scoreEl.textContent = score;
            }
        });
    });

    // Player hits Enemy
    enemies.forEach(enemy => {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.size + enemy.size / 2) {
            gameOver();
        }
    });

    // Clean up
    bullets = bullets.filter(b => !b.markedForDeletion);
    enemies = enemies.filter(e => !e.markedForDeletion);
    particles = particles.filter(p => p.life > 0);
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function update(timestamp) {
    if (!gameActive) return;

    ctx.fillStyle = '#0f172a'; // Clear with bg color
    ctx.globalAlpha = 1.0; // No trails, clean repaint
    ctx.fillRect(0, 0, width, height);

    // Move Player (Smooth follow)
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    player.x += dx * 0.1;
    player.y += dy * 0.1;

    // Draw Player
    if (shipImg.complete && shipImg.naturalWidth !== 0) {
        const size = 50; // Set a reasonable size for the image
        ctx.drawImage(shipImg, player.x - size / 2, player.y - size / 2, size, size);
    } else {
        // Fallback if image fails or loading
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 20);
        ctx.lineTo(player.x - 15, player.y + 15);
        ctx.lineTo(player.x, player.y + 5);
        ctx.lineTo(player.x + 15, player.y + 15);
        ctx.closePath();
        ctx.fill();
    }

    autoShoot(timestamp);
    spawnEnemies();

    // Updates
    bullets.forEach(b => b.update());
    enemies.forEach(e => e.update());
    particles.forEach(p => p.update());

    // Cleanup
    bullets = bullets.filter(b => !b.markedForDeletion);
    enemies = enemies.filter(e => !e.markedForDeletion);
    particles = particles.filter(p => p.life > 0);

    checkCollisions();

    // Draws
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    particles.forEach(p => p.draw());

    animationId = requestAnimationFrame(update);
}

function startGame() {
    score = 0;
    scoreEl.textContent = "0";
    gameActive = true;
    bullets = [];
    enemies = [];
    particles = [];

    // Set initial mouse pos to avoid jump
    mouse.x = width / 2;
    mouse.y = height - 100;
    player.x = width / 2;
    player.y = height + 100; // Fly in

    startScreen.style.display = 'none';
    resize();
    update(0);
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);

    // Show start screen again with updated text
    document.querySelector('.start-screen h2').textContent = "Mission Ended";
    document.querySelector('.start-screen p').textContent = `Final Score: ${score}`;
    startBtn.textContent = "Re-Deploy";
    startScreen.style.display = 'block';
}

startBtn.addEventListener('click', startGame);
