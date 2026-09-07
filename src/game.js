(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const newGameBtn = document.getElementById('newGameBtn');
  const autoBtn = document.getElementById('autoBtn');
  const autoMenu = document.getElementById('autoMenu');
  const denomsEl = document.getElementById('denoms');
  const balanceEl = document.getElementById('balance');
  const balanceLabelEl = document.getElementById('balanceLabel');
  const stakeLabelEl = document.getElementById('stakeLabel');
  const resultEl = document.getElementById('result');
  const statusEl = document.getElementById('status');
  const ticketEl = document.getElementById('ticketId');
  const realBtn = document.getElementById('realBtn');
  const demoBtn = document.getElementById('demoBtn');
  const infoBtn = document.getElementById('infoBtn');
  const soundBtn = document.getElementById('soundBtn');
  const musicBtn = document.getElementById('musicBtn');
  const infoModal = document.getElementById('infoModal');
  const infoClose = document.getElementById('infoClose');
  const infoTabs = document.getElementById('infoTabs');
  const infoContent = document.getElementById('infoContent');
  const infoTitle = document.getElementById('infoTitle');

  const ROWS = 8;
  const SLOTS = 9;
  const CFG = window.X2_GAME_CONFIG || {};
  const URL_PARAMS = new URLSearchParams(location.search);
  const AUTO_COUNTS = Array.isArray(CFG.autoPlayCounts) && CFG.autoPlayCounts.length
    ? CFG.autoPlayCounts.map(Number).filter(n => Number.isInteger(n) && n > 0)
    : [5,10,20,50];
  const HISTORY_LIMIT = Number(CFG.localTicketHistoryLimit || 5);

  const I18N = {
    RU: {
      balance:'Баланс', stake:'Номинал', newGame:'НОВАЯ ИГРА', auto:'АВТОИГРА', start:'СТАРТ', stop:'СТОП', stopping:'ОСТАНОВКА', loading:'Загрузка…',
      buying:'Получаем билет…', dropping:'Шар падает…', ticket:'Билет', win:'Выигрыш', noWin:'Без выигрыша', error:'Не удалось начать игру', insufficient:'Недостаточно средств',
      info:'Инфо', payouts:'Таблица выплат', how:'Как играть', tickets:'Мои билеты', soundOn:'Звук вкл', soundOff:'Звук выкл', musicOn:'Музыка вкл', musicOff:'Музыка выкл',
      slot:'Ячейка', noTickets:'Завершённых билетов пока нет.', realRequires:'REAL доступен при запуске игры из LMS.', modeError:'Не удалось переключить режим.',
      how1:'Выберите номинал билета.', how2:'Нажмите «Новая игра».', how3:'LMS формирует билет и заранее возвращает сценарий и выигрыш.', how4:'Шар автоматически падает в ячейку, соответствующую сценарию LMS.', how5:'После падения показывается результат и обновляется баланс.',
      payoutNote:'В REAL денежный результат всегда приходит из LMS. Таблица показывает множители ячеек для визуального поля.',
      autoplayHint:'Автоигра последовательно покупает и показывает выбранное количество билетов. «Стоп» завершает текущий билет и не запускает следующий.'
    },
    KG: {
      balance:'Баланс', stake:'Номинал', newGame:'ЖАҢЫ ОЮН', auto:'АВТООЮН', start:'СТАРТ', stop:'ТОКТОТ', stopping:'ТОКТОТУУ', loading:'Жүктөлүүдө…',
      buying:'Билет алынууда…', dropping:'Шар түшүп жатат…', ticket:'Билет', win:'Утуш', noWin:'Утуш жок', error:'Оюн башталган жок', insufficient:'Каражат жетишсиз',
      info:'Инфо', payouts:'Төлөмдөр', how:'Кантип ойнойт', tickets:'Менин билеттерим', soundOn:'Үн күйүк', soundOff:'Үн өчүк', musicOn:'Музыка күйүк', musicOff:'Музыка өчүк',
      slot:'Уяча', noTickets:'Аяктаган билеттер азырынча жок.', realRequires:'REAL режими LMS аркылуу иштетилгенде жеткиликтүү.', modeError:'Режимди которуу мүмкүн болгон жок.',
      how1:'Билеттин номиналын тандаңыз.', how2:'«Жаңы оюн» баскычын басыңыз.', how3:'LMS билетти түзүп, сценарий менен утушту алдын ала кайтарат.', how4:'Шар LMS сценарийине туура келген уячага автоматтык түрдө түшөт.', how5:'Түшкөндөн кийин жыйынтык көрсөтүлүп, баланс жаңыртылат.',
      payoutNote:'REAL режиминде акчалай жыйынтык ар дайым LMSтен келет. Таблица талаадагы уячалардын көбөйткүчтөрүн көрсөтөт.',
      autoplayHint:'Автооюн тандалган сандагы билеттерди кезек менен сатып алып көрсөтөт. «Токтот» учурдагы билетти аяктап, кийинкисин баштабайт.'
    }
  };

  let language = 'RU';
  let currency = 'KGS';
  let currencyDisplay = 'сом';
  let denominations = [25,50,100];
  let stake = 50;
  let balance = null;
  let gameId = URL_PARAMS.get('gameId') || CFG.gameId || 'PLINKO';
  let currentMode = 'demo';
  let state = 'boot';
  let currentTicket = null;
  let ball = null;
  let path = null;
  let animStart = 0;
  let animDuration = 2300;
  let highlightRow = -1;
  let lastSoundRow = -1;
  let currentInfoTab = 'payouts';

  const auto = {
    selected: null,
    running: false,
    total: 0,
    completed: 0,
    stopRequested: false,
    timer: null
  };

  const audioCfg = CFG.audio || {};
  let soundEnabled = loadBool('x2_plinko_sound', audioCfg.soundEnabled !== false);
  let musicEnabled = loadBool('x2_plinko_music', !!audioCfg.musicEnabled);
  let audioCtx = null;
  let musicTimer = null;
  let musicStep = 0;

  function tr(k) { return (I18N[language] || I18N.RU)[k] || k; }
  function fmt(n) {
    if (n == null || !Number.isFinite(Number(n))) return '—';
    return Number(n).toLocaleString('ru-RU', { maximumFractionDigits:2 });
  }
  function fmtMult(n) {
    const x = Number(n || 0);
    return Number.isInteger(x) ? `×${x}` : `×${String(Math.round(x*100)/100).replace('.', ',')}`;
  }
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function setStatus(text='') { statusEl.textContent = text; }
  function loadBool(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v === '1';
    } catch (_) { return fallback; }
  }
  function saveBool(key, value) {
    try { localStorage.setItem(key, value ? '1' : '0'); } catch (_) {}
  }

  function isBusy() { return ['boot','requesting','dropping'].includes(state); }

  function setState(next) {
    state = next;
    renderControlsState();
  }

  function renderControlsState() {
    const busy = isBusy();
    newGameBtn.disabled = busy || auto.running;
    [...denomsEl.children].forEach(b => b.disabled = busy || auto.running);
    realBtn.disabled = busy || auto.running;
    demoBtn.disabled = busy || auto.running;
    autoBtn.disabled = state === 'boot' || (!auto.running && ['requesting','dropping'].includes(state));
    if (busy) autoMenu.hidden = true;
    renderActionLabels();
  }

  function renderActionLabels() {
    newGameBtn.textContent = state === 'boot' ? tr('loading') : tr('newGame');
    autoBtn.classList.toggle('running', auto.running);
    if (auto.running) {
      const prefix = auto.stopRequested ? tr('stopping') : tr('stop');
      autoBtn.textContent = `${prefix} ${auto.completed}/${auto.total}`;
    } else if (auto.selected) {
      autoBtn.textContent = `${tr('start')} ${auto.selected}`;
    } else {
      autoBtn.textContent = tr('auto');
    }
  }

  function renderHeader() {
    balanceLabelEl.textContent = tr('balance');
    stakeLabelEl.textContent = tr('stake');
    balanceEl.textContent = `${fmt(balance)} ${currencyDisplay}`;
    infoTitle.textContent = tr('info');
    renderActionLabels();
    renderAudioButtons();
    renderModeButtons();
  }

  function renderDenoms() {
    denomsEl.innerHTML = '';
    denominations.forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'denom' + (Number(v) === Number(stake) ? ' active' : '');
      b.textContent = fmt(v);
      b.disabled = isBusy() || auto.running;
      b.addEventListener('click', () => {
        if (!['idle','settled','error'].includes(state) || auto.running) return;
        stake = Number(v);
        renderDenoms();
        window.X2LMS.emit('X2_GAME_DENOMINATION_CHANGED', {
          gameId, denomination:stake, currency, language
        });
      });
      denomsEl.appendChild(b);
    });
  }

  function renderAutoMenu() {
    autoMenu.innerHTML = '';
    AUTO_COUNTS.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(n);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        auto.selected = n;
        autoMenu.hidden = true;
        renderActionLabels();
      });
      autoMenu.appendChild(b);
    });
  }

  function renderModeButtons() {
    realBtn.classList.toggle('active', currentMode === 'real');
    demoBtn.classList.toggle('active', currentMode === 'demo');
  }

  function renderAudioButtons() {
    soundBtn.classList.toggle('on', soundEnabled);
    soundBtn.setAttribute('aria-pressed', String(soundEnabled));
    soundBtn.innerHTML = soundEnabled ? `🔊 <span>${tr('soundOn')}</span>` : `🔇 <span>${tr('soundOff')}</span>`;
    musicBtn.classList.toggle('on', musicEnabled);
    musicBtn.setAttribute('aria-pressed', String(musicEnabled));
    musicBtn.innerHTML = musicEnabled ? `♫ <span>${tr('musicOn')}</span>` : `♩ <span>${tr('musicOff')}</span>`;
  }

  function boardMetrics() {
    const w = canvas.clientWidth || 520;
    const h = canvas.clientHeight || 620;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
      canvas.width = Math.round(w*dpr);
      canvas.height = Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const pad = Math.max(28, w*0.07);
    const boardTop = Math.max(72, h*0.09);
    const slotH = Math.max(54, h*0.085);
    const slotY = h - slotH - 24;
    const rowGap = (slotY - boardTop - 26) / ROWS;
    const gap = Math.min((w-pad*2)/(SLOTS-1), rowGap*1.08);
    return { w,h,pad,boardTop,slotH,slotY,rowGap,gap,cx:w/2 };
  }

  function slotMultiplier(i) {
    if (currentTicket && currentTicket.scenario === i+1) return Number(currentTicket.multiplier || 0);
    const a = Array.isArray(CFG.demoMultipliers) ? CFG.demoMultipliers : [10,2,.5,0,.2,0,.5,2,10];
    return Number(a[i] ?? 0);
  }

  function drawBoard() {
    const m = boardMetrics();
    ctx.clearRect(0,0,m.w,m.h);

    const g = ctx.createLinearGradient(0,0,0,m.h);
    g.addColorStop(0,'rgba(255,255,255,.035)');
    g.addColorStop(1,'rgba(0,0,0,.08)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,m.w,m.h);

    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let i=0;i<SLOTS;i++) {
      const x = m.cx + (i-(SLOTS-1)/2)*m.gap;
      ctx.beginPath(); ctx.moveTo(x,m.boardTop); ctx.lineTo(x,m.slotY); ctx.stroke();
    }

    for (let r=0;r<ROWS;r++) {
      const y = m.boardTop + r*m.rowGap;
      for (let j=0;j<=r;j++) {
        const x = m.cx + (j-r/2)*m.gap;
        const active = r === highlightRow;
        ctx.beginPath();
        ctx.arc(x,y,active ? 7 : 5.4,0,Math.PI*2);
        ctx.fillStyle = active ? '#DBE63C' : 'rgba(255,255,255,.92)';
        ctx.shadowColor = active ? 'rgba(219,230,60,.65)' : 'rgba(255,255,255,.28)';
        ctx.shadowBlur = active ? 15 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const slotW = m.gap * .86;
    for (let i=0;i<SLOTS;i++) {
      const x = m.cx + (i-(SLOTS-1)/2)*m.gap;
      const selected = currentTicket && currentTicket.scenario === i+1 && state === 'settled';
      const x0 = x-slotW/2;
      roundRect(x0,m.slotY,slotW,m.slotH,10);
      ctx.fillStyle = selected ? '#DBE63C' : 'rgba(255,255,255,.10)';
      ctx.fill();
      ctx.strokeStyle = selected ? 'rgba(219,230,60,.98)' : 'rgba(255,255,255,.16)';
      ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = selected ? '#273287' : '#fff';
      ctx.font = `900 ${Math.max(13,Math.min(18,slotW*.28))}px Inter,system-ui,sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(fmtMult(slotMultiplier(i)),x,m.slotY+m.slotH/2);
    }

    if (ball) drawBall(ball.x, ball.y, ball.r || 10);
  }

  function roundRect(x,y,w,h,r) {
    const rr = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }

  function drawBall(x,y,r) {
    const grad = ctx.createRadialGradient(x-r*.35,y-r*.4,2,x,y,r*1.25);
    grad.addColorStop(0,'#ffffff');
    grad.addColorStop(.22,'#eef68b');
    grad.addColorStop(1,'#DBE63C');
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=grad;ctx.shadowColor='rgba(219,230,60,.7)';ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;
  }

  function buildPath(slotIndex) {
    const m = boardMetrics();
    const steps = Array(slotIndex).fill(1).concat(Array(ROWS-slotIndex).fill(0));
    for (let i=steps.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1)); [steps[i],steps[j]]=[steps[j],steps[i]];
    }
    let rights = 0;
    const pts = [{x:m.cx,y:m.boardTop-m.rowGap*.78,row:-1}];
    for (let r=0;r<ROWS;r++) {
      rights += steps[r];
      const x = m.cx + (rights-(r+1)/2)*m.gap;
      const y = m.boardTop + r*m.rowGap + m.rowGap*.55;
      pts.push({x,y,row:r});
    }
    pts.push({x:m.cx+(slotIndex-(SLOTS-1)/2)*m.gap,y:m.slotY-12,row:ROWS});
    return pts;
  }

  function samplePath(pts,t) {
    const segs = pts.length-1;
    const f = Math.min(.999999,Math.max(0,t))*segs;
    const i = Math.floor(f);
    const u = f-i;
    const a=pts[i], b=pts[i+1];
    const ease = u<.5 ? 2*u*u : 1-Math.pow(-2*u+2,2)/2;
    const x = a.x+(b.x-a.x)*ease + Math.sin(u*Math.PI)*Math.sin((i+1)*2.37)*3.2;
    const y = a.y+(b.y-a.y)*u - Math.sin(u*Math.PI)*4.5;
    return {x,y,row:b.row};
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch (_) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  }

  function tone(freq, duration, volume, type='sine', delay=0) {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = ac.currentTime + delay;
    const end = start + duration;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(start); osc.stop(end + 0.03);
  }

  function playPegSound(row) {
    if (!soundEnabled) return;
    const vol = Number(audioCfg.soundVolume ?? .22) * .32;
    tone(520 + row*34, .055, vol, 'triangle');
  }

  function playLandingSound(win) {
    if (!soundEnabled) return;
    const vol = Number(audioCfg.soundVolume ?? .22);
    if (win > 0) {
      tone(523.25,.12,vol*.55,'triangle');
      tone(659.25,.16,vol*.48,'triangle',.09);
      tone(783.99,.22,vol*.42,'triangle',.19);
    } else {
      tone(220,.14,vol*.28,'sine');
      tone(174.61,.18,vol*.22,'sine',.08);
    }
  }

  function startMusic() {
    if (!musicEnabled || musicTimer) return;
    ensureAudio();
    const notes = [196,246.94,293.66,246.94,220,261.63,329.63,261.63];
    const pulse = () => {
      if (!musicEnabled) return;
      const vol = Number(audioCfg.musicVolume ?? .055);
      const f = notes[musicStep++ % notes.length];
      tone(f,.72,vol,'sine');
      tone(f*2,.46,vol*.22,'triangle',.05);
    };
    pulse();
    musicTimer = setInterval(pulse, 760);
  }

  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  }

  function startDrop(ticket) {
    currentTicket = ticket;
    path = buildPath(ticket.scenario-1);
    ball = { ...path[0], r:10 };
    highlightRow = -1;
    lastSoundRow = -1;
    animStart = performance.now();
    setState('dropping');
    setStatus(tr('dropping'));
    requestAnimationFrame(animateDrop);
  }

  function animateDrop(now) {
    const t = Math.min(1,(now-animStart)/animDuration);
    const p = samplePath(path,t);
    ball.x=p.x;ball.y=p.y;
    highlightRow = p.row >=0 && p.row<ROWS ? p.row : -1;
    if (highlightRow >= 0 && highlightRow !== lastSoundRow) {
      lastSoundRow = highlightRow;
      playPegSound(highlightRow);
    }
    drawBoard();
    if (t<1) requestAnimationFrame(animateDrop);
    else finishRound();
  }

  function historyKey(mode=currentMode) { return `x2_plinko_tickets_${mode}`; }
  function getHistory(mode=currentMode) {
    try {
      const list = JSON.parse(localStorage.getItem(historyKey(mode)) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }
  function saveHistory(ticket, mode=currentMode) {
    if (!ticket?.ticketId) return;
    const list = getHistory(mode).filter(x => x && x.ticketId !== ticket.ticketId);
    list.unshift({ticketId:String(ticket.ticketId),win:Number(ticket.win||0)});
    try { localStorage.setItem(historyKey(mode), JSON.stringify(list.slice(0,HISTORY_LIMIT))); } catch (_) {}
  }

  function finishRound() {
    highlightRow=-1;
    const m=boardMetrics();
    const slot=currentTicket.scenario-1;
    ball={x:m.cx+(slot-(SLOTS-1)/2)*m.gap,y:m.slotY-14,r:10};
    if (Number.isFinite(Number(currentTicket.balance))) balance=Number(currentTicket.balance);
    renderHeader();
    setState('settled');
    setStatus('');
    ticketEl.textContent=`${tr('ticket')}: ${currentTicket.ticketId}`;
    const win=Number(currentTicket.win||0);
    resultEl.textContent=win>0 ? `${fmt(win)} ${currencyDisplay}` : tr('noWin');
    resultEl.classList.remove('show'); void resultEl.offsetWidth; resultEl.classList.add('show');
    drawBoard();
    playLandingSound(win);
    saveHistory(currentTicket, currentMode);
    if (!infoModal.hidden && currentInfoTab === 'tickets') renderInfoContent();

    window.X2LMS.emit('X2_GAME_ROUND_COMPLETE', {
      gameId,
      ticketId:currentTicket.ticketId,
      scenario:currentTicket.scenario,
      denomination:stake,
      win,
      balance,
      currency,
      language
    });

    if (auto.running) {
      auto.completed += 1;
      renderActionLabels();
      if (auto.stopRequested || auto.completed >= auto.total) {
        endAutoplay();
      } else {
        auto.timer = setTimeout(() => {
          auto.timer = null;
          requestRound(true);
        }, win > 0 ? 1050 : 700);
      }
    }
  }

  async function requestRound(fromAuto=false) {
    if (!['idle','settled','error'].includes(state)) return;
    if (!fromAuto && auto.running) return;
    ensureAudio();
    resultEl.classList.remove('show');
    resultEl.textContent='';
    setState('requesting');
    setStatus(tr('buying'));
    try {
      const t=await window.X2LMS.createTicket({
        gameId, denomination:stake, currency, currencyDisplay, language
      });
      if (t.currency) currency=String(t.currency).toUpperCase();
      if (t.currencyDisplay) currencyDisplay=String(t.currencyDisplay);
      if (t.language) language=String(t.language).toUpperCase()==='KG'?'KG':'RU';
      if (Number.isFinite(Number(t.denomination))) stake=Number(t.denomination);
      renderHeader(); renderDenoms();
      ticketEl.textContent=`${tr('ticket')}: ${t.ticketId}`;
      window.X2LMS.emit('X2_GAME_TICKET_READY', {
        gameId, ticketId:t.ticketId, scenario:t.scenario,
        denomination:stake, currency, language
      });
      startDrop(t);
    } catch (err) {
      console.error('[PLINKO] createTicket failed',err);
      setState('error');
      const msg=err.code==='INSUFFICIENT_FUNDS'?tr('insufficient'):tr('error');
      setStatus(msg);
      if (auto.running) endAutoplay();
      window.X2LMS.emit('X2_GAME_ERROR', {
        stage:'newGame', code:err.code||'NEW_GAME_ERROR', message:err.message||String(err)
      });
    }
  }

  function startAutoplay() {
    if (!auto.selected || isBusy() || auto.running) return;
    auto.running = true;
    auto.total = auto.selected;
    auto.completed = 0;
    auto.stopRequested = false;
    autoMenu.hidden = true;
    renderControlsState();
    requestRound(true);
  }

  function endAutoplay() {
    if (auto.timer) clearTimeout(auto.timer);
    auto.timer = null;
    auto.running = false;
    auto.stopRequested = false;
    auto.selected = null;
    auto.total = 0;
    auto.completed = 0;
    renderControlsState();
  }

  function requestStopAutoplay() {
    if (!auto.running) return;
    auto.stopRequested = true;
    if (auto.timer) {
      clearTimeout(auto.timer);
      auto.timer = null;
      endAutoplay();
      return;
    }
    renderActionLabels();
  }

  async function switchMode(nextMode) {
    if (isBusy() || auto.running || currentMode === nextMode) return;
    const previousMode = currentMode;
    try {
      ensureAudio();
      window.X2LMS.setMode(nextMode);
      setState('boot');
      setStatus('');
      currentTicket = null;
      ball = null;
      path = null;
      highlightRow = -1;
      resultEl.classList.remove('show');
      resultEl.textContent = '';
      ticketEl.textContent = `${tr('ticket')}: —`;
      currentMode = nextMode;
      const b = await window.X2LMS.getBalance({currency});
      balance = Number(b.balance);
      if (b.currency) currency=String(b.currency).toUpperCase();
      if (b.currencyDisplay) currencyDisplay=String(b.currencyDisplay);
      renderHeader(); renderDenoms(); renderModeButtons();
      setState('idle');
      drawBoard();
      window.X2LMS.emit('X2_GAME_MODE_CHANGED', {gameId, mode:currentMode.toUpperCase(), currency, language});
    } catch (err) {
      console.warn('[PLINKO] mode switch failed',err);
      try { window.X2LMS.setMode(previousMode); } catch (_) {}
      const msg = err.code === 'REAL_REQUIRES_LMS' ? tr('realRequires') : tr('modeError');
      setStatus(msg);
      currentMode = previousMode;
      renderModeButtons();
      if (state === 'boot') setState('idle');
    }
  }

  function renderInfoTabs() {
    const labels = {payouts:tr('payouts'),how:tr('how'),tickets:tr('tickets')};
    [...infoTabs.querySelectorAll('button[data-tab]')].forEach(b => {
      b.textContent = labels[b.dataset.tab] || b.dataset.tab;
      b.classList.toggle('active', b.dataset.tab === currentInfoTab);
    });
  }

  function renderInfoContent() {
    if (currentInfoTab === 'payouts') {
      const mults = Array.isArray(CFG.demoMultipliers) ? CFG.demoMultipliers : [10,2,.5,0,.2,0,.5,2,10];
      infoContent.innerHTML = `
        <h3>${escapeHtml(tr('payouts'))}</h3>
        <div class="payout-list">
          ${mults.slice(0,SLOTS).map((m,i)=>`<div class="payout-row"><span>${escapeHtml(tr('slot'))} ${i+1}</span><strong>${escapeHtml(fmtMult(m))}</strong></div>`).join('')}
        </div>
        <p class="muted">${escapeHtml(tr('payoutNote'))}</p>`;
      return;
    }
    if (currentInfoTab === 'how') {
      infoContent.innerHTML = `
        <h3>${escapeHtml(tr('how'))}</h3>
        <ol class="how-steps">
          <li>${escapeHtml(tr('how1'))}</li>
          <li>${escapeHtml(tr('how2'))}</li>
          <li>${escapeHtml(tr('how3'))}</li>
          <li>${escapeHtml(tr('how4'))}</li>
          <li>${escapeHtml(tr('how5'))}</li>
        </ol>
        <p class="muted">${escapeHtml(tr('autoplayHint'))}</p>`;
      return;
    }
    const list = getHistory(currentMode);
    infoContent.innerHTML = `
      <h3>${escapeHtml(tr('tickets'))} · ${currentMode.toUpperCase()}</h3>
      ${list.length ? `<div class="ticket-list">${list.map(x=>`<div class="ticket-row"><span>${escapeHtml(x.ticketId)}</span><strong>${escapeHtml(fmt(x.win))}</strong></div>`).join('')}</div>` : `<p class="muted">${escapeHtml(tr('noTickets'))}</p>`}`;
  }

  function openInfo() {
    currentInfoTab = 'payouts';
    renderInfoTabs();
    renderInfoContent();
    infoModal.hidden = false;
    window.X2LMS.emit('X2_GAME_HELP_REQUEST', {gameId, section:'info', language});
  }

  function closeInfo() { infoModal.hidden = true; }

  async function initGame() {
    setState('boot');
    renderAutoMenu();
    drawBoard();
    try {
      window.X2LMS.emit('X2_GAME_READY', { gameId });
      const settings=await window.X2LMS.getGameSettings();
      gameId=settings.gameId||gameId;
      language=String(settings.language||'RU').toUpperCase()==='KG'?'KG':'RU';
      currency=String(settings.currency||'KGS').toUpperCase();
      currencyDisplay=String(settings.currencyDisplay||currency);
      denominations=(Array.isArray(settings.denominations)&&settings.denominations.length?settings.denominations:[25,50,100]).map(Number).filter(n=>n>0);
      stake=Number(settings.denomination||denominations[0]);
      if(!denominations.includes(stake)) stake=denominations[0];
      currentMode=window.X2LMS.isDemo()?'demo':'real';
      const b=await window.X2LMS.getBalance({currency});
      balance=Number(b.balance);
      if(b.currency) currency=String(b.currency).toUpperCase();
      if(b.currencyDisplay) currencyDisplay=String(b.currencyDisplay);
      renderHeader();renderDenoms();renderModeButtons();renderInfoTabs();
      setState('idle');
      window.X2LMS.emit('X2_GAME_BALANCE_LOADED', {
        gameId,balance,currency,currencyDisplay,language,denominations
      });
      drawBoard();
      if (musicEnabled) {
        const startAfterGesture = () => { startMusic(); window.removeEventListener('pointerdown',startAfterGesture); };
        window.addEventListener('pointerdown',startAfterGesture,{once:true});
      }
    } catch(err) {
      console.error('[PLINKO] init failed',err);
      setState('error');
      setStatus(tr('error'));
      window.X2LMS.emit('X2_GAME_ERROR', {stage:'init',code:err.code||'INIT_ERROR',message:err.message||String(err)});
    }
  }

  newGameBtn.addEventListener('click',()=>requestRound(false));
  autoBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    ensureAudio();
    if (auto.running) { requestStopAutoplay(); return; }
    if (auto.selected) { startAutoplay(); return; }
    if (isBusy()) return;
    autoMenu.hidden = !autoMenu.hidden;
  });
  document.addEventListener('click',(e)=>{ if (!autoMenu.hidden && !autoMenu.contains(e.target) && e.target !== autoBtn) autoMenu.hidden=true; });
  realBtn.addEventListener('click',()=>switchMode('real'));
  demoBtn.addEventListener('click',()=>switchMode('demo'));
  infoBtn.addEventListener('click',openInfo);
  infoClose.addEventListener('click',closeInfo);
  infoModal.addEventListener('click',(e)=>{ if(e.target===infoModal) closeInfo(); });
  infoTabs.addEventListener('click',(e)=>{
    const b=e.target.closest('button[data-tab]');
    if(!b)return;
    currentInfoTab=b.dataset.tab;
    renderInfoTabs();renderInfoContent();
    window.X2LMS.emit('X2_GAME_HELP_REQUEST', {gameId, section:currentInfoTab, language});
  });
  soundBtn.addEventListener('click',()=>{
    ensureAudio();
    soundEnabled=!soundEnabled;saveBool('x2_plinko_sound',soundEnabled);renderAudioButtons();
    if(soundEnabled) tone(660,.09,Number(audioCfg.soundVolume??.22)*.35,'triangle');
  });
  musicBtn.addEventListener('click',()=>{
    ensureAudio();
    musicEnabled=!musicEnabled;saveBool('x2_plinko_music',musicEnabled);renderAudioButtons();
    if(musicEnabled) startMusic(); else stopMusic();
  });
  window.addEventListener('resize',()=>drawBoard());
  window.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&!infoModal.hidden)closeInfo(); });
  initGame();
})();
