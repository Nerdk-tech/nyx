/* ============================================================
   Nyx · front end runtime (vanilla, dependency free)
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ============================================================
     1. Ambient particle field
     ============================================================ */
  (function ambient() {
    const canvas = $('#fx');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0, dots = [];

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(80, Math.max(24, Math.floor((w * h) / 26000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.2 + 0.35,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.32 + 0.1,
        hue: Math.random() > 0.84 ? '52,211,153' : '120,158,255'
      }));
    }

    function paint() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            ctx.strokeStyle = 'rgba(120,158,255,' + ((1 - d2 / 14000) * 0.085) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      dots.forEach((d) => {
        if (!reduced) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < -10) d.x = w + 10; if (d.x > w + 10) d.x = -10;
          if (d.y < -10) d.y = h + 10; if (d.y > h + 10) d.y = -10;
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + d.hue + ',' + d.a + ')';
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reduced) raf = requestAnimationFrame(paint);
    }

    build(); paint();
    window.addEventListener('resize', () => { build(); if (reduced) paint(); });
    document.addEventListener('visibilitychange', () => {
      if (reduced) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) paint();
    });
  })();

  /* ============================================================
     2. 3D core: rotating wireframe icosahedron, drag to spin
     ============================================================ */
  (function core() {
    const canvas = $('#core');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const status = $('#stageStatus');

    /* icosahedron */
    const t = (1 + Math.sqrt(5)) / 2;
    const base = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    const norm = Math.sqrt(1 + t * t);
    const verts = base.map((v) => v.map((c) => c / norm));

    /* edges: pairs at near-minimal distance */
    const edges = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const dx = verts[i][0] - verts[j][0];
        const dy = verts[i][1] - verts[j][1];
        const dz = verts[i][2] - verts[j][2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1.11) edges.push([i, j]);
      }
    }

    let W = 0, H = 0, dpr = 1, raf = 0;
    let rotY = 0.4, rotX = -0.28, velY = 0.0026, velX = 0;
    let drag = null;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project(p) {
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      let x = p[0] * cy + p[2] * sy;
      let z = -p[0] * sy + p[2] * cy;
      let y = p[1] * cx - z * sx;
      z = p[1] * sx + z * cx;
      const persp = 2.4 / (2.4 + z * 0.75);
      const R = Math.min(W, H) * 0.33;
      return { x: W / 2 + x * R * persp, y: H / 2 + y * R * persp, z: z, s: persp };
    }

    function draw(time) {
      ctx.clearRect(0, 0, W, H);

      const pts = verts.map(project);
      const pulse = 0.72 + Math.sin(time / 900) * 0.12;

      /* halo */
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.42);
      g.addColorStop(0, 'rgba(91,140,255,' + (0.16 * pulse) + ')');
      g.addColorStop(0.55, 'rgba(91,140,255,0.04)');
      g.addColorStop(1, 'rgba(91,140,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.42, 0, Math.PI * 2);
      ctx.fill();

      /* edges */
      edges.forEach(([a, b]) => {
        const pa = pts[a], pb = pts[b];
        const depth = (pa.z + pb.z) / 2;
        const alpha = 0.16 + Math.max(0, (1 - depth)) * 0.5;
        ctx.strokeStyle = depth > 0.1
          ? 'rgba(52,211,153,' + alpha * 0.7 + ')'
          : 'rgba(120,158,255,' + alpha + ')';
        ctx.lineWidth = depth > 0.1 ? 0.8 : 1.15;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      /* vertices */
      pts.forEach((p) => {
        const r = Math.max(1.1, 2.5 * p.s);
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        halo.addColorStop(0, 'rgba(160,190,255,0.55)');
        halo.addColorStop(1, 'rgba(160,190,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = p.z > 0.1 ? 'rgba(120,240,200,0.95)' : 'rgba(220,232,255,0.95)';
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      });

      /* orbit satellites */
      const R = Math.min(W, H) * 0.42;
      for (let i = 0; i < 3; i++) {
        const ang = time / (1400 + i * 520) + i * 2.1;
        const tilt = 0.42 + i * 0.22;
        const x = W / 2 + Math.cos(ang) * R * 0.92;
        const y = H / 2 + Math.sin(ang) * R * tilt;
        ctx.fillStyle = 'rgba(91,140,255,0.85)';
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(91,140,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(W / 2, H / 2, R * 0.92, R * tilt, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function loop(time) {
      if (!drag) {
        rotY += velY;
        velY += (0.0026 - velY) * 0.02;
        rotX += velX;
        velX *= 0.94;
      }
      draw(time || 0);
      raf = requestAnimationFrame(loop);
    }

    size();
    if (reduced) {
      draw(0);
      window.addEventListener('resize', () => { size(); draw(0); });
    } else {
      raf = requestAnimationFrame(loop);
      window.addEventListener('resize', size);
      document.addEventListener('visibilitychange', () => {
        cancelAnimationFrame(raf);
        if (!document.hidden) raf = requestAnimationFrame(loop);
      });
    }

    /* drag to spin */
    if (finePointer) {
      canvas.addEventListener('pointerdown', (e) => {
        drag = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        rotY += dx * 0.006;
        rotX += dy * 0.004;
        velY = dx * 0.0009;
        velX = dy * 0.0006;
        drag.x = e.clientX; drag.y = e.clientY;
        if (reduced) draw(0);
      });
      canvas.addEventListener('pointerup', () => { drag = null; });
      canvas.addEventListener('pointercancel', () => { drag = null; });
    }

    /* rotating status line */
    if (status) {
      const lines = [
        'idle, waiting for a target',
        'planning: clone + rebuild',
        'building app-debug.apk',
        'driving browser session',
        'deploying to your domain'
      ];
      let i = 0;
      if (!reduced) {
        setInterval(() => {
          i = (i + 1) % lines.length;
          status.style.opacity = '0';
          setTimeout(() => {
            status.textContent = lines[i];
            status.style.opacity = '1';
          }, 260);
        }, 4600);
      }
      status.style.transition = 'opacity .26s ease';
    }
  })();

  /* ============================================================
     3. Reveal on scroll
     ============================================================ */
  (function reveals() {
    const items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el, i) => {
      el.style.transitionDelay = Math.min(i * 40, 240) + 'ms';
      io.observe(el);
    });
  })();

  /* ============================================================
     4. 3D tilt on bento cards
     ============================================================ */
  (function tilt() {
    if (!finePointer || reduced) return;
    $$('.tilt').forEach((card) => {
      let raf = 0;
      function move(e) {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform =
            'rotateX(' + ((0.5 - py) * 7).toFixed(2) + 'deg) rotateY(' +
            ((px - 0.5) * 9).toFixed(2) + 'deg) translateY(-3px)';
          card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
      }
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        card.style.transform = '';
      });
    });
  })();

  /* ============================================================
     5. Pricing toggle
     ============================================================ */
  (function pricing() {
    const buttons = $$('.toggle-btn');
    if (!buttons.length) return;

    function setPeriod(period) {
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.period === period));
      $$('.tier-price').forEach((price) => {
        const amt = $('.amt', price);
        const per = $('.per', price);
        if (amt) amt.textContent = amt.dataset[period];
        if (per) per.textContent = per.dataset[period];
      });
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => setPeriod(btn.dataset.period));
    });
  })();

  /* ============================================================
     6. Copy the API snippet
     ============================================================ */
  (function copySnippet() {
    const btn = $('#copyBtn');
    const block = $('.code-block code');
    if (!btn || !block) return;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.innerText);
        btn.textContent = 'copied';
        setTimeout(() => { btn.textContent = 'copy'; }, 1800);
      } catch (e) {
        /* fallback for browsers without clipboard permission */
        const ta = document.createElement('textarea');
        ta.value = block.innerText;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); btn.textContent = 'copied'; }
        catch (err) { btn.textContent = 'select all'; }
        document.body.removeChild(ta);
        setTimeout(() => { btn.textContent = 'copy'; }, 1800);
      }
    });
  })();

  /* ============================================================
     7. App state
     ============================================================ */
  const state = {
    signedIn: false,
    name: 'User Name',
    email: '',
    sent: 0,
    limit: 40,
    artifacts: 0,
    attachments: [],
    busy: false
  };

  const els = {
    landing: $('#landing'), app: $('#app'), authModal: $('#authModal'),
    messages: $('#messages'), composer: $('#composer'), input: $('#input'),
    sendBtn: $('#sendBtn'), attachBtn: $('#attachBtn'), attachRow: $('#attachRow'),
    fileInput: $('#fileInput'), userName: $('#userName'), userAvatar: $('#userAvatar'),
    sessionTitle: $('#sessionTitle'), msgUsed: $('#msgUsed'), meterFill: $('#meterFill'),
    artifactCount: $('#artifactCount'), sidebar: $('#sidebar'), scrim: $('#sbScrim'),
    rightpanel: $('#rightpanel'), profileMenu: $('#profileMenu'), toast: $('#toast'),
    fileCount: $('#fileCount')
  };

  let toastTimer = 0;
  function toast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function showApp() {
    els.landing.hidden = true;
    els.app.hidden = false;
    state.signedIn = true;
    document.body.style.overflow = 'hidden';
    if (!els.messages.dataset.booted) { renderEmpty(); els.messages.dataset.booted = '1'; }
    setTimeout(() => els.input && els.input.focus(), 120);
  }
  function showLanding() {
    els.app.hidden = true;
    els.landing.hidden = false;
    state.signedIn = false;
    document.body.style.overflow = '';
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  const openModal = () => {
    els.authModal.hidden = false;
    setTimeout(() => $('#emailInput') && $('#emailInput').focus(), 150);
  };
  const closeModal = () => { els.authModal.hidden = true; };

  function signIn(kind) {
    const fromEmail = (state.email || '').split('@')[0];
    let name = 'User Name';
    if (kind === 'google') name = 'Ada Lovelace';
    else if (fromEmail) {
      name = fromEmail.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 24);
    }
    state.name = name || 'User Name';
    els.userName.textContent = state.name;
    els.userAvatar.textContent = state.name.trim().charAt(0).toUpperCase() || 'U';
    closeModal(); showApp(); toast('Signed in as ' + state.name);
  }

  $$('[data-auth]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const kind = btn.getAttribute('data-auth');
      openModal();
      if (kind === 'google') setTimeout(() => signIn('google'), 420);
    });
  });
  $$('[data-close]').forEach((el) => el.addEventListener('click', closeModal));

  const googleBtn = $('#googleBtn');
  if (googleBtn) googleBtn.addEventListener('click', () => signIn('google'));

  const emailForm = $('#emailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = ($('#emailInput').value || '').trim();
      if (!value) return;
      state.email = value;
      signIn('email');
    });
  }

  function openSidebar() { els.sidebar.classList.add('open'); els.scrim.hidden = false; }
  function closeSidebar() { els.sidebar.classList.remove('open'); if (els.scrim) els.scrim.hidden = true; }

  const sbOpen = $('#sbOpen'), sbClose = $('#sbClose');
  if (sbOpen) sbOpen.addEventListener('click', openSidebar);
  if (sbClose) sbClose.addEventListener('click', closeSidebar);
  if (els.scrim) els.scrim.addEventListener('click', closeSidebar);

  const profileBtn = $('#profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      els.profileMenu.hidden = !els.profileMenu.hidden;
    });
    document.addEventListener('click', (event) => {
      if (!els.profileMenu.hidden && !els.profileMenu.contains(event.target)) els.profileMenu.hidden = true;
    });
  }

  $$('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const action = btn.getAttribute('data-menu');
      els.profileMenu.hidden = true;
      if (action === 'logout') { showLanding(); resetChat(); toast('Signed out'); }
      else if (action === 'upgrade') toast('Checkout is not wired up in this demo');
      else toast('Settings are not wired up in this demo');
    });
  });

  $$('.sb-nav a').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      $$('.sb-nav a').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      closeSidebar();
      if (link.dataset.nav !== 'chat') toast(link.textContent.trim() + ' is a demo panel');
    });
  });

  const brandHome = $('#brandHome');
  if (brandHome) brandHome.addEventListener('click', (event) => { event.preventDefault(); showLanding(); });

  const togglePanel = $('#togglePanel');
  if (togglePanel) togglePanel.addEventListener('click', () => els.rightpanel.classList.toggle('open'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      if (els.profileMenu) els.profileMenu.hidden = true;
      closeSidebar();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (state.signedIn) els.input.focus(); else openModal();
    }
  });

  /* ============================================================
     8. Chat rendering
     ============================================================ */
  const NYX_MARK = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 18V6l12 12V6" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>';
  const FILE_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h7l5 5v13H6V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13 3v5h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

  const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scrollDown(force) {
    const box = els.messages;
    if (!box) return;
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 220;
    if (force || near) box.scrollTop = box.scrollHeight;
  }

  function renderEmpty() {
    els.messages.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'empty';
    wrap.innerHTML =
      '<div class="empty-mark">' + NYX_MARK + '</div>' +
      '<h2>What should Nyx handle?</h2>' +
      '<p>Describe the outcome. Apps, code, research, browser work, hosting. Then go relax.</p>' +
      '<div class="chips">' +
        '<button class="chip" data-prompt="Build a finance tracker app and package it as an APK">Build an app</button>' +
        '<button class="chip" data-prompt="Clone https://vercel.com and rebuild it in plain HTML">Clone a site</button>' +
        '<button class="chip" data-prompt="Run recon on api.acme.io and list every endpoint">Run recon</button>' +
        '<button class="chip" data-prompt="Look at this screenshot and rebuild the layout">Read a screenshot</button>' +
        '<button class="chip" data-prompt="Host this on a temporary URL, then deploy to my domain">Host it</button>' +
      '</div>';
    els.messages.appendChild(wrap);
    $$('.chip', wrap).forEach((chip) => {
      chip.addEventListener('click', () => {
        els.input.value = chip.getAttribute('data-prompt');
        autoGrow(); els.input.focus();
      });
    });
  }

  function resetChat() {
    els.messages.innerHTML = '';
    els.messages.dataset.booted = '';
    state.artifacts = 0;
    if (els.artifactCount) els.artifactCount.textContent = '0';
    if (els.sessionTitle) els.sessionTitle.textContent = 'New session';
    renderEmpty();
  }

  function addUserMessage(text, files) {
    const row = document.createElement('div');
    row.className = 'msg user';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = state.name.trim().charAt(0).toUpperCase() || 'U';
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.innerHTML = '<span class="msg-name">' + escapeHtml(state.name) + '</span><span>' + timeNow() + '</span>';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    if (files && files.length) {
      files.forEach((f) => {
        const chip = document.createElement('div');
        chip.className = 'artifact';
        chip.innerHTML = FILE_ICON + '<span>' + escapeHtml(f) + '</span><span class="size">attached</span>';
        bubble.appendChild(chip);
      });
    }
    wrap.appendChild(meta); wrap.appendChild(bubble);
    row.appendChild(avatar); row.appendChild(wrap);
    els.messages.appendChild(row);
    scrollDown(true);
  }

  function addNyxShell() {
    const row = document.createElement('div');
    row.className = 'msg nyx';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = NYX_MARK;
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.innerHTML = '<span class="msg-name">Nyx</span><span>' + timeNow() + '</span>';
    wrap.appendChild(meta);
    row.appendChild(avatar); row.appendChild(wrap);
    els.messages.appendChild(row);
    scrollDown(true);
    return wrap;
  }

  function addThinking(wrap, steps) {
    const block = document.createElement('div');
    block.className = 'think open eq';
    block.innerHTML =
      '<button class="think-head" type="button">' +
        '<svg class="think-spark" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
        '<span class="think-label">Summary</span>' +
        '<span class="think-now">Analyzing request...</span>' +
        '<svg class="think-caret" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<div class="think-body"></div>';

    const body = $('.think-body', block);
    const now = $('.think-now', block);
    $('.think-head', block).addEventListener('click', () => block.classList.toggle('open'));

    const rows = steps.map((label) => {
      const step = document.createElement('div');
      step.className = 'think-step';
      step.innerHTML = '<span class="tick"></span><span>' + escapeHtml(label) + '</span>';
      body.appendChild(step);
      return step;
    });

    wrap.appendChild(block);
    scrollDown(true);

    return {
      setActive(index, text) {
        rows.forEach((r, i) => {
          r.classList.toggle('done', i < index);
          r.classList.toggle('active', i === index);
        });
        if (text) now.textContent = text;
      },
      finish() {
        rows.forEach((r) => { r.classList.remove('active'); r.classList.add('done'); });
        block.classList.remove('eq');
        now.textContent = 'done';
        block.classList.remove('open');
      }
    };
  }

  function addNyxReply(wrap, html, artifact) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = html;
    if (artifact) {
      const a = document.createElement('div');
      a.className = 'artifact';
      a.innerHTML = FILE_ICON + '<span>' + escapeHtml(artifact.name) + '</span><span class="size">' + escapeHtml(artifact.size) + '</span>';
      bubble.appendChild(a);
      state.artifacts += 1;
      if (els.artifactCount) els.artifactCount.textContent = String(state.artifacts);
    }
    wrap.appendChild(bubble);
    scrollDown(true);
  }

  /* ============================================================
     9. Mock agent: plan + reply per intent
     ============================================================ */
  function plan(text) {
    const t = text.toLowerCase();

    if (/(screenshot|image|photo|vision|look at|see this|ocr)/.test(t)) {
      return {
        steps: ['Reading image', 'Extracting layout', 'Mapping components', 'Executing tools', 'Drafting rebuild'],
        reply:
          '<p>I read it. Two column layout, glass sidebar on the left, dense table with a sticky header, floating action bar pinned bottom right.</p>' +
          '<p>Type scale looks like 14px body against a 32px display. The accent is a saturated blue on near black, roughly <code>#5B8CFF</code> on <code>#0A0A0A</code>.</p>' +
          '<p>Want it as working HTML, or the component tree first?</p>',
        artifact: null
      };
    }

    if (/https?:\/\/|(clone|mirror|rebuild).*(site|web|app)/.test(t)) {
      return {
        steps: ['Analyzing target', 'Mapping routes and assets', 'Cloning structure', 'Executing tools', 'Packaging build'],
        reply:
          '<p>Target analyzed. I mirrored <strong>214 files</strong> across <strong>37 routes</strong> and rebuilt the layout as clean semantic HTML, so you own the code.</p>' +
          '<p>Proprietary scripts were replaced with vanilla equivalents. The interactions survive, the dependencies do not.</p>' +
          '<ul><li>Assets localised, font licensing flagged</li><li>Forms wired to a stub handler</li><li>Breakpoints reconstructed by hand</li></ul>' +
          '<p>Say the word and I port it to Next.js, or ship it as is.</p>',
        artifact: { name: 'site-clone.zip', size: '4.2 MB' }
      };
    }

    if (/\b(recon|scrape|scraping|scan|enumerate|endpoints?|headers|osint)\b/.test(t)) {
      return {
        steps: ['Resolving host', 'Fingerprinting stack', 'Enumerating endpoints', 'Executing tools', 'Compiling report'],
        reply:
          '<p>Recon complete. The surface is smaller than it looks.</p>' +
          '<ul><li><strong>Stack</strong>: Next.js behind Cloudflare</li><li><strong>Endpoints</strong>: 3 public, 1 returning <code>200</code> without auth it should not have</li><li><strong>Headers</strong>: missing <code>Content-Security-Policy</code></li></ul>' +
          '<p>The unauthenticated route is the interesting one. Want the request chain, or just reproduction steps?</p>',
        artifact: { name: 'recon-report.json', size: '62 KB' }
      };
    }

    if (/\b(apk|android|ios|exe|mobile|build|app)\b/.test(t)) {
      return {
        steps: ['Parsing requirements', 'Scaffolding project', 'Writing core screens', 'Building artifacts', 'Packaging'],
        reply:
          '<p>Built and packaged. Three targets from one codebase, no native rewrites.</p>' +
          '<ul><li><strong>Android</strong>: signed debug APK, 8.4 MB</li><li><strong>iOS</strong>: unsigned IPA, 11.2 MB</li><li><strong>Windows</strong>: portable EXE, 6.1 MB</li></ul>' +
          '<p>Signing keys are stubbed. Drop your keystore in and the APK ships release ready.</p>',
        artifact: { name: 'nyx-build.zip', size: '18.7 MB' }
      };
    }

    if (/\b(host|hosting|deploy|serve|preview|domain|vps)\b/.test(t)) {
      return {
        steps: ['Preparing build', 'Bundling assets', 'Starting runtime', 'Executing tools', 'Publishing'],
        reply:
          '<p>Live on a temporary URL, good for 24 hours: <code>nyx-4f2a.nyx.run</code></p>' +
          '<p>When you are ready for the permanent one, give me your domain and host credentials and I deploy straight to your account. The infrastructure stays in your name, not mine.</p>',
        artifact: { name: 'runtime-url.txt', size: '1 KB' }
      };
    }

    return {
      steps: ['Analyzing request', 'Planning approach', 'Executing tools', 'Reviewing output'],
      reply:
        '<p>On it. I broke this into a short plan and started working instead of guessing.</p>' +
        '<p>Give me one more constraint and I move faster: the target platform, or whether this should stay private.</p>',
      artifact: null
    };
  }

  async function send(text) {
    if (state.busy) return;
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    state.busy = true;
    els.sendBtn.disabled = true;

    const empty = $('.empty', els.messages);
    if (empty) empty.remove();

    addUserMessage(trimmed, state.attachments);
    clearAttachments();

    if (els.sessionTitle && els.sessionTitle.textContent === 'New session') {
      els.sessionTitle.textContent = trimmed.slice(0, 48);
    }

    els.input.value = '';
    autoGrow();

    const flow = plan(trimmed);
    const wrap = addNyxShell();
    const think = addThinking(wrap, flow.steps);

    for (let i = 0; i < flow.steps.length; i++) {
      think.setActive(i, flow.steps[i] + '...');
      markTool(i);
      await wait(reduced ? 120 : 620 + Math.random() * 340);
    }

    think.finish();
    clearTools();
    addNyxReply(wrap, flow.reply, flow.artifact);

    state.sent += 1;
    updateUsage();

    state.busy = false;
    els.sendBtn.disabled = false;
    els.input.focus();
  }

  function markTool(index) {
    const tools = $$('.tool');
    tools.forEach((t) => t.classList.remove('busy'));
    if (index === 0) return;
    const tool = tools[(index - 1) % tools.length];
    if (tool) tool.classList.add('busy');
  }
  function clearTools() { $$('.tool').forEach((t) => t.classList.remove('busy')); }

  function updateUsage() {
    const pct = Math.min(100, Math.round((state.sent / state.limit) * 100));
    if (els.msgUsed) els.msgUsed.textContent = String(state.sent);
    if (els.meterFill) els.meterFill.style.width = pct + '%';
    if (els.fileCount) els.fileCount.textContent = String(3 + state.artifacts);
  }

  function autoGrow() {
    const el = els.input;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }

  if (els.input) {
    els.input.addEventListener('input', autoGrow);
    els.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send(els.input.value);
      }
    });
  }
  if (els.composer) {
    els.composer.addEventListener('submit', (event) => {
      event.preventDefault();
      send(els.input.value);
    });
  }
  if (els.attachBtn) els.attachBtn.addEventListener('click', () => els.fileInput.click());
  if (els.fileInput) {
    els.fileInput.addEventListener('change', () => {
      Array.from(els.fileInput.files || []).forEach((file) => {
        state.attachments.push(file.name);
        renderAttachments();
      });
      els.fileInput.value = '';
    });
  }

  function renderAttachments() {
    els.attachRow.innerHTML = '';
    if (!state.attachments.length) { els.attachRow.hidden = true; return; }
    els.attachRow.hidden = false;
    state.attachments.forEach((name, index) => {
      const chip = document.createElement('span');
      chip.className = 'attach-chip';
      chip.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h7l5 5v13H6V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>' +
        '<span>' + escapeHtml(name) + '</span>' +
        '<button type="button" aria-label="Remove attachment"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
      $('button', chip).addEventListener('click', () => {
        state.attachments.splice(index, 1);
        renderAttachments();
      });
      els.attachRow.appendChild(chip);
    });
  }
  function clearAttachments() { state.attachments = []; renderAttachments(); }

  const clearBtn = $('#clearChat');
  if (clearBtn) clearBtn.addEventListener('click', () => { resetChat(); toast('Session cleared'); });

  const newSession = $('#newSession');
  if (newSession) {
    newSession.addEventListener('click', () => {
      resetChat(); closeSidebar(); els.input.focus(); toast('New session started');
    });
  }

  $$('.recent-item').forEach((item) => {
    item.addEventListener('click', () => {
      const seed = item.getAttribute('data-seed');
      const prompts = {
        clone: 'Clone https://target.app and rebuild it as static HTML',
        build: 'Build a finance tracker app and package it as an APK',
        recon: 'Run recon on api.acme.io and list every endpoint'
      };
      els.input.value = prompts[seed] || item.textContent;
      autoGrow(); els.input.focus(); closeSidebar();
    });
  });

  autoGrow();
  updateUsage();
  window.addEventListener('resize', autoGrow);
})();
