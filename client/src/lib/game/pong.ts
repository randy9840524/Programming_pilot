// Pong game core logic
export const createPongGame = () => `
  // Initialize canvas and context
  const canvas = document.getElementById('pongCanvas');
  const ctx = canvas.getContext('2d');

  // Game constants
  const PADDLE_SPEED = 5;
  const BALL_SPEED = 5;
  const PADDLE_WIDTH = 10;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 10;
  const POWERUP_SIZE = 20;
  const POWERUP_DURATION = 5000; // 5 seconds

  // Sound effects (using AudioContext)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playSound(frequency, duration) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  }

  // Game state
  const game = {
    running: true,
    ball: {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: BALL_SPEED,
      dy: BALL_SPEED,
      trail: []
    },
    leftPaddle: {
      y: canvas.height / 2 - PADDLE_HEIGHT / 2,
      score: 0,
      height: PADDLE_HEIGHT
    },
    rightPaddle: {
      y: canvas.height / 2 - PADDLE_HEIGHT / 2,
      score: 0,
      height: PADDLE_HEIGHT
    },
    keys: {
      up: false,
      down: false
    },
    powerUps: [],
    particles: []
  };

  // Event listeners for paddle movement
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') game.keys.up = true;
    if (e.key === 'ArrowDown') game.keys.down = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') game.keys.up = false;
    if (e.key === 'ArrowDown') game.keys.down = false;
  });

  function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      game.particles.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 10,
        dy: (Math.random() - 0.5) * 10,
        radius: Math.random() * 3,
        color,
        life: 1
      });
    }
  }

  function updateParticles() {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.dx;
      p.y += p.dy;
      p.life -= 0.02;
      if (p.life <= 0) {
        game.particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    game.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  function spawnPowerUp() {
    if (Math.random() < 0.005 && game.powerUps.length < 3) {
      game.powerUps.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: Math.random() * (canvas.height - POWERUP_SIZE),
        type: Math.random() < 0.5 ? 'speed' : 'size'
      });
    }
  }

  function resetBall() {
    game.ball.x = canvas.width / 2;
    game.ball.y = canvas.height / 2;
    game.ball.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    game.ball.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    game.ball.trail = [];
    playSound(220, 0.3); // Score sound
  }

  function resetPowerUps() {
    setTimeout(() => {
      game.leftPaddle.height = PADDLE_HEIGHT;
      game.rightPaddle.height = PADDLE_HEIGHT;
      game.ball.dx = game.ball.dx > 0 ? BALL_SPEED : -BALL_SPEED;
      game.ball.dy = game.ball.dy > 0 ? BALL_SPEED : -BALL_SPEED;
    }, POWERUP_DURATION);
  }

  // Main game loop
  function gameLoop() {
    // Update ball trail
    game.ball.trail.push({ x: game.ball.x, y: game.ball.y });
    if (game.ball.trail.length > 5) game.ball.trail.shift();

    // Move paddles
    if (game.keys.up && game.rightPaddle.y > 0) {
      game.rightPaddle.y -= PADDLE_SPEED;
    }
    if (game.keys.down && game.rightPaddle.y < canvas.height - game.rightPaddle.height) {
      game.rightPaddle.y += PADDLE_SPEED;
    }

    // Simple AI for left paddle
    const paddleCenter = game.leftPaddle.y + game.leftPaddle.height / 2;
    if (paddleCenter < game.ball.y - 35) {
      game.leftPaddle.y += PADDLE_SPEED - 2;
    }
    if (paddleCenter > game.ball.y + 35) {
      game.leftPaddle.y -= PADDLE_SPEED - 2;
    }

    // Move ball
    game.ball.x += game.ball.dx;
    game.ball.y += game.ball.dy;

    // Ball collision with top and bottom
    if (game.ball.y <= 0 || game.ball.y >= canvas.height) {
      game.ball.dy *= -1;
      createParticles(game.ball.x, game.ball.y, '#fff');
      playSound(440, 0.1); // Wall hit sound
    }

    // Ball collision with paddles
    if (game.ball.x <= PADDLE_WIDTH &&
        game.ball.y >= game.leftPaddle.y &&
        game.ball.y <= game.leftPaddle.y + game.leftPaddle.height) {
      game.ball.dx = Math.abs(game.ball.dx);
      createParticles(game.ball.x, game.ball.y, '#0f0');
      playSound(660, 0.1); // Paddle hit sound
    }

    if (game.ball.x >= canvas.width - PADDLE_WIDTH - BALL_SIZE &&
        game.ball.y >= game.rightPaddle.y &&
        game.ball.y <= game.rightPaddle.y + game.rightPaddle.height) {
      game.ball.dx = -Math.abs(game.ball.dx);
      createParticles(game.ball.x, game.ball.y, '#0f0');
      playSound(660, 0.1); // Paddle hit sound
    }

    // Power-up collision
    for (let i = game.powerUps.length - 1; i >= 0; i--) {
      const powerUp = game.powerUps[i];
      if (Math.hypot(game.ball.x - powerUp.x, game.ball.y - powerUp.y) < POWERUP_SIZE) {
        if (powerUp.type === 'size') {
          const paddle = game.ball.dx > 0 ? game.rightPaddle : game.leftPaddle;
          paddle.height = PADDLE_HEIGHT * 1.5;
        } else {
          game.ball.dx *= 1.5;
          game.ball.dy *= 1.5;
        }
        game.powerUps.splice(i, 1);
        createParticles(powerUp.x, powerUp.y, '#ff0');
        playSound(880, 0.2); // Power-up sound
        resetPowerUps();
      }
    }

    // Score points
    if (game.ball.x <= 0) {
      game.rightPaddle.score++;
      resetBall();
    } else if (game.ball.x >= canvas.width) {
      game.leftPaddle.score++;
      resetBall();
    }

    // Spawn power-ups
    spawnPowerUp();

    // Update particles
    updateParticles();

    // Draw everything
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ball trail
    game.ball.trail.forEach((pos, i) => {
      const alpha = i / game.ball.trail.length;
      ctx.fillStyle = "rgba(255, 255, 255, " + (alpha * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, BALL_SIZE - 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw paddles with gradient
    const paddleGradient = ctx.createLinearGradient(0, 0, PADDLE_WIDTH, 0);
    paddleGradient.addColorStop(0, '#fff');
    paddleGradient.addColorStop(1, '#888');

    ctx.fillStyle = paddleGradient;
    ctx.fillRect(0, game.leftPaddle.y, PADDLE_WIDTH, game.leftPaddle.height);
    ctx.fillRect(canvas.width - PADDLE_WIDTH, game.rightPaddle.y, PADDLE_WIDTH, game.rightPaddle.height);

    // Draw ball with glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw power-ups
    game.powerUps.forEach(powerUp => {
      const gradient = ctx.createRadialGradient(
        powerUp.x, powerUp.y, 0,
        powerUp.x, powerUp.y, POWERUP_SIZE
      );
      gradient.addColorStop(0, powerUp.type === 'speed' ? '#f00' : '#0f0');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(powerUp.x, powerUp.y, POWERUP_SIZE, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw particles
    drawParticles();

    // Draw scores with glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(game.leftPaddle.score, canvas.width * 0.25, 50);
    ctx.fillText(game.rightPaddle.score, canvas.width * 0.75, 50);
    ctx.shadowBlur = 0;

    // Continue game loop
    requestAnimationFrame(gameLoop);
  }

  // Start the game
  gameLoop();
`;