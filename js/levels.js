// levels.js — Level select page logic

// LEVELS is loaded from config.js

function starsText(n) {
  if (n <= 0) return '☆☆☆';
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

function buildLevelGrid() {
  var levelStars = {};
  try { levelStars = JSON.parse(localStorage.getItem('neonblast_stars') || '{}'); } catch(e) {}

  var grid = document.getElementById('level-grid');
  grid.innerHTML = '';

  LEVELS.forEach(function(lvl, i) {
    var btn = document.createElement('div');
    btn.className = 'level-btn';

    var stars = parseInt(levelStars[String(i)] || '0', 10);

    // All levels unlocked — show earned stars or empty stars if not yet played
    btn.innerHTML =
      '<span class="lnum">' + (i + 1) + '</span>' +
      '<span class="lstars' + (stars === 0 ? ' lstars-empty' : '') + '">' + starsText(stars) + '</span>';

    (function(idx) {
      btn.addEventListener('click', function() {
        navigate('game.html?mode=classic&level=' + idx);
      });
    })(i);

    grid.appendChild(btn);
  });
}

document.addEventListener('DOMContentLoaded', buildLevelGrid);
