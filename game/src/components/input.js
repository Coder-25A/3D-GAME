const ACTIONS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  restart: ['KeyR', 'Enter', 'Space'],
};

export function createInput() {
  const pressed = new Set();
  let previous = new Set();
  let justPressed = new Set();

  const onKeyDown = (event) => {
    if (Object.values(ACTIONS).flat().includes(event.code)) {
      event.preventDefault();
    }
    pressed.add(event.code);
  };

  const onKeyUp = (event) => {
    pressed.delete(event.code);
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);

  return {
    isDown(action) {
      return ACTIONS[action]?.some((code) => pressed.has(code)) ?? false;
    },
    wasPressed(action) {
      return ACTIONS[action]?.some((code) => justPressed.has(code)) ?? false;
    },
    update() {
      justPressed = new Set([...pressed].filter((code) => !previous.has(code)));
      previous = new Set(pressed);
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}

