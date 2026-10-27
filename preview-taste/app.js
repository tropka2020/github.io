(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const animations = new Set();
  const image = document.querySelector('#work-main-image');
  const caption = document.querySelector('#work-caption');
  const choices = [...document.querySelectorAll('[data-state]')];
  let imageRequest = 0;

  function animate(element, keyframes, options) {
    if (!element || motion.matches || typeof element.animate !== 'function') return;
    const animation = element.animate(keyframes, { fill: 'none', ...options });
    animations.add(animation);
    const done = () => animations.delete(animation);
    animation.addEventListener('finish', done, { once: true });
    animation.addEventListener('cancel', done, { once: true });
  }

  function setImage(button) {
    if (!image || !button?.dataset.src) return;
    const ticket = ++imageRequest;
    const loader = new Image();
    loader.onload = () => {
      if (ticket !== imageRequest) return;
      image.getAnimations?.().forEach(animation => animation.cancel());
      image.src = button.dataset.src;
      image.alt = button.dataset.alt || 'Восстановление кожи сиденья Toyota Land Cruiser Prado';
      if (caption) caption.textContent = button.dataset.workCaption || button.textContent.trim();
      choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      animate(image, [
        { opacity: .65, transform: 'scale(1.025)' },
        { opacity: 1, transform: 'scale(1)' },
      ], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
    loader.onerror = () => {
      if (ticket === imageRequest && caption) caption.textContent = 'Не удалось загрузить фотографию. Попробуйте другой кадр.';
    };
    loader.src = button.dataset.src;
  }
  choices.forEach(button => button.addEventListener('click', () => setImage(button)));

  const reveals = [...document.querySelectorAll('[data-enter]')];
  const seen = new WeakSet();
  const driftImages = [...document.querySelectorAll('[data-drift]')];
  let frame = 0;

  function reveal(element) {
    if (seen.has(element)) return;
    seen.add(element);
    const kind = element.dataset.enter;
    const group = Number(element.dataset.delay || 0);
    if (kind === 'shutter') {
      animate(element, [
        { transform: 'translateX(-24px)', opacity: .45 },
        { transform: 'translateX(0)', opacity: 1 },
      ], { duration: 1100, delay: group * 75, easing: 'cubic-bezier(.16,1,.3,1)' });
      const picture = element.querySelector('img');
      if (picture && !picture.hasAttribute('data-drift')) {
        animate(picture, [{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }], {
          duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)',
        });
      }
      return;
    }
    const distance = kind === 'row' ? 16 : 26;
    animate(element, [
      { transform: `translateY(${distance}px)`, opacity: .4 },
      { transform: 'translateY(0)', opacity: 1 },
    ], { duration: kind === 'row' ? 620 : 850, delay: group * 75, easing: 'cubic-bezier(.16,1,.3,1)' });
  }

  function update() {
    frame = 0;
    const edge = innerHeight * .96;
    reveals.forEach(element => {
      if (seen.has(element)) return;
      const box = element.getBoundingClientRect();
      if (box.top < edge && box.bottom > 0) reveal(element);
    });
    driftImages.forEach(picture => {
      if (motion.matches || coarse.matches || innerWidth < 760) {
        picture.style.transform = 'none';
        return;
      }
      const box = picture.parentElement.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= innerHeight) return;
      const fraction = Math.max(-1, Math.min(1, (innerHeight / 2 - box.top - box.height / 2) / innerHeight));
      picture.style.transform = `scale(1.045) translateY(${(fraction * 14).toFixed(2)}px)`;
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  motion.addEventListener('change', () => {
    animations.forEach(animation => animation.cancel());
    animations.clear();
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    } else schedule();
  });
  document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    const content = detail.querySelector('[data-detail-content]') || detail.querySelector('ul');
    animate(content, [{ opacity: .4, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
      duration: 300, easing: 'cubic-bezier(.16,1,.3,1)',
    });
  }));
  update();
  (document.fonts?.ready || Promise.resolve()).then(schedule);
})();
