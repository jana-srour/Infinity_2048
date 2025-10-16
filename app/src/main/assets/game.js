// ==== Variables and Setup ====

const container = document.getElementById('game-container');
const particlesContainer = document.getElementById('particles-container');

const scoreDisplay = document.getElementById('score');
const levelNumDisplay = document.getElementById('level-num');
const targetTileDisplay = document.getElementById('target-tile');

const message = document.getElementById('message');
const messageText = document.getElementById('message-text');
const nextLevelBtn = document.getElementById('next-level-btn');
const restartBtn = document.getElementById('restart-btn');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const levelsList = document.getElementById('levels-list');

const themeSelect = document.getElementById('theme-select'); // inside modal
const darkToggle = document.getElementById('dark-toggle');
const muteBtn = document.getElementById('mute-btn');

const undoBtn = document.getElementById('undo-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const mergeAnyBtn = document.getElementById('merge-any-btn');
const bigTileBtn = document.getElementById('big-tile-btn');
const clearSmallBtn = document.getElementById('clear-small-btn');

const bgMusic = document.getElementById('bg-music');
const mergeSound = document.getElementById('merge-sound');
const levelupSound = document.getElementById('levelup-sound');
const gameoverSound = document.getElementById('gameover-sound');

const movesLeftContainer = document.getElementById('moves-left');
const movesCountDisplay = document.getElementById('moves-count');
const dailyChallengeBtn = document.getElementById('daily-challenge-btn');

const dailyChallengeConfirm = document.getElementById('daily-challenge-confirm');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');

const restartLevelBtn = document.getElementById('restart-level-btn');


const BOARD_SIZE = 5;  // fixed size 10x10
let boardSize = BOARD_SIZE;
let board = new Array(boardSize * boardSize).fill(0);

let tiles = [];

let score = 0;
let currentLevel = 1;
let targetTile = 32;

let soundEnabled = true;

let powerups = {
  undo: 0,
  shuffle: 0,
  mergeAny: 0,
  bigTile: 0,
  clearSmall: 0
};

let prevBoard = null;
let prevScore = 0;

let mergeAnyActive = false;
let mergeAnySelected = [];

let gameOver = false;

// Daily Challenge
let dailyChallengeActive = false;
let dailyChallengeTargetTile = 256;   // example fixed tile target for daily challenge
let dailyChallengeMovesLeft = 0;
let dailyChallengeDisabled = false;

let boardChangedByPowerup = false; // flag for powerup board changes

// Power-up unlock info
const powerupUnlocks = [
  { id: 'undo-btn', level: 3, name: 'Undo Move' },
  { id: 'shuffle-btn', level: 5, name: 'Shuffle Board' },
  { id: 'merge-any-btn', level: 15, name: 'Merge Any Two Tiles' },
  { id: 'big-tile-btn', level: 25, name: 'Big Tile' },
  { id: 'clear-small-btn', level: 35, name: 'Clear Small Tiles' }
];

function persistLevelState() {
    const gameState = {
        board: board,           // current board array
        score: score,           // current score
        currentLevel: currentLevel,
        targetTile: targetTile,
        powerups: powerups
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// ==== Animation Setup --Fireworks-- ====
function createFireworkAt(x, y, color = 'gold') {
  const particleCount = 20;
  const container = particlesContainer;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    container.appendChild(particle);

    // Random angle and distance
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 40;

    // Starting position (center of tile)
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.backgroundColor = color;

    // Ensure starting visible & scale=1
    particle.style.opacity = '1';
    particle.style.transform = 'translate(0px, 0px) scale(1)';

    // Animate outward then fade/scale to 0
    requestAnimationFrame(() => {
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      particle.style.transition = 'transform 600ms ease-out, opacity 600ms ease-out';
      particle.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
      particle.style.opacity = '0';
    });

    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode === container) container.removeChild(particle);
    }, 700);
  }
}

function createFirework(tile) {
  const firework = document.createElement('div');
  firework.classList.add('firework');

  for (let i = 0; i < 12; i++) { // number of particles
    const particle = document.createElement('div');

    // random direction and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = 30 + Math.random() * 20; // pixels
    const x = Math.cos(angle) * distance + 'px';
    const y = Math.sin(angle) * distance + 'px';

    particle.style.setProperty('--x', x);
    particle.style.setProperty('--y', y);

    firework.appendChild(particle);
  }

  tile.appendChild(firework);

  // remove after animation
  setTimeout(() => firework.remove(), 800);
}

const createFireworks = createFireworkAt;

// ==== Toast Notification Setup ====

const toast = document.getElementById('toast');
let toastTimeout;

function showToast(message, duration = 2000) {
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
toast.classList.remove('show');
  }, duration);
}

// ==== Helper Functions ====

function updateScore() {
  scoreDisplay.textContent = `Score: ${score}`;
}

let rewardAdInProgress = false;

function tryUsePowerup(powerupName, btnId) {
    const btn = document.getElementById(btnId);

    if (btn.classList.contains('locked')) return;

    // If an ad is already playing, ignore taps
    if (rewardAdInProgress) return;

    if (powerups[powerupName] > 0) {

        // Execute the actual powerup effect
        switch(powerupName) {
            case 'undo':
                undoMove(); // undoMove handles decrement
                persistLevelState();
                break;
            case 'shuffle':
                powerups.shuffle--;
                updatePowerupBadges();
                shuffleBoard();
                persistLevelState();
                break;
            case 'mergeAny':
                powerups.mergeAny--;
                updatePowerupBadges();
                mergeAnyActive = true;
                showToast("Select two tiles with the same value to merge");
                persistLevelState();
                break;
            case 'bigTile':
                powerups.bigTile--;
                updatePowerupBadges();
                addBigTile();
                persistLevelState();
                break;
            case 'clearSmall':
                powerups.clearSmall--;
                updatePowerupBadges();
                clearSmallTiles();
                persistLevelState();
                break;
        }

    } else {
        // No powerup left → trigger rewarded ad
        if (window.AndroidReward && window.AndroidReward.showRewardedAd) {
            rewardAdInProgress = true;  // start lock
            window.AndroidReward.showRewardedAd(powerupName);
        }
    }
}

function onPowerupRewarded(powerupName) {
    // Increment the powerup count instead of just setting to 1
    powerups[powerupName] = (powerups[powerupName] || 0) + 1;

    // Update the badges to show the new count
    updatePowerupBadges();

    showToast(`${powerupName} restored!`);
    rewardAdInProgress = false; // unlock tap again

    // Persist the updated state
    persistLevelState();
}



function updatePowerupBadges() {
    const powerupData = [
        { btn: undoBtn, count: powerups.undo },
        { btn: shuffleBtn, count: powerups.shuffle },
        { btn: mergeAnyBtn, count: powerups.mergeAny },
        { btn: bigTileBtn, count: powerups.bigTile },
        { btn: clearSmallBtn, count: powerups.clearSmall },
    ];

    powerupData.forEach(({ btn, count }) => {
        // Remove any existing badge
        const oldBadge = btn.querySelector('.powerup-badge');
        if (oldBadge) btn.removeChild(oldBadge);

        // Show badge ONLY if button is NOT locked AND count > 0
        if (!btn.classList.contains('locked') && count > 0) {
            const badge = document.createElement('span');
            badge.classList.add('powerup-badge');
            badge.textContent = count;
            btn.appendChild(badge);
        }
    });
}


function updatePowerupLocks() {
    powerupUnlocks.forEach(({ id, level, name }) => {
        const btn = document.getElementById(id);
        const key = id.replace('-btn', '');

        if (currentLevel >= level) {
            btn.classList.remove('locked');
            btn.title = name;

            // Only assign initial count if undefined or 0 (never properly assigned)
            if (powerups[key] === undefined || powerups[key] === 0) {
                switch (id) {
                    case 'undo-btn':
                        powerups.undo = 1;
                        break;
                    case 'shuffle-btn':
                        powerups.shuffle = 2;
                        break;
                    case 'merge-any-btn':
                        powerups.mergeAny = 1;
                        break;
                    case 'big-tile-btn':
                        powerups.bigTile = 1;
                        break;
                    case 'clear-small-btn':
                        powerups.clearSmall = 1;
                        break;
                }
            }
        } else {
            btn.classList.add('locked');
            btn.title = `${name} unlocks at level ${level}`;
            powerups[key] = 0; // zero if locked
        }

        // Daily challenge logic
        if (dailyChallengeActive && !dailyChallengeDisabled) {
            btn.classList.add('locked');
            btn.title = `${name} disabled during Daily Challenge`;
            powerups[key] = 0;
        } else if (dailyChallengeActive && dailyChallengeDisabled) {
            btn.classList.add('locked');
            btn.title = `${name} disabled — challenge lost`;
            powerups[key] = 0;
        }
    });

    updatePowerupBadges(); // Make sure badges are updated after locks
}

function showMessage(text) {
  messageText.textContent = text;
  message.style.display = 'block';
  nextLevelBtn.style.display = 'none';
}

function showWinMessage() {
  messageText.textContent = `Level ${currentLevel} Complete!`;
  message.style.display = 'block';
  nextLevelBtn.style.display = 'inline-block';
}

function showGameOverMessage() {
  messageText.textContent = 'Game Over!';
  message.style.display = 'block';
  nextLevelBtn.style.display = 'none';
}

function render() {
  container.innerHTML = '';
  tiles = [];

  container.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;

  for (let i = 0; i < board.length; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    const val = board[i];
    tile.textContent = val > 0 ? val : '';
    tile.dataset.index = i;

    tile.classList.add(`tile-${val}`);
    if (val === 0) tile.classList.add('tile-empty');

    tiles.push(tile);
    container.appendChild(tile);
  }
    // ensure tiles are sized correctly after render
    adjustTileSizes();
}

function adjustTileSizes() {
  if (!container) return;
  // Use boardSize if available, otherwise fallback to sqrt(board.length)
  const gridSize = boardSize || Math.sqrt(board.length);

  // get computed gap (works for modern browsers)
  const cs = getComputedStyle(container);
  const gapStr = cs.getPropertyValue('gap') || cs.getPropertyValue('grid-gap') || '0px';
  const gap = parseFloat(gapStr) || 0;

  const rect = container.getBoundingClientRect();
  const totalGap = (gridSize - 1) * gap;
  const usableWidth = Math.max(rect.width - totalGap, 0);
  const usableHeight = Math.max(rect.height - totalGap, 0);

  // cell size (square)
  const size = Math.floor(Math.min(usableWidth / gridSize, usableHeight / gridSize));

  tiles.forEach(tile => {
    tile.style.width = `${size}px`;
    tile.style.height = `${size}px`;
    tile.style.lineHeight = `${size}px`;
    tile.style.boxSizing = 'border-box';
  });
}

function addRandomTile() {
  const emptyIndices = board.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
  if (emptyIndices.length === 0) return false;

  const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  board[idx] = Math.random() < 0.9 ? 2 : 4;

  render();

  // Animate new tile
  const tile = tiles[idx];
  if (tile) {
tile.classList.add('spawn-pop');
tile.addEventListener('animationend', () => {
 tile.classList.remove('spawn-pop');
}, { once: true });
  }

  return true;
}


function canMove() {
  // If any empty tile, can move
  if (board.includes(0)) return true;

  for (let y = 0; y < boardSize; y++) {
for (let x = 0; x < boardSize; x++) {
 const currentIndex = y * boardSize + x;
 const currentVal = board[currentIndex];

 // Check right neighbor
 if (x < boardSize - 1) {
const rightVal = board[y * boardSize + (x + 1)];
if (currentVal === rightVal) return true;
 }

 // Check bottom neighbor
 if (y < boardSize - 1) {
const downVal = board[(y + 1) * boardSize + x];
if (currentVal === downVal) return true;
 }
}
  }

  return false; // No moves left
}


function cloneBoard() {
  return board.slice();
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for(let i=0; i<a.length; i++) {
if(a[i] !== b[i]) return false;
  }
  return true;
}

function move(direction) {
  if (mergeAnyActive) return;

	prevBoard = cloneBoard();
	prevScore = score;

  let moved = false;
  window.lastMergedIndices = [];

  for (let i = 0; i < boardSize; i++) {
let line = [];
for (let j = 0; j < boardSize; j++) {
 let index;
 if (direction === 'up') index = j * boardSize + i;
 else if (direction === 'down') index = (boardSize - 1 - j) * boardSize + i;
 else if (direction === 'left') index = i * boardSize + j;
 else if (direction === 'right') index = i * boardSize + (boardSize - 1 - j);

 line.push(board[index]);
}

let { mergedLine, mergedIndices } = mergeLineWithIndices(line);
if (!arraysEqual(line, mergedLine)) {
 moved = true;
 for (let j = 0; j < boardSize; j++) {
let index;
if (direction === 'up') index = j * boardSize + i;
else if (direction === 'down') index = (boardSize - 1 - j) * boardSize + i;
else if (direction === 'left') index = i * boardSize + j;
else if (direction === 'right') index = i * boardSize + (boardSize - 1 - j);

board[index] = mergedLine[j];
 }
 mergedIndices.forEach(mi => {
let actualIndex;
if (direction === 'up') actualIndex = mi * boardSize + i;
else if (direction === 'down') actualIndex = (boardSize - 1 - mi) * boardSize + i;
else if (direction === 'left') actualIndex = i * boardSize + mi;
else if (direction === 'right') actualIndex = i * boardSize + (boardSize - 1 - mi);

window.lastMergedIndices.push(actualIndex);
 });
}
  }

  if (moved) {
    addRandomTile();
    render();
    updateScore();

    if (soundEnabled) {
         mergeSound.currentTime = 0;
         mergeSound.play();
    }

    animateMergedTiles();

    if (dailyChallengeActive) {
         dailyChallengeMovesLeft--;
         movesCountDisplay.textContent = dailyChallengeMovesLeft;

         if (board.includes(dailyChallengeTargetTile)) {
            showWinMessage();
            messageText.textContent = 'Daily Challenge Completed!';
            markDailyQuestCompleted();
            stopDailyChallenge();
            return;
         }

         if (dailyChallengeMovesLeft <= 0) {
            showGameOverMessage();
            messageText.textContent = 'Out of moves! Daily Challenge Failed.';
            stopDailyChallenge();
            return;
         }

         // Do NOT check normal level win/gameover while in daily challenge
        } else {
             if (board.includes(targetTile)) {
                if (soundEnabled) {
                     levelupSound.currentTime = 0;
                     levelupSound.play();
                }

                currentLevel++;
                levelNumDisplay.textContent = currentLevel;

                targetTile *= 2;
                targetTileDisplay.textContent = targetTile;

                removeLowestTiles();

                gameOver = false;

                powerups = {
                 undo: 1,
                 shuffle: 2,
                 mergeAny: 1,
                 bigTile: 1,
                 clearSmall: 1
                };
                updatePowerupLocks();
                updatePowerupBadges();

                updateScore();
                render();

                persistLevelState();

                return;
             }

             if (!boardChangedByPowerup) {
               if (!canMove()) {
                   showGameOverMessage();  // shows 'Game Over!' popup
                   if (soundEnabled) {
                       gameoverSound.currentTime = 0;
                       gameoverSound.play();
                   }

                   // Instead of auto-restarting, show the restart button
                   restartLevelBtn.style.display = 'inline-block'; // make the button visible
               }
             }
}

boardChangedByPowerup = false;
persistLevelState();
  }
}



function mergeLineWithIndices(line) {
  let newLine = line.filter(v => v !== 0);
  let mergedIndices = [];
  for (let i = 0; i < newLine.length - 1; i++) {
if (newLine[i] === newLine[i + 1]) {
 newLine[i] *= 2;
 score += newLine[i];
 newLine[i + 1] = 0;
 mergedIndices.push(i);     // merged tile index
 mergedIndices.push(i + 1); // the one merged into
 i++;
}
  }
  let filtered = newLine.filter(v => v !== 0);
  // Return filtered line + padding zeros, plus merged indices filtered to unique
  return {
mergedLine: filtered.concat(new Array(line.length - filtered.length).fill(0)),
mergedIndices: [...new Set(mergedIndices)]
  };
}

function animateMergedTiles() {
  if (!window.lastMergedIndices || window.lastMergedIndices.length === 0) return;

  window.lastMergedIndices.forEach(i => {
    const tile = tiles[i];
    if (!tile) return;

    tile.classList.add('merge-pop');
    createFirework(tile);

    setTimeout(() => tile.classList.remove('merge-pop'), 800);
  });

  window.lastMergedIndices = [];
}

function mergeLine(line) {
  let newLine = line.filter(v => v !== 0);
  let mergedIndices = [];
  for (let i = 0; i < newLine.length - 1; i++) {
if (newLine[i] === newLine[i + 1]) {
 newLine[i] *= 2;
 score += newLine[i];
 newLine[i + 1] = 0;
 mergedIndices.push(i); // Keep track of merged tiles
 i++;
}
  }
  const filtered = newLine.filter(v => v !== 0);
  return { mergedLine: filtered.concat(new Array(line.length - filtered.length).fill(0)), mergedIndices };
}

function removeLowestTiles() {
  const nonZero = board.filter(v => v !== 0);
  if (nonZero.length === 0) return;
  const minTile = Math.min(...nonZero);
  for (let i = 0; i < board.length; i++) {
if (board[i] === minTile) board[i] = 0;
  }
}

// ==== Power-up Functions ====

function undoMove() {
  if (powerups.undo > 0) {
board = prevBoard.slice();
score = prevScore;
updateScore();
render();
powerups.undo--;
updatePowerupBadges();
persistLevelState();
showToast("Undo used");
  }
}

function shuffleBoard() {
  if (powerups.shuffle > 0) {
boardChangedByPowerup = true;
const nonZero = board.filter(v => v !== 0);
for (let i = nonZero.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 [nonZero[i], nonZero[j]] = [nonZero[j], nonZero[i]];
}
for (let i = 0; i < board.length; i++) {
 board[i] = nonZero[i] || 0;
}
render();
powerups.shuffle--;
updatePowerupBadges();
persistLevelState();
showToast("Board shuffled!");
  }
}

function addBigTile() {
      if (powerups.bigTile > 0) {
            boardChangedByPowerup = true;
            const emptyIndices = board.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
            if (emptyIndices.length === 0) {
                 showToast("No empty spots!");
                 return;
            }
            const bigValue = Math.random() < 0.5 ? 64 : 128;
            const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            board[idx] = bigValue;
            render();
            powerups.bigTile--;
            updatePowerupBadges();
            persistLevelState();
            showToast(`Big tile ${bigValue} added!`);
            if (soundEnabled) {
                 mergeSound.currentTime = 0;
                 mergeSound.play();
            }
      }
}

function clearSmallTiles() {
      if (powerups.clearSmall > 0) {
            boardChangedByPowerup = true;
            const nonZero = board.filter(v => v !== 0);
            if (nonZero.length === 0) {
             showToast("No tiles to clear!");
             return;
            }
            const minTile = Math.min(...nonZero);
            for (let i = 0; i < board.length; i++) {
             if (board[i] === minTile) board[i] = 0;
            }
            render();
            powerups.clearSmall--;
            updatePowerupBadges();
            persistLevelState();
            showToast("Smallest tiles cleared!");
            if (soundEnabled) {
             mergeSound.currentTime = 0;
             mergeSound.play();
            }
      }
}

// ==== Merge Any Two Tiles ====

container.addEventListener('click', e => {
  if (!mergeAnyActive) return;
  const target = e.target;
  if (!target.classList.contains('tile')) return;
  const index = tiles.indexOf(target);
  if (index === -1) return;
  if (board[index] === 0) return;

  if (mergeAnySelected.includes(index)) {
mergeAnySelected = mergeAnySelected.filter(i => i !== index);
target.classList.remove('selected-tile');
  } else if (mergeAnySelected.length < 2) {
mergeAnySelected.push(index);
target.classList.add('selected-tile');
  }

  if (mergeAnySelected.length === 2) {
const [i1, i2] = mergeAnySelected;
if (board[i1] === board[i2]) {
 board[i1] *= 2;
 board[i2] = 0;
 score += board[i1];
 updateScore();
 render();
 showToast("Tiles merged manually!");
 if (soundEnabled) {
mergeSound.currentTime = 0;
mergeSound.play();
 }
 powerups.mergeAny--;
 updatePowerupBadges();
} else {
 showToast("Tiles must have the same value!");
}
mergeAnyActive = false;
mergeAnySelected = [];
tiles.forEach(t => t.classList.remove('selected-tile'));
  }
});

// ==== Power-up Buttons Event Listeners with dynamic locked message ====

function handlePowerupClick(btnId, callback) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('click', () => {
 const unlockInfo = powerupUnlocks.find(p => p.id === btnId);

 if (dailyChallengeActive) {
showToast('Powerups disabled during Daily Challenge');
return;
 }
 if (btn.classList.contains('locked')) {
showToast(`${unlockInfo.name} unlocks at level ${unlockInfo.level}`);
return;
 }
 callback();
});

}

handlePowerupClick('undo-btn', () => {
  undoMove();
});

handlePowerupClick('shuffle-btn', () => {
  shuffleBoard();
});

handlePowerupClick('merge-any-btn', () => {
  if (powerups.mergeAny > 0) {
    mergeAnyActive = true;
    showToast("Select two tiles with the same value to merge");
  }
});

handlePowerupClick('big-tile-btn', () => {
  addBigTile();
});

handlePowerupClick('clear-small-btn', () => {
  clearSmallTiles();
});

// ==== Keyboard Controls ====

window.addEventListener('keydown', e => {
  if (message.style.display === 'block') return;
  switch (e.key) {
case 'ArrowUp':
 move('up');
 break;
case 'ArrowDown':
 move('down');
 break;
case 'ArrowLeft':
 move('left');
 break;
case 'ArrowRight':
 move('right');
 break;
  }
});

// ==== Touch Controls ====

let startX = 0;
let startY = 0;
const minDistance = 30; // Minimum swipe distance in px

container.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
}, { passive: true });

container.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;

  if (Math.abs(dx) < minDistance && Math.abs(dy) < minDistance) return; // too short

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe
    if (dx > 0) move('right');
    else move('left');
  } else {
    // Vertical swipe
    if (dy > 0) move('down');
    else move('up');
  }
}, { passive: true });


// ==== Level Progression ====

nextLevelBtn.addEventListener('click', () => {

message.style.display = 'none';

  if (dailyChallengeActive) {
showToast('Finish the Daily Challenge first!');
return;
  }
 
  currentLevel++;
  levelNumDisplay.textContent = currentLevel;
  targetTile *= 2;
  targetTileDisplay.textContent = targetTile;
 
  gameOver = false;

  if (soundEnabled) {
levelupSound.currentTime = 0;
levelupSound.play();
  }
 
  advanceToNextLevel();

  removeLowestTiles();

  powerups = {
undo: 1,
shuffle: 2,
mergeAny: 1,
bigTile: 1,
clearSmall: 1
  };

  updatePowerupLocks();  // FIRST unlock or lock buttons based on level
  updatePowerupBadges(); // THEN update badges so they show on unlocked only

  updateScore();
  render();

  message.style.display = 'none';
});


// ==== Restart Game ====

restartBtn.addEventListener('click', () => {

  boardSize = BOARD_SIZE;
  board = new Array(boardSize * boardSize).fill(0);
 
  // Don't reset currentLevel or targetTile here
  gameOver = false;

  // Update displays just in case
  levelNumDisplay.textContent = currentLevel;
  targetTileDisplay.textContent = targetTile;


  // Reset powerups for the level
  powerups = {
undo: 1,
shuffle: 2,
mergeAny: 1,
bigTile: 1,
clearSmall: 1
  };

  updatePowerupBadges();
  updatePowerupLocks();

  score = 0;
  updateScore();

  message.style.display = 'none';

  addRandomTile();
  addRandomTile();

  render();
});

restartLevelBtn.addEventListener('click', restartLevel);

// ==== Theme, Dark Mode & Sound in Settings Modal ====

themeSelect.addEventListener('change', e => {
  const darkMode = document.body.classList.contains('dark-mode');
  document.body.className = `theme-${e.target.value}` + (darkMode ? ' dark-mode' : '');
});

darkToggle.addEventListener('click', () => {
  // Toggle dark mode class on body
  const body = document.body;
  const isDark = body.classList.toggle('dark-mode');

  console.log('Dark mode toggled:', isDark);

  // Update aria-pressed attribute for accessibility
  darkToggle.setAttribute('aria-pressed', isDark);

  // Keep current theme class intact
  const currentTheme = themeSelect.value;
  // Remove all classes then add current theme + dark if enabled
  body.className = `theme-${currentTheme}` + (isDark ? ' dark-mode' : '');

  console.log('Body class now:', body.className);
});



muteBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
bgMusic.play();
muteBtn.textContent = '🔊 Sound';
  } else {
bgMusic.pause();
muteBtn.textContent = '🔇 Mute';
  }
});

// ==== Settings Modal Open/Close ====

settingsBtn.addEventListener('click', () => {
  updateLevelsList();
  settingsModal.style.display = 'block';
});

settingsCloseBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// Close modal if clicking outside content
window.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
settingsModal.style.display = 'none';
  }
});

// ==== Levels List UI and Logic ====

// Calculate how many levels to show in the list
// We'll show 20 levels before current level, current level, and 30 levels after it for a total of 51 (can adjust)
const MAX_PREVIOUS_LEVELS = 20;
const MAX_FUTURE_LEVELS = 30;

function updateLevelsList() {
  levelsList.innerHTML = '';

  // Show all finished levels, current level, and lock all others
  const maxLevelToShow = currentLevel + 10; // show some future levels but locked

  for (let lvl = 1; lvl <= maxLevelToShow; lvl++) {
const levelItem = document.createElement('div');
levelItem.classList.add('level-item');

if (lvl < currentLevel) {
 // Finished levels - clickable
 levelItem.classList.add('done-level');
 levelItem.textContent = `Level ${lvl} ✔️`;
 levelItem.title = 'Completed Level';
 levelItem.style.cursor = 'pointer';

 levelItem.addEventListener('click', () => {
jumpToLevel(lvl);
settingsModal.style.display = 'none';
 });

} else if (lvl === currentLevel) {
 // Current level - glowing highlight, no click
 levelItem.classList.add('current-level');
 levelItem.textContent = `Level ${lvl} (Current)`;
 levelItem.title = 'Current Level';

} else {
 // Locked future levels - no click
 levelItem.classList.add('locked-level');
 levelItem.textContent = `Level ${lvl} 🔒`;
 levelItem.title = 'Locked Level';
}

levelsList.appendChild(levelItem);
  }
}

// Jump only to finished levels (no change needed, because only those are clickable)
function jumpToLevel(level) {
  if(level >= currentLevel) return; // safety, prevent jumping to unfinished or current

  currentLevel = level;
  levelNumDisplay.textContent = currentLevel;
  targetTile = 32 * (2 ** (currentLevel - 1)); // target doubles each level
  targetTileDisplay.textContent = targetTile;

  // Reset or recalc board size depending on level
  boardSize = BOARD_SIZE;
  board = new Array(boardSize * boardSize).fill(0);

  powerups = {
undo: 1,
shuffle: 2,
mergeAny: 1,
bigTile: 1,
clearSmall: 1
  };
  updatePowerupBadges();
  updatePowerupLocks();

  score = 0;
  updateScore();

  addRandomTile();
  addRandomTile();
  render();

  message.style.display = 'none';

  if (soundEnabled) {
levelupSound.currentTime = 0;
levelupSound.play();
  }
}


// ==== Initialize Game ====

function initGame() {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        const gameState = JSON.parse(saved);
        score = gameState.score;
        currentLevel = gameState.currentLevel;
        targetTile = gameState.targetTile;
        board = gameState.board;
        boardSize = board.length ** 0.5;

        // restore powerups
        powerups = gameState.powerups || { undo: 1, shuffle: 2, mergeAny: 1, bigTile: 1, clearSmall: 1 };

        // Update UI
        levelNumDisplay.textContent = currentLevel;
        targetTileDisplay.textContent = targetTile;
        updateScore();
        updatePowerupBadges();
        updatePowerupLocks();
        render();
    } else {
        // default new game
        score = 0;
        currentLevel = 1;
        targetTile = 32 * (2 ** (currentLevel - 1));
        boardSize = BOARD_SIZE;
        board = new Array(boardSize * boardSize).fill(0);

        // default powerups
        powerups = { undo: 1, shuffle: 2, mergeAny: 1, bigTile: 1, clearSmall: 1 };

        levelNumDisplay.textContent = currentLevel;
        targetTileDisplay.textContent = targetTile;
        updateScore();
        addRandomTile();
        addRandomTile();
        updatePowerupBadges();
        updatePowerupLocks();
        render();
    }

    message.style.display = 'none';
    if (soundEnabled) {
        bgMusic.play();
    }
}

initGame();
window.addEventListener('resize', adjustTileSizes);

// ==== Daily Challenge Functions ====
function getMovesForTarget(targetTile) {
  const movesMap = {
256: [15, 20],
512: [20, 25],
1024: [30, 20],
2048: [40, 20],
4096: [50, 15],
  };

  const movesOptions = movesMap[targetTile];
  if (!movesOptions) {
return 50;  // default fallback
  }

  // Pick a random value from movesOptions
  const randomIndex = Math.floor(Math.random() * movesOptions.length);
  return movesOptions[randomIndex];
}

function getTodayKey() {
  const today = new Date();
  return today.toISOString().slice(0, 10); // format: "YYYY-MM-DD"
}

function generateDailyChallenge() {
  // Generate a random target tile from the list
  const possibleTiles = [256, 512, 1024, 2048, 4096];
  const targetTile = possibleTiles[Math.floor(Math.random() * possibleTiles.length)];

  // Get moves based on target tile
  const movesLeft = getMovesForTarget(targetTile);

  return { targetTile, movesLeft };
}

function loadDailyChallengeSettings() {
  const todayKey = getTodayKey();
  const storedData = localStorage.getItem('dailyChallengeData');

  if (storedData) {
const data = JSON.parse(storedData);
if (data.date === todayKey) {
 // Return stored data if it's for today
 return {
targetTile: data.targetTile,
movesLeft: data.movesLeft
 };
}
  }

  // If no data for today, generate new challenge and store it
  const newChallenge = generateDailyChallenge();
  localStorage.setItem('dailyChallengeData', JSON.stringify({
date: todayKey,
targetTile: newChallenge.targetTile,
movesLeft: newChallenge.movesLeft
  }));
  return newChallenge;
}

function markDailyQuestCompleted() {
  const todayKey = getTodayKey(); // e.g., "2025-08-12"
  localStorage.setItem('dailyQuestCompleted', todayKey);
}

function isDailyQuestCompleted() {
  const todayKey = getTodayKey();
  const completedKey = localStorage.getItem('dailyQuestCompleted');
  return completedKey === todayKey;
}

function startDailyChallenge() {

  if (isDailyQuestCompleted()) {
dailyChallengeActive = false;  // do NOT activate again today
console.log('Daily quest already completed today');
return;
  }
 
  dailyChallengeActive = true;

  // Get today's dynamic challenge settings
  const challenge = loadDailyChallengeSettings();
  dailyChallengeTargetTile = challenge.targetTile;
  dailyChallengeMovesLeft = challenge.movesLeft;

  movesLeftContainer.style.display = 'block';
  movesCountDisplay.textContent = dailyChallengeMovesLeft;

  levelNumDisplay.textContent = 'Challenge';
  targetTileDisplay.textContent = dailyChallengeTargetTile;

  nextLevelBtn.style.display = 'none';

  dailyChallengeBtn.textContent = '❌';
  dailyChallengeBtn.title = 'Cancel Daily Challenge';
  dailyChallengeBtn.setAttribute('aria-pressed', 'true');
  dailyChallengeBtn.classList.add('active');

  boardSize = BOARD_SIZE;
  board = new Array(boardSize * boardSize).fill(0);
  score = 0;
  updateScore();

  addRandomTile();
  addRandomTile();
  render();

  showToast('Daily Challenge started! Reach tile ' + dailyChallengeTargetTile + ' in ' + dailyChallengeMovesLeft + ' moves.');
}

function stopDailyChallenge() {
  dailyChallengeActive = false;

  movesLeftContainer.style.display = 'none';

  // Restore normal level and target tile display
  levelNumDisplay.textContent = currentLevel;
  targetTileDisplay.textContent = targetTile;

  nextLevelBtn.style.display = 'inline-block';

  // Reset daily challenge button text/icon
  dailyChallengeBtn.textContent = '🔥';
  dailyChallengeBtn.title = 'Start Daily Challenge';
  dailyChallengeBtn.setAttribute('aria-pressed', 'false');
  dailyChallengeBtn.classList.remove('active');

  updatePowerupLocks();
  updatePowerupBadges();
  showToast('Daily Challenge ended — powerups enabled.');

  // Reset board for normal play
  restartBtn.click();
}

function restartLevel() {
  // Restart current level without resetting currentLevel or targetTile
  boardSize = BOARD_SIZE;
  board = new Array(boardSize * boardSize).fill(0);

  // Reset powerups for the current level
  powerups = {
    undo: 1,
    shuffle: 2,
    mergeAny: 1,
    bigTile: 1,
    clearSmall: 1
  };

  updatePowerupBadges();
  updatePowerupLocks();

  score = 0;
  updateScore();

  addRandomTile();
  addRandomTile();
  render();

  message.style.display = 'none';

  if (soundEnabled) {
    levelupSound.currentTime = 0;
    levelupSound.play();
  }

  showToast(`Level ${currentLevel} restarted`);
  persistLevelState();
}

// ==== Daily Challenge Button ====
dailyChallengeBtn.addEventListener('click', () => {
  if (dailyChallengeActive) {
// Cancel confirmation
dailyChallengeConfirm.querySelector('p').textContent = 'Are you sure you want to cancel the Daily Challenge?';
dailyChallengeConfirm.style.display = 'block';
dailyChallengeConfirm.dataset.action = 'cancel';
  } else {
// Start confirmation
dailyChallengeConfirm.querySelector('p').textContent = 'Do you want to start the Daily Challenge?';
dailyChallengeConfirm.style.display = 'block';
dailyChallengeConfirm.dataset.action = 'start';
  }
});

confirmYesBtn.addEventListener('click', () => {
  dailyChallengeConfirm.style.display = 'none';

  if (dailyChallengeConfirm.dataset.action === 'start') {
startDailyChallenge();
  } else if (dailyChallengeConfirm.dataset.action === 'cancel') {
stopDailyChallenge();
  }
});

confirmNoBtn.addEventListener('click', () => {
  dailyChallengeConfirm.style.display = 'none';

  if (dailyChallengeConfirm.dataset.action === 'start') {
showToast('Daily Challenge start cancelled');
  } else if (dailyChallengeConfirm.dataset.action === 'cancel') {
showToast('Daily Challenge cancel aborted');
  }
});
