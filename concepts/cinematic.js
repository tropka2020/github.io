(() => {
  'use strict';

  const scene = document.querySelector('.garage-scene');
  if (!scene) return;

  const image = scene.querySelector('#scene-image');
  const context = scene.querySelector('#scene-context');
  const status = scene.querySelector('#scene-status');
  const buttons = [...scene.querySelectorAll('[data-scene]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = {
    protection: {
      image: '../assets/hero.jpg',
      context: ['Защитная плёнка и покрытия —', 'чтобы беречь то, что нравится.'],
      label: 'Защита. Jaguar: плёнка и защитные покрытия.'
    },
    restoration: {
      image: '../assets/retro.jpg',
      context: ['Реставрация кожи и салона —', 'с вниманием к характеру автомобиля.'],
      label: 'Реставрация. Интерьер классического автомобиля.'
    },
    detailing: {
      image: '../assets/polish.jpg',
      context: ['Полировка и уход за кузовом —', 'чтобы снова видеть глубину цвета.'],
      label: 'Детейлинг. Полировка кузова крупным планом.'
    }
  };

  let request = 0;
  let selected = 'protection';
  let activeAnimation;
  const introAnimations = [];

  if (!motion.matches && typeof scene.animate === 'function') {
    introAnimations.push(scene.querySelector('.scene-photograph').animate(
      [{ transform: 'scale(1.035)' }, { transform: 'scale(1)' }],
      { duration: 1050, easing: 'cubic-bezier(.2,.7,.2,1)' }
    ));
    introAnimations.push(scene.querySelector('.scene-story').animate(
      [{ transform: 'translateY(18px)', opacity: 0.3 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 850, easing: 'cubic-bezier(.2,.7,.2,1)' }
    ));
  }

  async function selectScene(button) {
    const key = button.dataset.scene;
    const next = scenes[key];
    if (!next) return;
    const currentRequest = ++request;
    if (key === selected) {
      scene.removeAttribute('aria-busy');
      status.textContent = next.label;
      return;
    }

    scene.setAttribute('aria-busy', 'true');
    status.textContent = 'Загружаем фотографию…';
    try {
      const photo = new Image();
      await new Promise((resolve, reject) => {
        photo.onload = resolve;
        photo.onerror = reject;
        photo.src = next.image;
      });
      if (currentRequest !== request) return;

      activeAnimation?.cancel();
      image.src = next.image;
      image.width = photo.naturalWidth;
      image.height = photo.naturalHeight;
      scene.dataset.scene = key;
      const firstLine = document.createTextNode(next.context[0]);
      const secondLine = document.createTextNode(next.context[1]);
      context.replaceChildren(firstLine, document.createElement('br'), secondLine);
      buttons.forEach((item) => {
        const isSelected = item === button;
        item.classList.toggle('is-selected', isSelected);
        item.setAttribute('aria-pressed', String(isSelected));
      });
      selected = key;
      scene.removeAttribute('aria-busy');
      status.textContent = next.label;
      if (!motion.matches && typeof image.animate === 'function') {
        activeAnimation = image.animate(
          [{ opacity: .55, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' }
        );
      }
    } catch {
      if (currentRequest !== request) return;
      scene.removeAttribute('aria-busy');
      status.textContent = 'Фотография не загрузилась. Повторите выбор направления.';
    }
  }

  buttons.forEach((button) => button.addEventListener('click', () => selectScene(button)));
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    activeAnimation?.cancel();
    introAnimations.forEach((animation) => animation.cancel());
  });
})();
