const frontPage = document.getElementById('frontPage');
const gameSection = document.getElementById('gameSection');
const launchGameBtn = document.getElementById('launchGameBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const introHighScore = document.getElementById('introHighScore');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const startBtn = document.getElementById('startBtn');
const soundToggle = document.getElementById('soundToggle');

// Ground level baseline
const GROUND_Y = 215;

// Game State
let gameState = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER'
let score = 0;
let highScore = parseInt(localStorage.getItem('dino_high_score') || '0', 10);
let gameSpeed = 6;
let frameCount = 0;
let nextSpawnTimer = 0;

// High score refresh for front page
function refreshIntroHighScore() {
  if (introHighScore) {
    introHighScore.textContent = String(highScore).padStart(5, '0');
  }
}
refreshIntroHighScore();

// Navigation between Front Page and Game
launchGameBtn.addEventListener('click', () => {
  frontPage.classList.add('hidden');
  gameSection.classList.remove('hidden');
  sounds.init();
  startGame();
});

backToHomeBtn.addEventListener('click', () => {
  gameState = 'START';
  isNight = false;
  document.body.classList.remove('night-mode');
  gameSection.classList.add('hidden');
  frontPage.classList.remove('hidden');
  refreshIntroHighScore();
});

// Sound toggle button listener
soundToggle.addEventListener('click', () => {
  const isEnabled = sounds.toggle();
  soundToggle.textContent = isEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
});

// Current Character ('dino' | 'ninja' | 'robot' | 'cat')
let currentChar = localStorage.getItem('dino_char') || 'dino';

const charCards = document.querySelectorAll('.char-card');
const gameCharSelect = document.getElementById('gameCharSelect');

function setCharacter(character) {
  currentChar = character;
  localStorage.setItem('dino_char', character);

  // Sync front page character cards
  charCards.forEach(card => {
    card.classList.toggle('active', card.dataset.char === character);
  });

  // Sync in-game character dropdown
  if (gameCharSelect) {
    gameCharSelect.value = character;
  }
}

// Initial character sync
setCharacter(currentChar);

charCards.forEach(card => {
  card.addEventListener('click', () => {
    setCharacter(card.dataset.char);
  });
});

if (gameCharSelect) {
  gameCharSelect.addEventListener('change', (e) => {
    setCharacter(e.target.value);
  });
}

// Current Theme ('desert' | 'cyberpunk' | 'jungle' | 'volcano')
let currentTheme = localStorage.getItem('dino_theme') || 'desert';

const themeButtons = document.querySelectorAll('.theme-btn');
const gameThemeSelect = document.getElementById('gameThemeSelect');

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('dino_theme', theme);

  // Sync front page buttons
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  // Sync in-game dropdown
  if (gameThemeSelect) {
    gameThemeSelect.value = theme;
  }
}

// Initial theme sync
setTheme(currentTheme);

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setTheme(btn.dataset.theme);
  });
});

if (gameThemeSelect) {
  gameThemeSelect.addEventListener('change', (e) => {
    setTheme(e.target.value);
  });
}

// Day / Night cycle (transitions every 700 points)
let isNight = false;
function updateDayNightCycle() {
  const cyclePeriod = 700;
  const currentCycle = Math.floor(score / cyclePeriod);
  const shouldBeNight = currentCycle % 2 === 1;

  if (shouldBeNight !== isNight) {
    isNight = shouldBeNight;
    if (isNight) {
      document.body.classList.add('night-mode');
    } else {
      document.body.classList.remove('night-mode');
    }
  }
}

// Environment Theme configurations
const THEME_CONFIGS = {
  desert: {
    dayBg: '#f7f7f7',
    nightBg: '#202124',
    dayFg: '#535353',
    nightFg: '#e8eaed',
    dayClouds: '#c7c7c7',
    nightClouds: '#484b51',
    groundDetail: 'pebbles'
  },
  cyberpunk: {
    dayBg: '#0f051d',
    nightBg: '#05010b',
    dayFg: '#00ffcc',
    nightFg: '#ff007f',
    dayClouds: '#4d1979',
    nightClouds: '#240b3b',
    groundDetail: 'grid'
  },
  jungle: {
    dayBg: '#e8f5e9',
    nightBg: '#1b2e1e',
    dayFg: '#2e7d32',
    nightFg: '#a5d6a7',
    dayClouds: '#c8e6c9',
    nightClouds: '#335e38',
    groundDetail: 'vines'
  },
  volcano: {
    dayBg: '#2b1b17',
    nightBg: '#160a08',
    dayFg: '#ff5722',
    nightFg: '#ffb74d',
    dayClouds: '#5c3826',
    nightClouds: '#331a0e',
    groundDetail: 'cracks'
  }
};

function getGameColors() {
  const cfg = THEME_CONFIGS[currentTheme] || THEME_CONFIGS.desert;
  return {
    foreground: isNight ? cfg.nightFg : cfg.dayFg,
    background: isNight ? cfg.nightBg : cfg.dayBg,
    clouds: isNight ? cfg.nightClouds : cfg.dayClouds
  };
}

// Clouds & Horizon Bumps
let clouds = [
  { x: 200, y: 50, speed: 0.6 },
  { x: 500, y: 35, speed: 0.4 },
  { x: 750, y: 65, speed: 0.5 }
];

let groundBumps = [
  { x: 100 }, { x: 300 }, { x: 450 }, { x: 680 }, { x: 820 }
];

// Obstacles array
let obstacles = [];

// Dino Player Object
const dino = {
  x: 50,
  y: GROUND_Y - 44,
  baseY: GROUND_Y - 44,
  width: 40,
  height: 44,
  vy: 0,
  gravity: 0.85,
  jumpStrength: -13.5,
  isGrounded: true,
  isDucking: false,
  legState: 0,

  reset() {
    this.x = 50;
    this.y = this.baseY;
    this.vy = 0;
    this.isGrounded = true;
    this.isDucking = false;
    this.width = 40;
    this.height = 44;
  },

  jump() {
    if (this.isGrounded && !this.isDucking) {
      this.vy = this.jumpStrength;
      this.isGrounded = false;
      sounds.playJump();
    }
  },

  duck(state) {
    if (!this.isGrounded) return; // Ducking only while on ground
    this.isDucking = state;
    if (state) {
      this.height = 26;
      this.width = 54;
      this.y = GROUND_Y - this.height;
    } else {
      this.height = 44;
      this.width = 40;
      this.y = GROUND_Y - this.height;
    }
  },

  update() {
    // Jump physics
    if (!this.isGrounded) {
      this.vy += this.gravity;
      this.y += this.vy;

      if (this.y >= this.baseY) {
        this.y = this.baseY;
        this.vy = 0;
        this.isGrounded = true;
      }
    }

    // Footstep animation toggle
    if (frameCount % 6 === 0) {
      this.legState = 1 - this.legState;
    }
  },

  draw() {
    const colors = getGameColors();
    ctx.fillStyle = colors.foreground;

    // ==========================================
    // 1. NINJA CHARACTER
    // ==========================================
    if (currentChar === 'ninja') {
      if (this.isDucking) {
        // Ninja Slide
        // Torso / Legs sliding flat
        ctx.fillRect(this.x + 4, this.y + 12, 42, 12);
        // Head / Mask
        ctx.fillRect(this.x + 36, this.y + 8, 14, 12);
        // Headband trailing cloth
        ctx.fillRect(this.x - 2, this.y + 8, 8, 3);
        ctx.fillRect(this.x - 6, this.y + 6, 6, 3);
        // Mask eye slot
        ctx.fillStyle = colors.background;
        ctx.fillRect(this.x + 42, this.y + 10, 4, 2);
        ctx.fillStyle = colors.foreground;
        return;
      }

      // Standing / Running Ninja
      // Head & Mask
      ctx.fillRect(this.x + 14, this.y, 16, 16);
      // Headband knot & flowing ribbons
      ctx.fillRect(this.x + 12, this.y + 4, 4, 4);
      ctx.fillRect(this.x + 4, this.y + 2, 8, 3);
      ctx.fillRect(this.x, this.y + 5, 6, 3);
      // Visor / Eyes cut
      ctx.fillStyle = colors.background;
      ctx.fillRect(this.x + 22, this.y + 5, 6, 3);
      ctx.fillStyle = colors.foreground;

      // Body / Gi
      ctx.fillRect(this.x + 10, this.y + 16, 18, 16);
      // Belt / Sash
      ctx.fillRect(this.x + 8, this.y + 24, 22, 3);

      // Katana sheath angled on back
      ctx.fillRect(this.x + 4, this.y + 12, 6, 4);
      ctx.fillRect(this.x + 2, this.y + 8, 4, 4);

      // Running / Jumping Legs
      if (!this.isGrounded) {
        // Aerial kick pose
        ctx.fillRect(this.x + 12, this.y + 32, 5, 8);
        ctx.fillRect(this.x + 24, this.y + 28, 12, 5); // extended flying kick
      } else {
        if (this.legState === 0) {
          ctx.fillRect(this.x + 10, this.y + 32, 5, 12);
          ctx.fillRect(this.x + 20, this.y + 32, 6, 6);
        } else {
          ctx.fillRect(this.x + 10, this.y + 32, 6, 6);
          ctx.fillRect(this.x + 20, this.y + 32, 5, 12);
        }
      }
      return;
    }

    // ==========================================
    // 2. ROBOT / CYBER MECH CHARACTER
    // ==========================================
    if (currentChar === 'robot') {
      if (this.isDucking) {
        // Compacted Mech Tank mode
        ctx.fillRect(this.x + 4, this.y + 8, 44, 16);
        // Antenna
        ctx.fillRect(this.x + 42, this.y + 2, 2, 6);
        // Eye visor bar
        ctx.fillStyle = colors.background;
        ctx.fillRect(this.x + 36, this.y + 12, 10, 4);
        ctx.fillStyle = colors.foreground;
        // Tread wheels
        ctx.fillRect(this.x + 6, this.y + 22, 40, 4);
        return;
      }

      // Antenna
      ctx.fillRect(this.x + 22, this.y - 4, 3, 5);
      ctx.fillRect(this.x + 20, this.y - 6, 7, 3);
      // Square Robot Head
      ctx.fillRect(this.x + 14, this.y, 18, 15);
      // Digital visor
      ctx.fillStyle = colors.background;
      ctx.fillRect(this.x + 22, this.y + 4, 8, 4);
      ctx.fillStyle = colors.foreground;

      // Neck & Boxy Chest
      ctx.fillRect(this.x + 20, this.y + 15, 6, 2);
      ctx.fillRect(this.x + 10, this.y + 17, 22, 15);
      // Chest core meter
      ctx.fillStyle = colors.background;
      ctx.fillRect(this.x + 16, this.y + 21, 10, 4);
      ctx.fillStyle = colors.foreground;

      // Piston Arms
      ctx.fillRect(this.x + 6, this.y + 19, 4, 10);
      ctx.fillRect(this.x + 32, this.y + 21, 4, 8);

      // Hydraulic Legs
      if (!this.isGrounded) {
        // Rocket thruster flames under feet
        ctx.fillRect(this.x + 12, this.y + 32, 6, 6);
        ctx.fillRect(this.x + 22, this.y + 32, 6, 6);
        ctx.fillRect(this.x + 14, this.y + 38, 3, 5);
        ctx.fillRect(this.x + 24, this.y + 38, 3, 5);
      } else {
        if (this.legState === 0) {
          ctx.fillRect(this.x + 12, this.y + 32, 5, 12);
          ctx.fillRect(this.x + 10, this.y + 41, 8, 3);
          ctx.fillRect(this.x + 22, this.y + 32, 5, 6);
        } else {
          ctx.fillRect(this.x + 12, this.y + 32, 5, 6);
          ctx.fillRect(this.x + 22, this.y + 32, 5, 12);
          ctx.fillRect(this.x + 20, this.y + 41, 8, 3);
        }
      }
      return;
    }

    // ==========================================
    // 3. PIXEL CAT CHARACTER
    // ==========================================
    if (currentChar === 'cat') {
      if (this.isDucking) {
        // Low Cat Stalking / Pouncing
        // Cat body low
        ctx.fillRect(this.x + 6, this.y + 10, 36, 12);
        // Cat Head
        ctx.fillRect(this.x + 32, this.y + 4, 16, 14);
        // Pointy ears
        ctx.fillRect(this.x + 34, this.y, 4, 5);
        ctx.fillRect(this.x + 42, this.y, 4, 5);
        // Eye
        ctx.fillStyle = colors.background;
        ctx.fillRect(this.x + 40, this.y + 7, 3, 3);
        ctx.fillStyle = colors.foreground;
        // Tail curling back
        ctx.fillRect(this.x, this.y + 8, 6, 4);
        ctx.fillRect(this.x - 2, this.y + 4, 4, 5);
        // Tiny paws
        ctx.fillRect(this.x + 10, this.y + 22, 6, 4);
        ctx.fillRect(this.x + 28, this.y + 22, 6, 4);
        return;
      }

      // Cat Head & Pointy Ears
      ctx.fillRect(this.x + 18, this.y + 2, 18, 14);
      ctx.fillRect(this.x + 20, this.y - 3, 4, 6);
      ctx.fillRect(this.x + 28, this.y - 3, 4, 6);

      // Eye
      ctx.fillStyle = colors.background;
      ctx.fillRect(this.x + 28, this.y + 5, 3, 3);
      ctx.fillStyle = colors.foreground;

      // Body & Arch
      ctx.fillRect(this.x + 8, this.y + 14, 20, 16);

      // Curly Upright Tail
      ctx.fillRect(this.x + 4, this.y + 14, 4, 5);
      ctx.fillRect(this.x + 1, this.y + 8, 4, 7);
      ctx.fillRect(this.x + 3, this.y + 4, 4, 4);

      // Legs
      if (!this.isGrounded) {
        // Stretched leaping cat paws
        ctx.fillRect(this.x + 6, this.y + 30, 5, 8);
        ctx.fillRect(this.x + 24, this.y + 30, 5, 8);
      } else {
        if (this.legState === 0) {
          ctx.fillRect(this.x + 8, this.y + 30, 4, 14);
          ctx.fillRect(this.x + 20, this.y + 30, 4, 7);
        } else {
          ctx.fillRect(this.x + 8, this.y + 30, 4, 7);
          ctx.fillRect(this.x + 20, this.y + 30, 4, 14);
        }
      }
      return;
    }

    // ==========================================
    // 4. CLASSIC T-REX DINO (DEFAULT)
    // ==========================================
    if (this.isDucking) {
      // Ducking Dino
      // Body
      ctx.fillRect(this.x, this.y + 8, 45, 14);
      // Head
      ctx.fillRect(this.x + 35, this.y + 4, 18, 12);
      // Eye (cutout)
      ctx.fillStyle = colors.background;
      ctx.fillRect(this.x + 46, this.y + 6, 2, 2);
      ctx.fillStyle = colors.foreground;
      // Tail
      ctx.fillRect(this.x - 4, this.y + 6, 6, 6);
      // Legs
      if (this.legState === 0) {
        ctx.fillRect(this.x + 12, this.y + 22, 4, 4);
        ctx.fillRect(this.x + 28, this.y + 22, 7, 4);
      } else {
        ctx.fillRect(this.x + 12, this.y + 22, 7, 4);
        ctx.fillRect(this.x + 28, this.y + 22, 4, 4);
      }
      return;
    }

    // Standard Standing / Running Dino
    // Head & Snout
    ctx.fillRect(this.x + 20, this.y, 20, 16);
    ctx.fillRect(this.x + 14, this.y + 4, 10, 12);

    // Eye
    ctx.fillStyle = colors.background;
    ctx.fillRect(this.x + 24, this.y + 3, 3, 3);
    ctx.fillStyle = colors.foreground;

    // Jaw / Mouth
    ctx.fillRect(this.x + 28, this.y + 12, 12, 3);

    // Neck & Body
    ctx.fillRect(this.x + 10, this.y + 14, 15, 18);
    ctx.fillRect(this.x + 4, this.y + 18, 16, 14);

    // Little front arms
    ctx.fillRect(this.x + 24, this.y + 20, 6, 3);
    ctx.fillRect(this.x + 28, this.y + 23, 2, 3);

    // Tail
    ctx.fillRect(this.x - 2, this.y + 16, 6, 6);
    ctx.fillRect(this.x - 6, this.y + 20, 4, 4);

    // Legs
    if (!this.isGrounded) {
      // In air - feet together
      ctx.fillRect(this.x + 10, this.y + 32, 4, 8);
      ctx.fillRect(this.x + 18, this.y + 32, 4, 8);
      ctx.fillRect(this.x + 10, this.y + 40, 6, 3);
      ctx.fillRect(this.x + 18, this.y + 40, 6, 3);
    } else {
      // Running legs
      if (this.legState === 0) {
        ctx.fillRect(this.x + 10, this.y + 32, 4, 10);
        ctx.fillRect(this.x + 10, this.y + 41, 6, 3);
        ctx.fillRect(this.x + 18, this.y + 32, 4, 5);
      } else {
        ctx.fillRect(this.x + 10, this.y + 32, 4, 5);
        ctx.fillRect(this.x + 18, this.y + 32, 4, 10);
        ctx.fillRect(this.x + 18, this.y + 41, 6, 3);
      }
    }
  }
};

// Spawn an obstacle
function spawnObstacle() {
  const rand = Math.random();

  // Low flying pterodactyl unlocks after score 180
  if (score > 180 && rand < 0.3) {
    const isHigh = Math.random() < 0.5;
    // High bird requires ducking or can be walked under; low bird requires jumping
    const yPos = isHigh ? GROUND_Y - 48 : GROUND_Y - 26;
    obstacles.push({
      type: 'bird',
      x: canvas.width + 20,
      y: yPos,
      width: 38,
      height: 24,
      wingState: 0
    });
  } else {
    // Cactus (small single, double, or tall)
    const cactusType = Math.floor(Math.random() * 3);
    if (cactusType === 0) {
      // Single small
      obstacles.push({
        type: 'cactus',
        x: canvas.width + 20,
        y: GROUND_Y - 32,
        width: 16,
        height: 32,
        kind: 'small'
      });
    } else if (cactusType === 1) {
      // Double small
      obstacles.push({
        type: 'cactus',
        x: canvas.width + 20,
        y: GROUND_Y - 32,
        width: 32,
        height: 32,
        kind: 'double'
      });
    } else {
      // Tall cactus
      obstacles.push({
        type: 'cactus',
        x: canvas.width + 20,
        y: GROUND_Y - 46,
        width: 22,
        height: 46,
        kind: 'tall'
      });
    }
  }

  // Schedule next obstacle
  const minInterval = Math.max(55, 110 - Math.floor(gameSpeed * 3));
  const maxInterval = minInterval + 60;
  nextSpawnTimer = Math.floor(minInterval + Math.random() * (maxInterval - minInterval));
}

// Draw Cactus
function drawCactus(ob) {
  const colors = getGameColors();
  ctx.fillStyle = colors.foreground;
  if (ob.kind === 'small') {
    // Main trunk
    ctx.fillRect(ob.x + 5, ob.y, 6, ob.height);
    // Arms
    ctx.fillRect(ob.x, ob.y + 8, 5, 4);
    ctx.fillRect(ob.x, ob.y + 4, 3, 6);
    ctx.fillRect(ob.x + 11, ob.y + 12, 5, 4);
    ctx.fillRect(ob.x + 13, ob.y + 8, 3, 6);
  } else if (ob.kind === 'double') {
    // Two mini cacti
    ctx.fillRect(ob.x + 4, ob.y, 6, ob.height);
    ctx.fillRect(ob.x, ob.y + 6, 4, 4);
    ctx.fillRect(ob.x + 18, ob.y + 4, 6, ob.height - 4);
    ctx.fillRect(ob.x + 24, ob.y + 10, 4, 4);
  } else {
    // Large tall cactus
    ctx.fillRect(ob.x + 7, ob.y, 8, ob.height);
    ctx.fillRect(ob.x, ob.y + 12, 8, 5);
    ctx.fillRect(ob.x, ob.y + 6, 4, 8);
    ctx.fillRect(ob.x + 15, ob.y + 16, 7, 5);
    ctx.fillRect(ob.x + 18, ob.y + 10, 4, 8);
  }
}

// Draw Pterodactyl Bird
function drawBird(ob) {
  const colors = getGameColors();
  ctx.fillStyle = colors.foreground;
  // Body & Beak
  ctx.fillRect(ob.x + 6, ob.y + 8, 20, 8);
  ctx.fillRect(ob.x, ob.y + 9, 8, 4); // beak
  ctx.fillRect(ob.x + 26, ob.y + 10, 8, 4); // tail

  if (Math.floor(frameCount / 10) % 2 === 0) {
    // Wing UP
    ctx.fillRect(ob.x + 12, ob.y - 2, 7, 10);
    ctx.fillRect(ob.x + 15, ob.y - 8, 5, 7);
  } else {
    // Wing DOWN
    ctx.fillRect(ob.x + 12, ob.y + 12, 7, 10);
    ctx.fillRect(ob.x + 15, ob.y + 18, 5, 6);
  }
}

// Draw Background Environment scenery & details based on selected Theme
function drawThemeScenery(colors) {
  if (currentTheme === 'cyberpunk') {
    // Distant Neon Grid & Cyberpunk Skyscrapers
    ctx.fillStyle = isNight ? '#160829' : '#271145';
    // City Skyline silouhette
    const buildings = [
      { x: 30, w: 45, h: 90 }, { x: 80, w: 35, h: 120 }, { x: 120, w: 55, h: 70 },
      { x: 190, w: 40, h: 110 }, { x: 250, w: 60, h: 140 }, { x: 320, w: 35, h: 80 },
      { x: 370, w: 50, h: 115 }, { x: 440, w: 70, h: 130 }, { x: 530, w: 40, h: 75 },
      { x: 580, w: 55, h: 125 }, { x: 650, w: 45, h: 95 }, { x: 710, w: 65, h: 135 }
    ];
    for (let b of buildings) {
      ctx.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
      // Cyber window dots
      ctx.fillStyle = colors.clouds;
      for (let wy = GROUND_Y - b.h + 10; wy < GROUND_Y - 10; wy += 18) {
        ctx.fillRect(b.x + 8, wy, 4, 6);
        if (b.w > 40) ctx.fillRect(b.x + 22, wy, 4, 6);
      }
      ctx.fillStyle = isNight ? '#160829' : '#271145';
    }
  } else if (currentTheme === 'jungle') {
    // Distant Ancient Jungle Trees & Canopy
    ctx.fillStyle = isNight ? '#0e1f11' : '#c8e6c9';
    // Back canopies
    for (let tx = 10; tx < canvas.width + 50; tx += 90) {
      ctx.fillRect(tx, GROUND_Y - 70, 60, 50);
      ctx.fillRect(tx + 12, GROUND_Y - 95, 36, 25);
    }
  } else if (currentTheme === 'volcano') {
    // Distant Smoldering Volcano Peaks
    ctx.fillStyle = isNight ? '#220d0a' : '#452219';
    // Volcano 1
    ctx.beginPath();
    ctx.moveTo(100, GROUND_Y);
    ctx.lineTo(210, GROUND_Y - 110);
    ctx.lineTo(240, GROUND_Y - 110);
    ctx.lineTo(350, GROUND_Y);
    ctx.fill();
    // Lava glow at top
    ctx.fillStyle = colors.foreground;
    ctx.fillRect(210, GROUND_Y - 110, 30, 4);

    // Volcano 2
    ctx.fillStyle = isNight ? '#220d0a' : '#452219';
    ctx.beginPath();
    ctx.moveTo(480, GROUND_Y);
    ctx.lineTo(580, GROUND_Y - 90);
    ctx.lineTo(605, GROUND_Y - 90);
    ctx.lineTo(710, GROUND_Y);
    ctx.fill();
    ctx.fillStyle = colors.foreground;
    ctx.fillRect(580, GROUND_Y - 90, 25, 4);
  }
}

// Draw Horizon and Ground marks
function drawGround() {
  const colors = getGameColors();

  // Background Scenery
  drawThemeScenery(colors);

  // Ground horizontal line
  ctx.fillStyle = colors.foreground;
  ctx.fillRect(0, GROUND_Y, canvas.width, 2);

  // Moving ground pebbles / markings / grid lines
  const cfg = THEME_CONFIGS[currentTheme] || THEME_CONFIGS.desert;
  for (let b of groundBumps) {
    if (cfg.groundDetail === 'grid') {
      // Neon Cyberpunk perspective lines
      ctx.fillRect(b.x, GROUND_Y + 4, 16, 2);
      ctx.fillRect(b.x + 8, GROUND_Y + 12, 24, 2);
    } else if (cfg.groundDetail === 'vines') {
      // Jungle grass tufts
      ctx.fillRect(b.x, GROUND_Y + 4, 6, 4);
      ctx.fillRect(b.x + 8, GROUND_Y + 2, 4, 6);
    } else if (cfg.groundDetail === 'cracks') {
      // Magma cracks
      ctx.fillRect(b.x, GROUND_Y + 6, 12, 3);
      ctx.fillRect(b.x + 10, GROUND_Y + 11, 8, 3);
    } else {
      // Classic pebbles
      ctx.fillRect(b.x, GROUND_Y + 5, 8, 2);
      ctx.fillRect(b.x + 15, GROUND_Y + 9, 5, 2);
    }

    b.x -= gameSpeed;
    if (b.x < -40) {
      b.x = canvas.width + Math.random() * 50;
    }
  }

  // Night Mode celestial body (Moon or Cyber Synth Sun)
  if (isNight || currentTheme === 'cyberpunk' || currentTheme === 'volcano') {
    if (currentTheme === 'cyberpunk') {
      // Glowing Synthwave Sun
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(660, 25, 36, 36);
      ctx.fillStyle = colors.background;
      ctx.fillRect(655, 38, 46, 3);
      ctx.fillRect(655, 46, 46, 4);
      ctx.fillRect(655, 54, 46, 5);
    } else if (currentTheme === 'volcano') {
      // Ash Red Blood Moon
      ctx.fillStyle = '#ff3d00';
      ctx.fillRect(670, 30, 24, 24);
    } else {
      // Classic Crescent Moon
      ctx.fillStyle = '#f1f3f4';
      ctx.fillRect(680, 35, 18, 18);
      ctx.fillStyle = colors.background;
      ctx.fillRect(685, 31, 14, 18);
    }
  }

  // Floating Clouds / Smoke / Smog
  ctx.fillStyle = colors.clouds;
  for (let c of clouds) {
    ctx.fillRect(c.x, c.y, 35, 8);
    ctx.fillRect(c.x + 8, c.y - 6, 20, 6);
    ctx.fillRect(c.x + 14, c.y - 10, 12, 4);
    c.x -= c.speed;
    if (c.x < -60) {
      c.x = canvas.width + Math.random() * 80;
      c.y = 30 + Math.random() * 50;
    }
  }
}

// Score display
function drawScore() {
  const colors = getGameColors();
  ctx.fillStyle = colors.foreground;
  ctx.font = 'bold 16px "Courier New", Courier, monospace';
  ctx.textAlign = 'right';

  const scoreStr = String(Math.floor(score)).padStart(5, '0');
  const hiScoreStr = String(highScore).padStart(5, '0');

  ctx.fillText(`HI ${hiScoreStr}  ${scoreStr}`, canvas.width - 20, 28);
}

// Collision detection with a slight forgiving hit box margin
function checkCollision(player, ob) {
  const pPadX = 6;
  const pPadY = 4;
  const oPad = 4;

  const pLeft = player.x + pPadX;
  const pRight = player.x + player.width - pPadX;
  const pTop = player.y + pPadY;
  const pBottom = player.y + player.height;

  const oLeft = ob.x + oPad;
  const oRight = ob.x + ob.width - oPad;
  const oTop = ob.y + oPad;
  const oBottom = ob.y + ob.height;

  return (
    pRight > oLeft &&
    pLeft < oRight &&
    pBottom > oTop &&
    pTop < oBottom
  );
}

// Start Game
function startGame() {
  gameState = 'PLAYING';
  score = 0;
  gameSpeed = 6;
  frameCount = 0;
  obstacles = [];
  nextSpawnTimer = 60;
  isNight = false;
  document.body.classList.remove('night-mode');
  dino.reset();
  overlay.classList.add('hidden');
}

// Game Over
function gameOver() {
  gameState = 'GAMEOVER';
  sounds.playHit();

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('dino_high_score', highScore);
    refreshIntroHighScore();
  }

  overlayTitle.textContent = 'G A M E   O V E R';
  overlaySubtitle.textContent = `Score: ${Math.floor(score)} | Best: ${highScore}`;
  startBtn.textContent = 'PLAY AGAIN';
  overlay.classList.remove('hidden');
}

// Main Game Loop
function gameLoop() {
  const colors = getGameColors();

  // Fill canvas with theme background color
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Always draw environment
  drawGround();

  if (gameState === 'PLAYING') {
    frameCount++;
    score += 0.15;
    updateDayNightCycle();

    // Score Milestone sound every 100 points
    const currentScore = Math.floor(score);
    if (currentScore > 0 && currentScore % 100 === 0 && Math.floor(score - 0.15) !== currentScore) {
      sounds.playScoreMilestone();
    }

    // Gradually accelerate
    if (frameCount % 450 === 0 && gameSpeed < 14) {
      gameSpeed += 0.4;
    }

    // Obstacle spawn countdown
    nextSpawnTimer--;
    if (nextSpawnTimer <= 0) {
      spawnObstacle();
    }

    // Update & draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= gameSpeed;

      if (ob.type === 'cactus') {
        drawCactus(ob);
      } else {
        drawBird(ob);
      }

      // Check collision
      if (checkCollision(dino, ob)) {
        gameOver();
        break;
      }

      // Clean offscreen obstacles
      if (ob.x < -50) {
        obstacles.splice(i, 1);
      }
    }

    dino.update();
  }

  // Draw Dino
  dino.draw();
  drawScore();

  requestAnimationFrame(gameLoop);
}

// Keyboard controls
window.addEventListener('keydown', (e) => {
  // If we are on the front page, pressing Space or Enter starts the game
  if (!frontPage.classList.contains('hidden')) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      launchGameBtn.click();
    }
    return;
  }

  // Jump: Space or ArrowUp
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (gameState === 'PLAYING') {
      dino.jump();
    } else {
      startGame();
    }
  }

  // Duck: ArrowDown
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (gameState === 'PLAYING') {
      dino.duck(true);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dino.duck(false);
  }
});

// Mobile Touch & Button Clicks
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startGame();
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState === 'PLAYING') {
    dino.jump();
  } else {
    startGame();
  }
}, { passive: false });

// Start animation loop
requestAnimationFrame(gameLoop);

