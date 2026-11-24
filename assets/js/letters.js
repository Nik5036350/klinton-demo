// Recommendation letters: opens a letter in a dialog instead of leaving the
// page. Without this script each thumbnail is a plain link to the full image.
// The dialog closes with Escape, the close button, a click outside the letter,
// and the browser's back button; focus returns to the thumbnail.

import { track } from './app.js';

const links = document.querySelectorAll('a[data-letter]');

if (links.length && typeof HTMLDialogElement === 'function') {
  const dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.setAttribute('aria-labelledby', 'viewer-title');
  dialog.innerHTML = '<div class="viewer__bar"><span class="viewer__title" id="viewer-title"></span>'
    + '<button class="viewer__close" type="button">Закрыть</button></div><img alt="" decoding="async">';
  document.body.append(dialog);
  const title = dialog.querySelector('.viewer__title');
  const img = dialog.querySelector('img');
  let opener = null;
  let pushed = false;

  const close = () => {
    if (dialog.open) dialog.close();
  };

  dialog.addEventListener('close', () => {
    img.removeAttribute('src');
    if (pushed) {
      pushed = false;
      history.back();
    }
    opener?.focus();
  });
  dialog.querySelector('.viewer__close').addEventListener('click', close);
  // a click on the backdrop lands on the dialog element itself
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  window.addEventListener('popstate', () => {
    if (dialog.open) {
      pushed = false;
      dialog.close();
    }
  });

  for (const link of links) {
    link.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      opener = link;
      title.textContent = link.dataset.title || '';
      img.alt = link.dataset.title || 'Рекомендательное письмо';
      img.src = link.href;
      dialog.showModal();
      history.pushState({ letter: true }, '');
      pushed = true;
      track('letter_open', { letter: link.pathname.split('/').pop() });
    });
  }
}
