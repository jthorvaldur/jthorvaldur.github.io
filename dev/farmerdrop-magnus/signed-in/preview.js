// Keep review interactions on the static page. Only the layout is under review.
const menu = document.querySelector('#review-menu');
const notice = document.querySelector('#review-note');
const menuButton = document.querySelector('#open-menu');
menuButton.addEventListener('click', () => menu.showModal());
document.querySelector('#menu-home').addEventListener('click', () => menu.close());
for (const action of document.querySelectorAll('[data-preview]')) {
  action.addEventListener('click', event => {
    event.preventDefault();
    if (menu.open) menu.close();
    document.querySelector('#review-heading').textContent = action.dataset.preview;
    notice.showModal();
  });
}
