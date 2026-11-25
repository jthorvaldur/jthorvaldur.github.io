'use strict';
(async function openAtlas() {
  const title = document.getElementById('map-title');
  if (!window.DecompressionStream) {
    title.textContent = 'Open this review in a current version of Safari, Chrome, Firefox or Edge.';
    return;
  }
  try {
    const edition = document.getElementById('edition');
    const bytes = Uint8Array.from(atob(edition.textContent), c => c.charCodeAt(0));
    edition.remove();
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data = await new Response(stream).json();
    startDirectoryAtlas(data);
  } catch {
    title.textContent = 'The atlas could not open. Reload the review to try again.';
  }
})();
