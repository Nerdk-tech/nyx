/* ============================================================
   Nyx · app shell logic (vanilla, no dependencies)
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Ambient background: drifting particles + faint grid
     --------------------------------------------------------- */
  (function ambient() {
    const canvas = $('#fx');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0;
    let dots = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 22000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.25 + 0.35,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        a: Math.random() * 0.35 + 0.12,
        hue: Math.random() > 0.82 ? '52,211,153' : '120,158,255'
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      /* connection lines between close dots */
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < 15000) {
            const alpha = (1 - dist / 15000) * 0.09;
            ctx.strokeStyle = 'rgba(120,158,255,' + alpha + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10;
        if (d.y > h + 10) d.y = -10;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + d.hue + ',' + d.a + ')';
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    if (!prefersReduced) frame();
    else frame_once();

    function frame_once() {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + d.hue + ',' + d.a + ')';
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (prefersReduced) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        cancelAnimationFrame(raf);
        frame();
      }
    });
  })();

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */
  const state = {
    signedIn: false,
    name: 'User Name',
    email: '',
    plan: 'free',
    sent: 0,
    limit: 20,
    artifacts: 0,
    attachments: [],
    busy: false
  };

  const els = {
    landing: $('#landing'),
    app: $('#app'),
    authModal: $('#authModal'),
    messages: $('#messages'),
    composer: $('#composer'),
    input: $('#input'),
    sendBtn: $('#sendBtn'),
    attachBtn: $('#attachBtn'),
    attachRow: $('#attachRow'),
    fileInput: $('#fileInput'),
    userName: $('#userName'),
    userAvatar: $('#userAvatar'),
    sessionTitle: $('#sessionTitle'),
    msgUsed: $('#msgUsed'),
    meterFill: $('#meterFill'),
    artifactCount: $('#artifactCount'),
    sidebar: $('#sidebar'),
    scrim: $('#sbScrim'),
    rightpanel: $('#rightpanel'),
    profileMenu: $('#profileMenu'),
    toast: $('#toast'),
    fileCount: $('#fileCount')
  };

  /* ---------------------------------------------------------
     Toast
     --------------------------------------------------------- */
  let toastTimer = 0;
  function toast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  /* ---------------------------------------------------------
     View switching
     --------------------------------------------------------- */
  function showApp() {
    if (els.landing) els.landing.hidden = true;
    if (els.app) els.app.hidden = false;
    state.signedIn = true;
    document.body.style.overflow = 'hidden';
    if (!els.messages.dataset.booted) {
      renderEmpty();
      els.messages.dataset.booted = '1';
    }
    setTimeout(() => els.input && els.input.focus(), 120);
  }

  function showLanding() {
    if (els.app) els.app.hidden = true;
    if (els.landing) els.landing.hidden = false;
    state.signedIn = false;
    document.body.style.overflow = '';
  }

  function openModal() {
    els.authModal.hidden = false;
    const focusable = $('#emailInput');
    setTimeout(() => focusable && focusable.focus(), 150);
  }

  function closeModal() {
    els.authModal.hidden = true;
  }

  function signIn(kind) {
    const guesses = ['Ada', 'Kai', 'Nova', 'Rex', 'Zara'];
    const fromEmail = (state.email || '').split('@')[0];
    let name = 'User Name';

    if (kind === 'google') {
      name = 'Ada Lovelace';
    } else if (fromEmail) {
      name = fromEmail.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 24);
    }
    if (!name || guesses.indexOf(name) === -1 && name === 'User Name') name = 'User Name';

    state.name = name;
    if (els.userName) els.userName.textContent = name;
    if (els.userAvatar) els.userAvatar.textContent = name.trim().charAt(0).toUpperCase() || 'U';

    closeModal();
    showApp();
    toast('Signed in as ' + name);
  }

  $$('[data-auth]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const kind = btn.getAttribute('data-auth');
      if (kind === 'google') {
        openModal();
        setTimeout(() => signIn('google'), 420);
      } else {
        openModal();
      }
    });
  });

  $$('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      if (els.profileMenu) els.profileMenu.hidden = true;
      closeSidebar();
    }
  });

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

  /* ---------------------------------------------------------
     Sidebar (mobile drawer) + profile menu
     --------------------------------------------------------- */
  function openSidebar() {
    els.sidebar.classList.add('open');
    els.scrim.hidden = false;
  }
  function closeSidebar() {
    els.sidebar.classList.remove('open');
    if (els.scrim) els.scrim.hidden = true;
  }
  const sbOpen = $('#sbOpen');
  const sbClose = $('#sbClose');
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
      if (!els.profileMenu.hidden && !els.profileMenu.contains(event.target)) {
        els.profileMenu.hidden = true;
      }
    });
  }

  $$('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const action = btn.getAttribute('data-menu');
      els.profileMenu.hidden = true;
      if (action === 'logout') {
        showLanding();
        resetChat();
        toast('Signed out');
      } else if (action === 'upgrade') {
        toast('Checkout is not wired up in this demo');
      } else {
        toast('Settings are not wired up in this demo');
      }
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
  if (brandHome) {
    brandHome.addEventListener('click', (event) => {
      event.preventDefault();
      showLanding();
    });
  }

  const togglePanel = $('#togglePanel');
  if (togglePanel) {
    togglePanel.addEventListener('click', () => els.rightpanel.classList.toggle('open'));
  }

  /* ---------------------------------------------------------
     Rendering helpers
     --------------------------------------------------------- */
  const NYX_MARK = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 18V6l12 12V6" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>';
  const FILE_ICON = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h7l5 5v13H6V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M13 3v5h5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollDown(force) {
    const box = els.messages;
    if (!box) return;
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 220;
    if (force || near) {
      box.scrollTop = box.scrollHeight;
    }
  }

  function renderEmpty() {
    els.messages.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'empty';
    wrap.innerHTML =
      '<div class="empty-mark">' + NYX_MARK + '</div>' +
      '<h2>What are we building today?</h2>' +
      '<p>Give Nyx a target. It plans, runs tools, and hands back artifacts.</p>' +
      '<div class="chips">' +
        '<button class="chip" data-prompt="Clone https://vercel.com and rebuild it in plain HTML">Clone a site</button>' +
        '<button class="chip" data-prompt="Build a finance tracker app and package it as an APK">Build an app</button>' +
        '<button class="chip" data-prompt="Run recon on api.acme.io and list every endpoint">Run recon</button>' +
        '<button class="chip" data-prompt="Look at this screenshot and rebuild the layout">Read a screenshot</button>' +
      '</div>';
    els.messages.appendChild(wrap);

    $$('.chip', wrap).forEach((chip) => {
      chip.addEventListener('click', () => {
        els.input.value = chip.getAttribute('data-prompt');
        autoGrow();
        els.input.focus();
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

    wrap.appendChild(meta);
    wrap.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(wrap);
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
    row.appendChild(avatar);
    row.appendChild(wrap);
    els.messages.appendChild(row);
    scrollDown(true);

    return wrap;
  }

  /* thinking summary block (Claude / Base44 style) */
  function addThinking(wrap, steps) {
    const block = document.createElement('div');
    block.className = 'think open eq';
    block.innerHTML =
      '<button class="think-head" type="button">' +
        '<svg class="think-spark" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
        '<span class="think-label">Summary</span>' +
        '<span class="think-now">Analyzing target...</span>' +
        '<svg class="think-caret" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<div class="think-body"></div>';

    const body = $('.think-body', block);
    const now = $('.think-now', block);
    const head = $('.think-head', block);

    head.addEventListener('click', () => block.classList.toggle('open'));

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
      rows: rows,
      now: now,
      block: block,
      setActive(index, text) {
        rows.forEach((r, i) => {
          r.classList.toggle('done', i < index);
          r.classList.toggle('active', i === index);
        });
        if (text) now.textContent = text;
      },
      finish() {
        rows.forEach((r) => {
          r.classList.remove('active');
          r.classList.add('done');
        });
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------
     Mock intelligence: pick a pipeline + a reply
     --------------------------------------------------------- */
  function plan(text) {
    const t = text.toLowerCase();

    if (/(screenshot|image|photo|vision|look at|see this|ocr)/.test(t)) {
      return {
        steps: ['Reading image', 'Extracting layout', 'Mapping components', 'Executing tools', 'Drafting rebuild'],
        reply:
          '<p>I can see it. Two column layout, glass sidebar on the left, dense data table with a sticky header, and a floating action bar pinned bottom right.</p>' +
          '<p>Type scale looks like 14px body with a 32px display. Accent is a saturated blue on near-black, roughly <code>#5B8CFF</code> on <code>#0A0A0A</code>.</p>' +
          '<p>Say the word and I rebuild it as working HTML, or hand you the component tree first.</p>',
        artifact: null
      };
    }

    if (/(clone|mirror|copy).*(site|web|app|https?:)|https?:\/\//.test(t)) {
      return {
        steps: ['Analyzing target', 'Mapping routes and assets', 'Cloning site structure', 'Executing tools', 'Packaging build'],
        reply:
          '<p>Target analyzed. I mirrored <strong>214 files</strong> across <strong>37 routes</strong> and rebuilt the layout as clean semantic HTML so you actually own the code.</p>' +
          '<p>Where the original leaned on proprietary scripts, I replaced them with vanilla equivalents. Interactions survive, dependencies do not.</p>' +
          '<ul><li>Assets localised, font licensing flagged</li><li>Forms wired to a stub handler</li><li>Responsive breakpoints reconstructed</li></ul>' +
          '<p>Want me to port this to Next.js, or keep it as a static bundle?</p>',
        artifact: { name: 'site-clone.zip', size: '4.2 MB' }
      };
    }

    if (/\b(apk|android|ios|exe|mobile|build|app)\b/.test(t)) {
      return {
        steps: ['Parsing requirements', 'Scaffolding project', 'Writing core screens', 'Executing tools', 'Building artifacts'],
        reply:
          '<p>Built and packaged. Three targets compiled from one codebase, no native rewrites.</p>' +
          '<ul><li><strong>Android</strong>: signed debug APK, 8.4 MB</li><li><strong>iOS</strong>: unsigned IPA, 11.2 MB</li><li><strong>Windows</strong>: portable EXE, 6.1 MB</li></ul>' +
          '<p>Signing keys are stubbed. Drop your own keystore in and the APK ships as release-ready.</p>',
        artifact: { name: 'nyx-build.zip', size: '18.7 MB' }
      };
    }

    if (/\b(recon|scrape|scraping|scan|enumerate|endpoints?|headers|osint)\b/.test(t)) {
      return {
        steps: ['Resolving host', 'Fingerprinting stack', 'Enumerating endpoints', 'Executing tools', 'Compiling report'],
        reply:
          '<p>Recon complete on the target. Surface is smaller than it looks.</p>' +
          '<ul><li><strong>Stack</strong>: Next.js behind Cloudflare</li><li><strong>Endpoints</strong>: 3 public, 1 returning <code>200</code> without auth it should not have</li><li><strong>Headers</strong>: missing <code>Content-Security-Policy</code></li></ul>' +
          '<p>The unauthenticated route is the interesting one. Do you want the request chain, or just the reproduction steps?</p>',
        artifact: { name: 'recon-report.json', size: '62 KB' }
      };
    }

    if (/(host|deploy|serve|url|preview)/.test(t)) {
      return {
        steps: ['Preparing build', 'Bundling assets', 'Starting runtime', 'Executing tools'],
        reply:
          '<p>Live on a private runtime URL. It is yours until you close the session.</p>' +
          '<p>Hot reload is on, so edits land instantly. When you are happy, I will promote it to a public deployment.</p>',
        artifact: { name: 'runtime-url.txt', size: '1 KB' }
      };
    }

    return {
      steps: ['Analyzing request', 'Planning approach', 'Executing tools', 'Reviewing output'],
      reply:
        '<p>On it. I broke this into a short plan and started running tools rather than guessing.</p>' +
        '<p>Give me one more constraint and I can move faster: the target platform, or whether this should stay private.</p>',
      artifact: null
    };
  }

  /* ---------------------------------------------------------
     Send flow
     --------------------------------------------------------- */
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
      await wait(prefersReduced ? 120 : 620 + Math.random() * 340);
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
    const order = ['clone', 'recon', 'vision', 'builder'];
    const tools = $$('.tool');
    tools.forEach((t) => t.classList.remove('busy'));
    if (index === 0) return;
    const tool = tools[(index - 1) % order.length];
    if (tool) tool.classList.add('busy');
  }
  function clearTools() {
    $$('.tool').forEach((t) => t.classList.remove('busy'));
  }

  function updateUsage() {
    const pct = Math.min(100, Math.round((state.sent / state.limit) * 100));
    if (els.msgUsed) els.msgUsed.textContent = String(state.sent);
    if (els.meterFill) els.meterFill.style.width = pct + '%';
    if (els.fileCount) els.fileCount.textContent = String(3 + state.artifacts);
  }

  /* ---------------------------------------------------------
     Composer behaviour
     --------------------------------------------------------- */
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

  if (els.attachBtn) {
    els.attachBtn.addEventListener('click', () => els.fileInput.click());
  }

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
    if (!state.attachments.length) {
      els.attachRow.hidden = true;
      return;
    }
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

  function clearAttachments() {
    state.attachments = [];
    renderAttachments();
  }

  /* ---------------------------------------------------------
     Misc
     --------------------------------------------------------- */
  const clearBtn = $('#clearChat');
  if (clearBtn) clearBtn.addEventListener('click', () => { resetChat(); toast('Session cleared'); });

  const newSession = $('#newSession');
  if (newSession) {
    newSession.addEventListener('click', () => {
      resetChat();
      closeSidebar();
      els.input.focus();
      toast('New session started');
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
      autoGrow();
      els.input.focus();
      closeSidebar();
    });
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (state.signedIn && els.input) els.input.focus();
      else openModal();
    }
  });

  /* boot */
  autoGrow();
  updateUsage();
  window.addEventListener('resize', () => { autoGrow(); });
})();
