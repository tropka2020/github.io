'use strict';

(() => {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const photo = document.querySelector('.hero-photo');
  const photoWindow = document.querySelector('.photo-window');
  const introElements = [...document.querySelectorAll('[data-intro]')];
  const animations = [];
  let frame = 0;

  function updatePhotoPosition() {
    frame = 0;
    if (!photo || !photoWindow || motionPreference.matches) return;
    const bounds = photoWindow.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
    const travel = Math.max(-12, Math.min(12, (window.innerHeight / 2 - bounds.top - bounds.height / 2) * 0.025));
    photo.style.transform = `translateY(${-14 + travel}px)`;
  }

  function requestPhotoUpdate() {
    if (!frame && !motionPreference.matches) frame = window.requestAnimationFrame(updatePhotoPosition);
  }

  function syncMotion() {
    if (motionPreference.matches) {
      animations.forEach(animation => animation.cancel());
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (photo) photo.style.removeProperty('transform');
      window.removeEventListener('scroll', requestPhotoUpdate);
      window.removeEventListener('resize', requestPhotoUpdate);
      return;
    }
    window.addEventListener('scroll', requestPhotoUpdate, { passive: true });
    window.addEventListener('resize', requestPhotoUpdate, { passive: true });
    requestPhotoUpdate();
  }

  if (!motionPreference.matches && typeof Element.prototype.animate === 'function') {
    introElements.forEach((element, index) => {
      const imageShutter = element.classList.contains('hero-figure');
      const keyframes = imageShutter
        ? [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(10px)' }, { clipPath: 'inset(0 0 0% 0)', transform: 'translateY(0)' }]
        : [{ transform: 'translateY(18px)' }, { transform: 'translateY(0)' }];
      animations.push(element.animate(keyframes, {
        duration: imageShutter ? 800 : 620,
        delay: index * 65,
        easing: 'cubic-bezier(.2,.7,.2,1)',
        fill: 'none'
      }));
    });
  }
  syncMotion();
  motionPreference.addEventListener('change', syncMotion);

  const controls = document.querySelector('.viewer-controls');
  const photos = document.querySelector('.work-photos');
  const note = document.querySelector('.photo-note');
  if (!controls || !photos || !note) return;

  const notes = {
    both: 'Два реальных снимка. Ракурс и освещение отличаются.',
    before: 'До реставрации: потёртости кожи сиденья Prado. Ракурс отличается от снимка после.',
    after: 'После реставрации кожи сиденья Prado. Ракурс отличается от снимка до.'
  };
  controls.hidden = false;
  controls.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-controls', photos.id);
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (!Object.hasOwn(notes, view)) return;
      photos.dataset.view = view;
      controls.querySelectorAll('button').forEach(control => {
        control.setAttribute('aria-pressed', String(control === button));
      });
      note.textContent = notes[view];
    });
  });
})();
