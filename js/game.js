// game.js — All game logic for NEON BLAST

// LEVELS is loaded from config.js

// ======================= PIECE SHAPES =======================
const SHAPES = [
  [[1]],
  [[1,1]], [[1],[1]],
  [[1,1,1]], [[1],[1],[1]],
  [[1,1],[1,1]],
  [[1,0],[1,0],[1,1]], [[0,1],[0,1],[1,1]],
  [[1,1],[1,0],[1,0]], [[1,1],[0,1],[0,1]],
  [[1,1,1],[0,1,0]], [[0,1],[1,1],[0,1]],
  [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]],
  [[0,1,0],[1,1,1],[0,1,0]],
  [[1,1],[1,1],[1,1]], [[1,1,1],[1,1,1]],
  [[1,1,1,1]], [[1],[1],[1],[1]],
  [[1,1],[1,0]], [[1,1],[0,1]],
  [[1,0],[1,1]], [[0,1],[1,1]],
];

const COLORS = [0,1,2,3,4,5,6];

// ======================= GAME STATE =======================
let board        = [];
let boardHearts  = [];
let pieces       = [];
let score        = 0;
let highScore    = 0; // loaded after mode is known in initGame
let gameMode     = 'endless';
let currentLevel = 0;
let movesLeft    = 0;
let heartsCollected = 0;
let heartTarget  = 0;
let gameOver     = false;
let completedLevels = JSON.parse(localStorage.getItem('neonblast_lvls') || '[]');

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  gameMode = params.get('mode') || 'endless';
  currentLevel = parseInt(params.get('level') || '0');
  initGame();
  initAudio();
  // Sync in-game mute button with saved setting
  const muteBtn = document.getElementById('btn-mute-game');
  if (muteBtn) muteBtn.textContent = settings.mute ? '🔇 MUTED' : '🔊 SOUND';
});

function initGame() {
  score = 0;
  heartsCollected = 0;
  gameOver = false;
  // Load the correct best score for this mode
  const hsKey = gameMode === 'endless' ? 'neonblast_hs_endless' : 'neonblast_hs_classic';
  highScore = parseInt(localStorage.getItem(hsKey) || '0');
  board       = Array.from({length: 8}, () => Array(8).fill(null));
  boardHearts = Array.from({length: 8}, () => Array(8).fill(false));

  if (gameMode === 'classic') {
    const cfg = LEVELS[currentLevel];
    movesLeft   = cfg.moves;
    heartTarget = cfg.hearts;
    placeHearts(cfg.heartCount);
    document.getElementById('level-display').textContent = `LEVEL ${currentLevel + 1}`;
    document.getElementById('heart-display').style.display = 'flex';
    document.getElementById('move-display').style.display  = 'flex';
    document.getElementById('best-box').style.display   = 'none';
    document.getElementById('stars-box').style.display  = 'flex';
    updateStarsUI();
  } else {
    document.getElementById('level-display').textContent = 'ENDLESS';
    document.getElementById('heart-display').style.display = 'none';
    document.getElementById('move-display').style.display  = 'none';
    document.getElementById('best-box').style.display  = 'flex';
    document.getElementById('stars-box').style.display = 'none';
  }

  updateScoreUI();
  buildBoard();
  generatePieces();
  renderPieces();
}

function placeHearts(count) {
  let placed = 0, attempts = 0;
  while (placed < count && attempts < 500) {
    const r = Math.floor(Math.random() * 8);
    const c = Math.floor(Math.random() * 8);
    if (!boardHearts[r][c]) { boardHearts[r][c] = true; placed++; }
    attempts++;
  }
}

// ======================= BOARD =======================
function buildBoard() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      el.appendChild(cell);
    }
  }
  renderBoard();
}

function renderBoard() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = getBoardCell(r, c);
      if (!cell) continue;
      const val = board[r][c];
      cell.className = 'cell';
      cell.innerHTML = '';
      if (val) {
        cell.classList.add('filled', `color-${val.color}`);
        if (val.heart) {
          const h = document.createElement('div');
          h.className = 'heart-icon';
          h.textContent = '💖';
          cell.appendChild(h);
        }
      } else if (gameMode === 'classic' && boardHearts[r][c]) {
        const h = document.createElement('div');
        h.className = 'heart-icon';
        h.textContent = '🤍';
        h.style.opacity = '0.5';
        cell.appendChild(h);
      }
    }
  }
}

function getBoardCell(r, c) {
  return document.querySelector(`#board .cell[data-r="${r}"][data-c="${c}"]`);
}

// ======================= PIECE GENERATION =======================
function generatePieces() {
  pieces = [];
  for (let i = 0; i < 3; i++) pieces.push(generateOnePiece());
  ensurePlayable();
}

function generateOnePiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { shape, color, used: false };
}

function ensurePlayable() {
  for (let attempt = 0; attempt < 20; attempt++) {
    for (let pi = 0; pi < 3; pi++) {
      if (!pieces[pi].used && canPlaceAnywhere(pieces[pi].shape)) return;
    }
    for (let pi = 0; pi < 3; pi++) pieces[pi] = generateOnePiece();
  }
  for (let pi = 0; pi < 3; pi++) {
    if (!canPlaceAnywhere(pieces[pi].shape)) pieces[pi].shape = [[1]];
  }
}

function canPlaceAnywhere(shape) {
  for (let r = 0; r <= 8 - shape.length; r++)
    for (let c = 0; c <= 8 - shape[0].length; c++)
      if (canPlace(shape, r, c)) return true;
  return false;
}

function canPlace(shape, startR, startC) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = startR + r, bc = startC + c;
      if (br < 0 || br >= 8 || bc < 0 || bc >= 8) return false;
      if (board[br][bc] !== null) return false;
    }
  return true;
}

// ======================= PIECE RENDERING =======================
function renderPieces() {
  const area = document.getElementById('pieces-area');
  area.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'piece-slot' + (pieces[i].used ? ' used' : '');
    slot.dataset.idx = i;
    if (!pieces[i].used) slot.appendChild(buildPiecePreview(pieces[i], i));
    area.appendChild(slot);
  }
}

function buildPiecePreview(piece, idx) {
  const shape = piece.shape;
  const rows = shape.length, cols = shape[0].length;
  const div = document.createElement('div');
  div.className = 'piece-preview';
  div.style.gridTemplateColumns = `repeat(${cols}, 22px)`;
  div.style.gridTemplateRows    = `repeat(${rows}, 22px)`;
  div.dataset.idx = idx;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'piece-cell' + (shape[r][c] ? ` color-${piece.color}` : ' empty');
      div.appendChild(cell);
    }
  setupDrag(div, idx);
  return div;
}

// ======================= DRAG & DROP =======================
let dragging = null;

function setupDrag(el, idx) {
  el.addEventListener('mousedown', e => startDrag(e, idx));
  el.addEventListener('touchstart', e => startDragTouch(e, idx), { passive: false });
}

function startDrag(e, idx) {
  if (pieces[idx].used || gameOver) return;
  e.preventDefault();
  dragging = { idx };
  showGhost(idx, e.clientX, e.clientY);
  markSlotDragging(idx, true);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function startDragTouch(e, idx) {
  if (pieces[idx].used || gameOver) return;
  e.preventDefault();
  const touch = e.touches[0];
  dragging = { idx };
  showGhost(idx, touch.clientX, touch.clientY);
  markSlotDragging(idx, true);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
}

function onMouseMove(e) {
  if (!dragging) return;
  moveGhost(e.clientX, e.clientY);
  highlightCells(e.clientX, e.clientY);
}

function onTouchMove(e) {
  if (!dragging) return;
  e.preventDefault();
  const t = e.touches[0];
  moveGhost(t.clientX, t.clientY);
  highlightCells(t.clientX, t.clientY);
}

function onMouseUp(e) {
  if (!dragging) return;
  dropPiece(e.clientX, e.clientY);
  endDrag();
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function onTouchEnd(e) {
  if (!dragging) return;
  const t = e.changedTouches[0];
  dropPiece(t.clientX, t.clientY);
  endDrag();
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
}

function showGhost(idx, x, y) {
  const ghost = document.getElementById('drag-ghost');
  const piece = pieces[idx];
  const cols = piece.shape[0].length;
  ghost.innerHTML = '';
  const inner = document.createElement('div');
  inner.style.cssText = `display:grid;grid-template-columns:repeat(${cols},24px);gap:3px;`;
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:24px;height:24px;border-radius:3px;';
      if (piece.shape[r][c]) {
        cell.classList.add(`color-${piece.color}`);
        cell.style.border = '1px solid rgba(255,255,255,0.3)';
      }
      inner.appendChild(cell);
    }
  ghost.appendChild(inner);
  ghost.style.display = 'block';
  moveGhost(x, y);
}

function moveGhost(x, y) {
  const ghost = document.getElementById('drag-ghost');
  ghost.style.left = (x - ghost.offsetWidth / 2) + 'px';
  ghost.style.top  = (y - ghost.offsetHeight / 2 - 30) + 'px';
}

function endDrag() {
  const idx = dragging ? dragging.idx : null;
  dragging = null;
  document.getElementById('drag-ghost').style.display = 'none';
  clearHighlights();
  if (idx !== null) markSlotDragging(idx, false);
}

function markSlotDragging(idx, on) {
  const slot = document.querySelector(`.piece-slot[data-idx="${idx}"]`);
  if (slot) slot.classList.toggle('dragging-active', on);
}

function getBoardPosition(clientX, clientY) {
  const boardEl = document.getElementById('board');
  const rect = boardEl.getBoundingClientRect();
  const x = clientX - rect.left - 8;
  const y = clientY - 30 - rect.top - 8;
  const cellW = (rect.width - 16) / 8;
  const cellH = (rect.height - 16) / 8;
  return { r: Math.floor(y / cellH), c: Math.floor(x / cellW) };
}

function highlightCells(clientX, clientY) {
  clearHighlights();
  if (!dragging) return;
  const { r, c } = getBoardPosition(clientX, clientY);
  const shape = pieces[dragging.idx].shape;
  const valid = canPlace(shape, r, c);
  for (let dr = 0; dr < shape.length; dr++)
    for (let dc = 0; dc < shape[dr].length; dc++) {
      if (!shape[dr][dc]) continue;
      const cell = getBoardCell(r + dr, c + dc);
      if (cell) cell.classList.add(valid ? 'highlight' : 'invalid-highlight');
    }
}

function clearHighlights() {
  document.querySelectorAll('.cell.highlight, .cell.invalid-highlight')
    .forEach(c => c.classList.remove('highlight', 'invalid-highlight'));
}

function dropPiece(clientX, clientY) {
  if (!dragging) return;
  const { r, c } = getBoardPosition(clientX, clientY);
  const piece = pieces[dragging.idx];
  if (!canPlace(piece.shape, r, c)) return;
  placePiece(dragging.idx, r, c);
}

function placePiece(idx, startR, startC) {
  const piece = pieces[idx];
  let blocksPlaced = 0;
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const br = startR + r, bc = startC + c;
      const hasHeart = gameMode === 'classic' && boardHearts[br][bc];
      board[br][bc] = { color: piece.color, heart: hasHeart };
      blocksPlaced++;
    }
  pieces[idx].used = true;
  score += blocksPlaced;
  playSfx('place');
  if (gameMode === 'classic') { movesLeft--; updateMovesUI(); }
  renderBoard();
  renderPieces();
  checkClear();
  updateScoreUI();
  checkPiecesExhausted();
}

// ======================= LINE CLEARING =======================
function checkClear() {
  const rowsToClear = [], colsToClear = [];
  for (let r = 0; r < 8; r++)
    if (board[r].every(c => c !== null)) rowsToClear.push(r);
  for (let c = 0; c < 8; c++)
    if (board.every(row => row[c] !== null)) colsToClear.push(c);
  if (!rowsToClear.length && !colsToClear.length) return;

  const cleared = new Set();
  let heartsThisClear = 0;

  rowsToClear.forEach(r => {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.heart) heartsThisClear++;
      cleared.add(`${r},${c}`);
    }
  });
  colsToClear.forEach(col => {
    for (let r = 0; r < 8; r++) {
      if (board[r][col]?.heart) heartsThisClear++;
      cleared.add(`${r},${col}`);
    }
  });

  const lineScore  = cleared.size * 10 * (rowsToClear.length + colsToClear.length);
  const heartScore = heartsThisClear * 25;
  score += lineScore + heartScore;

  if (heartsThisClear > 0) {
    heartsCollected += heartsThisClear;
    playSfx('heart');
    updateHeartsUI();
  } else {
    playSfx('clear');
  }

  cleared.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    const cell = getBoardCell(r, c);
    if (cell) {
      cell.classList.add('clearing');
      setTimeout(() => cell.classList.remove('clearing'), 400);
    }
  });

  setTimeout(() => {
    cleared.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      board[r][c] = null;
      if (gameMode === 'classic') boardHearts[r][c] = false;
    });
    renderBoard();
  }, 150);

  showScorePop(lineScore + heartScore);
  updateScoreUI();
  if (gameMode === 'classic') setTimeout(checkClassicWin, 200);
}

function showScorePop(pts) {
  const pop = document.createElement('div');
  pop.className = 'score-pop';
  pop.textContent = `+${pts}`;
  const boardEl = document.getElementById('board');
  const r = boardEl.getBoundingClientRect();
  pop.style.left = (r.left + r.width / 2 - 30) + 'px';
  pop.style.top  = (r.top + r.height / 2) + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1000);
}

// ======================= PIECE EXHAUSTION =======================
function checkPiecesExhausted() {
  if (pieces.every(p => p.used)) {
    setTimeout(() => { generatePieces(); renderPieces(); checkGameOver(); }, 300);
    return;
  }
  checkGameOver();
}

function checkGameOver() {
  for (let i = 0; i < 3; i++) {
    if (pieces[i].used) continue;
    if (canPlaceAnywhere(pieces[i].shape)) return;
  }
  if (gameOver) return;
  if (gameMode === 'classic') triggerLevelLose('no-space');
  else triggerGameOver();
}

// ======================= CLASSIC CHECKS =======================
function checkClassicWin() {
  if (gameMode !== 'classic') return;
  if (heartsCollected >= heartTarget) { triggerLevelWin(); return; }
  if (movesLeft <= 0) triggerLevelLose('out-of-moves');
}

function updateMovesUI() {
  document.getElementById('move-count').textContent = movesLeft;
  if (movesLeft <= 5) document.getElementById('move-display').style.color = 'var(--neon-pink)';
  if (movesLeft <= 0 && gameMode === 'classic') setTimeout(checkClassicWin, 300);
}

// ======================= STAR SYSTEM =======================
function calcStars() {
  // 3 stars: ≥50% moves remaining, 2 stars: ≥20%, 1 star: completed
  const cfg = LEVELS[currentLevel];
  const ratio = movesLeft / cfg.moves;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

function starsText(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

function updateStarsUI() {
  if (gameMode !== 'classic') return;
  // Show projected stars based on current moves left (only if won, else show saved or blank)
  const saved = getLevelStars(currentLevel);
  document.getElementById('stars-display').textContent = starsText(saved);
}

function getLevelStars(lvl) {
  const data = JSON.parse(localStorage.getItem('neonblast_stars') || '{}');
  return data[String(lvl)] || 0;
}

function saveLevelStars(lvl, stars) {
  const data = JSON.parse(localStorage.getItem('neonblast_stars') || '{}');
  if ((data[String(lvl)] || 0) < stars) {
    data[String(lvl)] = stars;
    localStorage.setItem('neonblast_stars', JSON.stringify(data));
  }
}

function updateHeartsUI() {
  document.getElementById('heart-count').textContent  = heartsCollected;
  document.getElementById('heart-target').textContent = heartTarget;
}

function updateScoreUI() {
  document.getElementById('score-display').textContent = score;
  if (score > highScore) {
    highScore = score;
    const hsKey = gameMode === 'endless' ? 'neonblast_hs_endless' : 'neonblast_hs_classic';
    localStorage.setItem(hsKey, highScore);
  }
  document.getElementById('best-display').textContent = highScore;
  if (gameMode === 'classic') {
    updateHeartsUI();
    document.getElementById('move-count').textContent = movesLeft;
    // Show live projected stars
    const projected = heartsCollected >= heartTarget ? calcStars() : getLevelStars(currentLevel);
    document.getElementById('stars-display').textContent = starsText(projected);
  }
}

// ======================= OVERLAYS =======================
function triggerGameOver() {
  gameOver = true;
  playSfx('lose');
  document.getElementById('overlay-box').className = 'overlay-box lose';
  document.getElementById('overlay-icon').textContent  = '💀';
  document.getElementById('overlay-title').textContent = 'GAME OVER';
  document.getElementById('overlay-sub').textContent   = `Final Score: ${score}\nBest: ${highScore}`;
  document.getElementById('overlay-btns').innerHTML = `
    <button class="btn btn-cyan btn-sm" onclick="restartGame()">▶ RETRY</button>
    <button class="btn btn-dim btn-sm"  onclick="quitGame()">⬅ QUIT</button>
  `;
  showOverlay();
}

function triggerLevelWin() {
  gameOver = true;
  playSfx('win');

  // Save highest beaten level as a single number - simple and reliable
  const prevMax = parseInt(localStorage.getItem('neonblast_max') || '-1', 10);
  if (currentLevel > prevMax) {
    localStorage.setItem('neonblast_max', String(currentLevel));
  }
  const earned = calcStars();
  saveLevelStars(currentLevel, earned);
  const hasNext = currentLevel + 1 < LEVELS.length;
  document.getElementById('overlay-box').className = 'overlay-box win';
  document.getElementById('overlay-icon').textContent  = '🏆';
  document.getElementById('overlay-title').textContent = 'LEVEL CLEAR!';
  document.getElementById('overlay-sub').innerHTML =
    `<div class="overlay-stars">${starsText(earned)}</div>Hearts: ${heartsCollected}/${heartTarget} 💖\nScore: ${score}`;
  document.getElementById('overlay-btns').innerHTML = `
    ${hasNext ? `<button class="btn btn-pink btn-sm" onclick="nextLevel()">NEXT ▶</button>` : ''}
    <button class="btn btn-cyan btn-sm" onclick="restartGame()">↺ RETRY</button>
    <button class="btn btn-dim btn-sm"  onclick="quitGame()">⬅ QUIT</button>
  `;
  showOverlay();
}

function triggerLevelLose(reason) {
  gameOver = true;
  playSfx('lose');
  const reasonText = reason === 'no-space' ? 'No pieces fit on the board!' : 'Moves used up!';
  document.getElementById('overlay-box').className = 'overlay-box lose';
  document.getElementById('overlay-icon').textContent  = '💔';
  document.getElementById('overlay-title').textContent = 'LEVEL FAILED';
  document.getElementById('overlay-sub').textContent   = `Hearts: ${heartsCollected}/${heartTarget} 💖\n${reasonText}`;
  document.getElementById('overlay-btns').innerHTML = `
    <button class="btn btn-pink btn-sm" onclick="restartGame()">↺ RETRY</button>
    <button class="btn btn-dim btn-sm"  onclick="quitGame()">⬅ QUIT</button>
  `;
  showOverlay();
}

function showOverlay() { document.getElementById('overlay').classList.add('active'); }
function hideOverlay() { document.getElementById('overlay').classList.remove('active'); }

function restartGame() {
  hideOverlay();
  initGame();
}

function nextLevel() {
  hideOverlay();
  const prevMax = parseInt(localStorage.getItem('neonblast_max') || '-1', 10);
  if (currentLevel > prevMax) {
    localStorage.setItem('neonblast_max', String(currentLevel));
  }
  currentLevel++;
  if (currentLevel >= LEVELS.length) {
    // All levels complete — go to level select to see all stars
    navigate('levels.html');
  } else {
    initGame();
  }
}

function quitGame() {
  hideOverlay();
  stopMusic();
  gameOver = true;
  // Return to level select in classic so updated stars are visible immediately
  if (gameMode === 'classic') {
    navigate('levels.html');
  } else {
    navigate('mode.html');
  }
}
