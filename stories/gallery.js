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
  // step with a short slide: the photo leaves toward the swipe and the next
  // one comes in from the other side
  let sliding = false, pending = 0;
  function step(d, fromX){
    if (srcs.length < 2) return;
    if (sliding){ pending = d; return; }               // queue it; runs as soon as this slide ends
    sliding = true;
    const w = Math.min(window.innerWidth * 0.35, 260);
    const out = lbImg.animate(
      [{ transform: `translateX(${fromX || 0}px)`, opacity: 1 }, { transform: `translateX(${-d * w}px)`, opacity: 0 }],
      { duration: 140, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    out.onfinish = () => {
      show((current + d + srcs.length) % srcs.length);
      const go = () => {
        out.cancel();
        lbImg.animate(
          [{ transform: `translateX(${d * w}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
          { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => {
            sliding = false;
            if (pending){ const p = pending; pending = 0; step(p); }
          };
      };
      if (lbImg.decode) lbImg.decode().then(go, go); else go();
    };
  }

  // ---- swipe / drag the open photo (finger, pen or mouse) ----
  let sx = 0, sy = 0, dx = 0, st = 0, swiping = false, axis = null, lbMoved = false;
  lb.addEventListener('pointerdown', (e) => {
    if (!lb.classList.contains('open') || e.target.closest('button') || sliding) return;
    swiping = true; axis = null; lbMoved = false;
    sx = e.clientX; sy = e.clientY; dx = 0; st = performance.now();
  });
  window.addEventListener('pointermove', (e) => {
    if (!swiping) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (!axis && Math.hypot(mx, my) > 8) axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (axis !== 'x') return;
    lbMoved = true;
    dx = mx;
    lbImg.style.transition = 'none';
    lbImg.style.transform = `translateX(${dx}px)`;
    lbImg.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 600));
  });
  function endSwipe(){
    if (!swiping) return;
    swiping = false;
    if (axis !== 'x'){ return; }
    const v = dx / Math.max(1, performance.now() - st);          // px per ms
    const go = Math.abs(dx) > Math.min(90, window.innerWidth * 0.18) || Math.abs(v) > 0.45;
    lbImg.style.transform = ''; lbImg.style.opacity = ''; lbImg.style.transition = '';
    if (go && srcs.length > 1) step(dx < 0 ? 1 : -1, dx);
    else lbImg.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
                       { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  window.addEventListener('pointerup', endSwipe);
  window.addEventListener('pointercancel', endSwipe);
  lbImg.addEventListener('dragstart', (e) => e.preventDefault());
  lb.style.touchAction = 'none';

  // ---- trackpad / mouse wheel: one swipe = one photo ----
  // Fires as soon as a swipe has clearly started, then ignores the trackpad's
  // momentum tail. A new swipe is recognised either after a short pause or when
  // the deltas start rising again (momentum only ever decays).
  let wAcc = 0, wLocked = false, wLast = 0, wPeak = 0, wMin = Infinity, wDecay = false;
  lb.addEventListener('wheel', (e) => {
    if (!lb.classList.contains('open')) return;
    e.preventDefault();
    let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) d *= 40;
    const now = performance.now(), mag = Math.abs(d);
    let fresh = now - wLast > 140;
    if (wLocked && !fresh){
      // after a swipe fires: watch its momentum die down; a clear rise after
      // that is the next swipe
      wPeak = Math.max(wPeak, mag);
      if (mag < wPeak * 0.6) wDecay = true;
      if (wDecay){ wMin = Math.min(wMin, mag); if (mag > wMin * 2 + 4) fresh = true; }
    }
    wLast = now;
    if (fresh){ wLocked = false; wAcc = 0; }
    if (wLocked) return;
    wAcc += d;
    if (Math.abs(wAcc) >= 14){
      step(wAcc > 0 ? 1 : -1);
      wLocked = true; wAcc = 0; wPeak = mag; wMin = Infinity; wDecay = false;
    }
  }, { passive:false });

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); step(1); });
  lb.addEventListener('click', (e) => { if (e.target === lb && !lbMoved) close(); lbMoved = false; });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  // ---- Fish-eye strip: the centre photo is large, neighbours shrink toward the
  // edges and tuck under each other. Wheel / trackpad / drag glides it; a soft
  // spring settles on the nearest photo. ----
  gallery.classList.add('strip');
  const cards = [];
  let pos = 0, target = 0, vel = 0, raf = null, lastT = 0, dragging = false;
  const K = 105, C = 2 * Math.sqrt(K) * 0.76;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lastIdx = () => Math.max(0, cards.length - 1);

  // the minimal glider underneath: a hairline with a yellow circle
  const glider = document.createElement('div');
  glider.className = 'glider';
  glider.innerHTML = '<div class="glider-track"><span class="glider-dot"></span></div>';
  gallery.insertAdjacentElement('afterend', glider);
  const track = glider.querySelector('.glider-track'), dot = glider.querySelector('.glider-dot');

  function dims(){
    const h = gallery.clientHeight, w = gallery.clientWidth;
    let H = Math.min(h * 0.74, 440);
    let W = H * 0.8;
    if (W > w * 0.62){ W = w * 0.62; H = W / 0.8; }
    return { H, W };
  }
  function paint(){
    const { H, W } = dims(), k = 0.9;
    cards.forEach((c, i) => {
      const d = i - pos, a = Math.abs(d), s = 1 / (1 + k * a);
      const x = Math.sign(d) * W * Math.log(1 + k * a) / k;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
      c.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(2)}px) scale(${s.toFixed(4)})`;
      c.style.zIndex = String(1000 - Math.round(a * 10));
      c.style.opacity = a > 9 ? Math.max(0, 10 - a).toFixed(3) : '1';
      c.style.filter = a > 0.02 ? `brightness(${(1 - Math.min(0.3, a * 0.045)).toFixed(3)})` : '';
    });
    const f = lastIdx() ? pos / lastIdx() : 0;
    dot.style.left = (clamp(f, 0, 1) * 100).toFixed(3) + '%';
  }
  function frame(t){
    const dt = Math.min(0.033, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
    if (!dragging){
      vel += (K * (target - pos) - C * vel) * dt; pos += vel * dt;
      if (Math.abs(target - pos) < 0.0008 && Math.abs(vel) < 0.002){ pos = target; vel = 0; }
    }
    paint();
    if (dragging || pos !== target) raf = requestAnimationFrame(frame);
    else { raf = null; lastT = 0; }
  }
  const kick = () => { if (!raf){ lastT = 0; raf = requestAnimationFrame(frame); } };
  const go = (i) => { target = clamp(Math.round(i), 0, lastIdx()); kick(); };

  // wheel / trackpad (vertical or sideways both move the strip)
  let settle = null;
  window.addEventListener('wheel', (e) => {
    if (!cards.length || lb.classList.contains('open') || e.ctrlKey) return;
    let dy = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode === 1) dy *= 40;
    const atStart = target <= 0.001 && dy < 0, atEnd = target >= lastIdx() - 0.001 && dy > 0;
    if (atStart || atEnd) return;                         // let the page scroll to the footer
    e.preventDefault();
    target = clamp(target + dy / (dims().W * 0.7), 0, lastIdx());
    kick();
    clearTimeout(settle);
    settle = setTimeout(() => go(target), 160);
  }, { passive:false });

  // drag / swipe on the strip
  let px = null, pos0 = 0, moved = 0, lx = 0, lt = 0, vx = 0, downCard = null;
  gallery.addEventListener('pointerdown', (e) => {
    downCard = e.target.closest ? e.target.closest('.g-card') : null;   // remember what was pressed
    px = lx = e.clientX; lt = performance.now(); pos0 = pos; moved = 0; vx = 0;
    dragging = true; vel = 0; kick();
    gallery.setPointerCapture && gallery.setPointerCapture(e.pointerId);
  });
  gallery.addEventListener('pointermove', (e) => {
    if (px === null) return;
    const dx = e.clientX - px; moved = Math.max(moved, Math.abs(dx));
    const now = performance.now(); vx = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now;
    let p = pos0 - dx / (dims().W * 0.75);
    if (p < 0) p = p * 0.3; else if (p > lastIdx()) p = lastIdx() + (p - lastIdx()) * 0.3;
    pos = p;
  });
  const up = (e) => {
    if (px === null) return;
    px = null; dragging = false;
    if (moved < 6){                                       // a tap, not a drag
      const el = downCard;
      const i = el ? cards.indexOf(el) : -1;
      if (i >= 0){ if (i === Math.round(pos)) show(i); else go(i); return; }
    }
    vel = -vx * 1000 / (dims().W * 0.75);
    go(pos + vel * 0.18);
  };
  gallery.addEventListener('pointerup', up);
  gallery.addEventListener('pointercancel', up);

  // glider: click or drag along the line
  let gl = false;
  const seek = (e) => { const r = track.getBoundingClientRect(); target = clamp((e.clientX - r.left) / r.width, 0, 1) * lastIdx(); kick(); };
  track.addEventListener('pointerdown', (e) => { gl = true; track.setPointerCapture && track.setPointerCapture(e.pointerId); seek(e); });
  track.addEventListener('pointermove', (e) => { if (gl) seek(e); });
  track.addEventListener('pointerup', () => { gl = false; go(target); });
  track.addEventListener('pointercancel', () => { gl = false; go(target); });

  document.addEventListener('keydown', (e) => {
    if (lb.classList.contains('open')) return;
    if (e.key === 'ArrowRight'){ e.preventDefault(); go(target + 1); }
    if (e.key === 'ArrowLeft'){ e.preventDefault(); go(target - 1); }
  });
  window.addEventListener('resize', paint, { passive:true });

  function makeCard(src, n){
    srcs.push(src);
    const a = document.createElement('a');
    a.className = 'g-card';
    a.href = src;
    a.setAttribute('aria-label', folder + ' photo ' + n);
    a.draggable = false;
    a.addEventListener('click', (e) => e.preventDefault());
    const d = document.createElement('div');
    d.className = 'g-media';
    d.style.backgroundImage = "url('" + src + "')";
    a.appendChild(d);
    cards.push(a);
    requestAnimationFrame(paint);
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
