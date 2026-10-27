(() => {
  'use strict';

  const frame = document.getElementById('case-frame');
  const caption = document.getElementById('case-caption');
  const controls = document.querySelector('.crop-controls');
  if (!frame || !caption || !controls) return;

  const captions = {
    full: 'Весь кадр: до — слева, после — справа. Ракурсы отличаются.',
    before: 'Увеличен левый фрагмент архивного кадра: кожа до реставрации.',
    after: 'Увеличен правый фрагмент архивного кадра: кожа после реставрации.'
  };

  controls.hidden = false;
  controls.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-crop]');
    if (!button || !controls.contains(button)) return;
    const view = button.dataset.crop;
    if (!Object.prototype.hasOwnProperty.call(captions, view)) return;

    frame.dataset.view = view;
    caption.textContent = captions[view];
    controls.querySelectorAll('button[data-crop]').forEach((control) => {
      control.setAttribute('aria-pressed', String(control === button));
    });
  });
})();
