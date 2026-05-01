// settings.js — Settings page logic

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-btn');

  // If we came from the game page, go back to it
  if (document.referrer && document.referrer.includes('game.html')) {
    backBtn.addEventListener('click', () => navigate('game.html'));
  } else {
    backBtn.addEventListener('click', () => navigate('../index.html'));
  }

  // Apply saved settings to the UI
  document.getElementById('toggle-mute').classList.toggle('on', settings.mute);
  document.getElementById('toggle-music').classList.toggle('on', settings.music);
  document.getElementById('toggle-sfx').classList.toggle('on', settings.sfx);
  document.getElementById('vol-music').value = Math.round(settings.volMusic * 100);
  document.getElementById('vol-sfx').value = Math.round(settings.volSfx * 100);
});
