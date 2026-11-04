/* Shared navbar, menu and footer behaviour for the story pages (mirrors the home page). */
(function(){
  const more = document.getElementById('navMore');
  const row = document.getElementById('menuRow');
  function open(){ row.classList.add('open'); more.setAttribute('aria-expanded','true'); more.setAttribute('aria-label','Close menu'); }
  function close(){ row.classList.remove('open'); more.setAttribute('aria-expanded','false'); more.setAttribute('aria-label','Open menu'); }
  more?.addEventListener('click', (e) => { e.preventDefault(); row.classList.contains('open') ? close() : open(); });
  row?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('click', (e) => {
    if (!row || !row.classList.contains('open')) return;
    if (!(row.contains(e.target) || more.contains(e.target))) close();
  });
  window.addEventListener('scroll', () => { if (row && row.classList.contains('open')) close(); }, { passive:true });

  // T&C sheet
  const tOpen = document.getElementById('tncOpen'), tClose = document.getElementById('tncClose'), ov = document.getElementById('tncOverlay');
  const show = (e) => { if (e) e.preventDefault(); ov.classList.add('open'); ov.setAttribute('aria-hidden','false'); };
  const hide = () => { ov.classList.remove('open'); ov.setAttribute('aria-hidden','true'); };
  tOpen?.addEventListener('click', show);
  tClose?.addEventListener('click', hide);
  ov?.addEventListener('click', (e) => { if (e.target === ov) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ close(); if (ov) hide(); } });
})();
