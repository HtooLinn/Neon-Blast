// howto.js — How To Play page logic

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-btn');

  // If we came from the game page, go back to it
  if (document.referrer && document.referrer.includes('game.html')) {
    backBtn.addEventListener('click', () => navigate('game.html'));
  } else {
    backBtn.addEventListener('click', () => navigate('../index.html'));
  }
});
