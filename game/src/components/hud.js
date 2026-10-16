export function createHud(onRestart) {
  const root = document.createElement('div');
  root.className = 'hud';

  root.innerHTML = `
    <div class="hud__panel hud__panel--top-left">
      <div class="hud__eyebrow">Tode's Rescue Run</div>
      <div class="hud__score">Score: <span data-score>0</span></div>
      <div class="hud__status" data-status>Collect the glowing orbs and avoid the enemies.</div>
    </div>
    <div class="hud__panel hud__panel--top-right">
      <div class="hud__eyebrow">Controls</div>
      <div>Move: WASD / Arrow Keys</div>
      <div>Restart: R or Enter</div>
    </div>
    <div class="hud__panel hud__panel--bottom-left">
      <button class="hud__button" type="button">Restart</button>
      <div class="hud__hint" data-hint>Explore the island and grab all 6 orbs.</div>
    </div>
  `;

  document.body.append(root);

  const scoreEl = root.querySelector('[data-score]');
  const statusEl = root.querySelector('[data-status]');
  const hintEl = root.querySelector('[data-hint]');
  const restartButton = root.querySelector('.hud__button');

  restartButton.addEventListener('click', onRestart);

  return {
    setScore(score) {
      scoreEl.textContent = String(score);
    },
    setStatus(message) {
      statusEl.textContent = message;
    },
    setHint(message) {
      hintEl.textContent = message;
    },
    dispose() {
      restartButton.removeEventListener('click', onRestart);
      root.remove();
    },
  };
}
