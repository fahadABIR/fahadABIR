/* Auto-loads every image in a category folder without hardcoding each file.
   Static sites can't list a directory, so we probe sequential filenames
   (<prefix>1, <prefix>2, ...) and keep the ones that exist. Gaps are tolerated
   up to STOP_AFTER_MISSES consecutive missing numbers, and a few extensions
   are tried for each index. Clicking a photo opens an in-page lightbox. */
(function(){
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;

  const folder = gallery.getAttribute('data-folder');
  const prefix = gallery.getAttribute('data-prefix') || folder;
  if (!folder) return;

  const MAX = 80;               // hard upper bound on how many to probe
  const STOP_AFTER_MISSES = 20; // give up after this many consecutive gaps
  const EXTS = ['jpg','jpeg','png','webp','JPG','JPEG','PNG'];

  let misses = 0;
  const srcs = [];              // in-order list of found image URLs (for the lightbox)

  // ---- Lightbox ----
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML =
    '<button class="lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
    '<img class="lb-img" alt="" />' +
    '<button class="lb-next" aria-label="Next">&#8250;</button>';
  document.body.appendChild(lb);

  const lbImg = lb.querySelector('.lb-img');
  let current = -1;

  function show(i){
    if (i < 0 || i >= srcs.length) return;
    current = i;
    lbImg.src = srcs[i];
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function step(d){ show((current + d + srcs.length) % srcs.length); }

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); step(1); });
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  // ---- Cards ----
  function makeCard(src, n){
    const idx = srcs.length;
    srcs.push(src);
    const a = document.createElement('a');
    a.className = 'g-card';
    a.href = src;
    a.setAttribute('aria-label', folder + ' photo ' + n);
    a.addEventListener('click', (e) => { e.preventDefault(); show(idx); });
    const d = document.createElement('div');
    d.className = 'g-media';
    d.style.backgroundImage = "url('" + src + "')";
    a.appendChild(d);
    return a;
  }

  // Try each extension for a given index; cb(src|null)
  function tryLoad(n, extIdx, cb){
    if (extIdx >= EXTS.length){ cb(null); return; }
    const src = '../assets/' + folder + '/' + prefix + n + '.' + EXTS[extIdx];
    const img = new Image();
    img.onload = () => cb(src);
    img.onerror = () => tryLoad(n, extIdx + 1, cb);
    img.src = src;
  }

  function probe(n){
    if (n > MAX || misses >= STOP_AFTER_MISSES){
      if (!gallery.children.length){
        const note = document.createElement('p');
        note.className = 'g-empty';
        note.textContent = 'No photos yet.';
        gallery.appendChild(note);
      }
      return;
    }
    tryLoad(n, 0, (src) => {
      if (src){ misses = 0; gallery.appendChild(makeCard(src, n)); }
      else { misses++; }
      probe(n + 1);
    });
  }

  probe(1);
})();
