const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Pastikan canvas full layar
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Player bisa bergerak
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 140,
  w: 40, h: 60, color: '#4f8cff',
  dx: 0, speed: 5,
  facing: 1,
  attacking: false, attackFrame: 0,
  hp: 100, invul: 0,
  jumping: false, vy: 0, gravity: 0.7, groundY: canvas.height - 140
};

let enemies = [];
let enemySpawnTimer = 0;
let score = 0;

// Coin
let coin = {
  x: canvas.width / 2, y: canvas.height - 120, r: 16, taken: false
};

// Loader sprite jalan
const walkSprites = [];
for (let i = 1; i <= 8; i++) {
  const img = new Image();
  img.src = `../../assets/sprite/walk (${i}).jpg`;
  walkSprites.push(img);
}
let walkFrame = 0;
let walkFrameTick = 0;

// Tambahkan di atas
let gameOver = false;

function spawnEnemy() {
  // Random kiri atau kanan
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const x = side === 'left' ? -40 : canvas.width;
  const facing = side === 'left' ? 1 : -1;
  enemies.push({
    x: x, y: player.y, w: 40, h: 60, color: '#ff4f4f',
    hp: 1, alive: true, facing: facing, speed: 2.2 + Math.random(),
    attackFrame: 0, attacking: false, hitFrame: 0, side: side
  });
}

function drawPlayer() {
  ctx.save();
  // Flip horizontal jika menghadap kiri
  if (player.facing === -1) {
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.scale(-1, 1);
    ctx.translate(-player.x - player.w / 2, -player.y - player.h / 2);
  }
  let spriteToDraw = walkSprites[0];
  if (player.dx !== 0) {
    spriteToDraw = walkSprites[walkFrame];
  }
  if (spriteToDraw.complete && spriteToDraw.naturalWidth !== 0) {
    ctx.drawImage(spriteToDraw, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
  ctx.restore();

  // Invul effect
  if (player.invul > 0) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.restore();
  }
}

function drawEnemies() {
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    ctx.save();
    // Flip jika menghadap kanan
    if (enemy.facing === 1) {
      ctx.translate(enemy.x + enemy.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-enemy.x - enemy.w / 2, 0);
    }
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    // Efek kena pukul
    if (enemy.hitFrame > 0) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.strokeRect(enemy.x-2, enemy.y-2, enemy.w+4, enemy.h+4);
      enemy.hitFrame--;
    }
    ctx.restore();
  });
}

function drawCoin() {
  if (coin.taken) return;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI*2);
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.stroke();
}

function update() {
  // Gerak player
  player.x += player.dx;
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;

  // Flip player sesuai arah gerak
  if (player.dx > 0) player.facing = 1;
  else if (player.dx < 0) player.facing = -1;

  // Animasi jalan
  if (player.dx !== 0) {
    walkFrameTick++;
    if (walkFrameTick > 4) {
      walkFrame = (walkFrame + 1) % 8; // <= 8 frame, bukan 9!
      walkFrameTick = 0;
    }
  } else {
    walkFrame = 0;
    walkFrameTick = 0;
  }

  // Spawn enemy tiap 1.2 detik
  enemySpawnTimer--;
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    enemySpawnTimer = 72 + Math.random()*40;
  }

  // Update enemies
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    // Gerak ke player
    if (enemy.x < player.x) {
      enemy.x += enemy.speed;
      enemy.facing = 1;
    } else if (enemy.x > player.x) {
      enemy.x -= enemy.speed;
      enemy.facing = -1;
    }
    // Cek jarak untuk attack
    if (!enemy.attacking && Math.abs(enemy.x - player.x) < 38) {
      enemy.attacking = true;
      enemy.attackFrame = 0;
    }
    // Attack animasi
    if (enemy.attacking) {
      enemy.attackFrame++;
      if (enemy.attackFrame === 8 && player.invul === 0) {
        // Hit player
        player.hp -= 10;
        if (player.hp < 0) player.hp = 0;
        player.invul = 40;
      }
      if (enemy.attackFrame > 16) {
        enemy.attacking = false;
        enemy.attackFrame = 0;
      }
    }
  });

  // Player invul
  if (player.invul > 0) player.invul--;

  // Player attack
  if (player.attacking) {
    player.attackFrame++;
    // Cek kena enemy
    if (player.attackFrame === 4) {
      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        // Attack box tergantung arah
        let attackBox;
        if (player.facing === 1) {
          attackBox = {x: player.x + player.w, y: player.y + 20, w: 18, h: 12};
        } else {
          attackBox = {x: player.x - 18, y: player.y + 20, w: 18, h: 12};
        }
        if (
          attackBox.x < enemy.x + enemy.w &&
          attackBox.x + attackBox.w > enemy.x &&
          attackBox.y < enemy.y + enemy.h &&
          attackBox.y + attackBox.h > enemy.y
        ) {
          enemy.hp--;
          enemy.hitFrame = 6;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            score += 1;
          }
        }
      });
      updateUI();
    }
    if (player.attackFrame > 8) {
      player.attacking = false;
      player.attackFrame = 0;
    }
  }

  // Ambil coin
  if (!coin.taken &&
    player.x + player.w > coin.x - coin.r &&
    player.x < coin.x + coin.r &&
    player.y + player.h > coin.y - coin.r &&
    player.y < coin.y + coin.r
  ) {
    coin.taken = true;
    score += 2;
    updateUI();
    setTimeout(() => {
      // Respawn coin di posisi random
      coin.x = 60 + Math.random() * (canvas.width - 120);
      coin.taken = false;
    }, 1200);
  }

  // Lompat & gravitasi
  if (player.jumping) {
    player.y += player.vy;
    player.vy += player.gravity;
    if (player.y >= player.groundY) {
      player.y = player.groundY;
      player.jumping = false;
      player.vy = 0;
    }
  }
}

function updateUI() {
  // HP bar
  const hpBar = document.getElementById('hp-bar');
  const hpValue = document.getElementById('hp-value');
  hpBar.style.width = Math.max(0, player.hp) + "%";
  hpValue.textContent = Math.max(0, player.hp);
  // Coin
  document.getElementById('score').textContent = score;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer();
  drawEnemies();
  drawCoin();
}

// ...fungsi gameLoop:
function gameLoop() {
  update();
  draw();
  updateUI();
  if (player.hp > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    gameOver = true;
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
    ctx.font = "24px Arial";
    ctx.fillText("Score: " + score, canvas.width/2, canvas.height/2 + 40);
    ctx.font = "20px Arial";
    ctx.fillText("Tekan R untuk restart", canvas.width/2, canvas.height/2 + 80);
    ctx.restore();
  }
}

// Kontrol player
document.addEventListener('keydown', e => {
  if (e.key === "ArrowLeft" || e.key === "a") player.dx = -player.speed;
  if (e.key === "ArrowRight" || e.key === "d") player.dx = player.speed;
  if ((e.key === "ArrowUp" || e.key === "w") && !player.jumping) {
    player.jumping = true;
    player.vy = -12;
  }
  if ((e.key === "j" || e.key === "J") && !player.attacking) {
    player.attacking = true;
    player.attackFrame = 0;
  }
  // Restart tetap
  if (gameOver && (e.key === "r" || e.key === "R")) {
    // Reset semua variabel utama
    player.hp = 100;
    player.x = canvas.width / 2 - player.w / 2;
    player.y = canvas.height - 140;
    player.dx = 0;
    player.invul = 0;
    enemies = [];
    enemySpawnTimer = 0;
    score = 0;
    coin.x = canvas.width / 2;
    coin.y = canvas.height - 120;
    coin.taken = false;
    walkFrame = 0;
    walkFrameTick = 0;
    gameOver = false;
    updateUI();
    gameLoop();
  }
});

// Reset posisi dan ukuran saat resize
window.addEventListener('resize', () => {
  // Jaga player dan coin tetap di area layar
  if (player.x > window.innerWidth - player.w) player.x = window.innerWidth - player.w;
  if (coin.x > window.innerWidth - 60) coin.x = window.innerWidth / 2;
  player.y = window.innerHeight - 140;
  coin.y = window.innerHeight - 120;
  player.groundY = canvas.height - 140;
  if (!player.jumping) player.y = player.groundY;
  coin.y = canvas.height - 120;
});

// Inisialisasi posisi player & coin
player.x = canvas.width / 2 - player.w / 2;
player.y = canvas.height - 140;
coin.x = canvas.width / 2;
coin.y = canvas.height - 120;

updateUI();
gameLoop();