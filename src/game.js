(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const newGameBtn = document.getElementById('newGameBtn');
  const autoBtn = document.getElementById('autoBtn');
  const autoMenu = document.getElementById('autoMenu');
  const denomsEl = document.getElementById('denoms');
  const ballsLabelEl = document.getElementById('ballsLabel');
  const ballsCountsEl = document.getElementById('ballsCounts');
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
  const BALL_COUNTS = Array.isArray(CFG.ballCounts) && CFG.ballCounts.length
    ? CFG.ballCounts.map(Number).filter(n => Number.isInteger(n) && n > 0 && n <= 30)
    : [1,5,10,15];

  const I18N = {
    RU: {
      balance:'Баланс', stake:'Номинал', balls:'Шары', newGame:'НОВАЯ ИГРА', auto:'АВТОИГРА', start:'СТАРТ', stop:'СТОП', stopping:'ОСТАНОВКА', loading:'Загрузка…',
      buying:'Получаем билет…', dropping:'Шар падает…', droppingMany:'Падают шары…', ticket:'Билет', win:'Выигрыш', noWin:'Без выигрыша', error:'Не удалось начать игру', insufficient:'Недостаточно средств',
      info:'Инфо', payouts:'Таблица выплат', how:'Как играть', tickets:'Мои билеты', soundOn:'Звук вкл', soundOff:'Звук выкл', musicOn:'Музыка вкл', musicOff:'Музыка выкл',
      slot:'Ячейка', noTickets:'Завершённых билетов пока нет.', realRequires:'REAL доступен при запуске игры из LMS.', modeError:'Не удалось переключить режим.',
      how1:'Выберите номинал билета и количество шаров: 1, 5, 10 или 15.', how2:'Нажмите «Новая игра».', how3:'LMS формирует один билет и заранее возвращает сценарий и общий выигрыш.', how4:'Plinko внутри этого одного билета распределяет выбранное количество шаров по ячейкам. Траектория каждого шара визуально случайная, но общий результат соответствует билету LMS.', how5:'После падения последнего шара показывается общий результат и обновляется баланс.',
      payoutNote:'В REAL денежный результат всегда приходит из LMS. При нескольких шарах это по-прежнему один билет; игра распределяет шары так, чтобы визуальный итог соответствовал выигрышу билета.',
      autoplayHint:'Автоигра последовательно покупает и показывает выбранное количество билетов. «Стоп» завершает текущий билет и не запускает следующий.'
    },
    KG: {
      balance:'Баланс', stake:'Номинал', balls:'Шарлар', newGame:'ЖАҢЫ ОЮН', auto:'АВТООЮН', start:'СТАРТ', stop:'ТОКТОТ', stopping:'ТОКТОТУУ', loading:'Жүктөлүүдө…',
      buying:'Билет алынууда…', dropping:'Шар түшүп жатат…', droppingMany:'Шарлар түшүп жатат…', ticket:'Билет', win:'Утуш', noWin:'Утуш жок', error:'Оюн башталган жок', insufficient:'Каражат жетишсиз',
      info:'Инфо', payouts:'Төлөмдөр', how:'Кантип ойнойт', tickets:'Менин билеттерим', soundOn:'Үн күйүк', soundOff:'Үн өчүк', musicOn:'Музыка күйүк', musicOff:'Музыка өчүк',
      slot:'Уяча', noTickets:'Аяктаган билеттер азырынча жок.', realRequires:'REAL режими LMS аркылуу иштетилгенде жеткиликтүү.', modeError:'Режимди которуу мүмкүн болгон жок.',
      how1:'Билеттин номиналын жана шарлардын санын тандаңыз: 1, 5, 10 же 15.', how2:'«Жаңы оюн» баскычын басыңыз.', how3:'LMS бир билетти түзүп, сценарий менен жалпы утушту алдын ала кайтарат.', how4:'Plinko ошол бир билеттин ичинде шарларды уячаларга бөлүштүрөт. Ар бир шардын жолу туш келди көрүнөт, бирок жалпы жыйынтык LMS билетине туура келет.', how5:'Акыркы шар түшкөндөн кийин жалпы жыйынтык көрсөтүлүп, баланс жаңыртылат.',
      payoutNote:'REAL режиминде акчалай жыйынтык ар дайым LMSтен келет. Бир нече шар тандалса да бул бир билет бойдон калат; оюн шарларды билеттин жалпы утушуна шайкеш бөлүштүрөт.',
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
  let selectedBallCount = BALL_COUNTS.includes(Number(CFG.defaultBallCount)) ? Number(CFG.defaultBallCount) : BALL_COUNTS[0];
  let balls = [];
  let roundDistribution = [];
  let slotLandingCounts = Array(SLOTS).fill(0);
  let activeRows = new Set();
  let slotFlashUntil = Array(SLOTS).fill(0);
  let animStart = 0;
  let animDuration = 2300;
  let lastPegSoundAt = 0;
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
    [...ballsCountsEl.children].forEach(b => b.disabled = busy || auto.running);
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
    ballsLabelEl.textContent = tr('balls');
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

  function renderBallCounts() {
    ballsCountsEl.innerHTML = '';
    BALL_COUNTS.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ball-count' + (Number(n) === Number(selectedBallCount) ? ' active' : '');
      b.textContent = String(n);
      b.disabled = isBusy() || auto.running;
      b.addEventListener('click', () => {
        if (!['idle','settled','error'].includes(state) || auto.running) return;
        selectedBallCount = Number(n);
        renderBallCounts();
        window.X2LMS.emit('X2_GAME_BALLS_CHANGED', {
          gameId, ballCount:selectedBallCount, denomination:stake, currency, language
        });
      });
      ballsCountsEl.appendChild(b);
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
    const a = Array.isArray(CFG.demoMultipliers) && CFG.demoMultipliers.length === SLOTS
      ? CFG.demoMultipliers : [10,2,.5,0,.2,0,.5,2,10];
    return Number(a[i] ?? 0);
  }

  function drawBoard() {
    const m = boardMetrics();
    ctx.clearRect(0,0,m.w,m.h);

    // Deep glass board with a soft central glow.
    const bg = ctx.createLinearGradient(0,0,0,m.h);
    bg.addColorStop(0,'rgba(40,72,171,.22)');
    bg.addColorStop(.50,'rgba(18,39,112,.10)');
    bg.addColorStop(1,'rgba(4,12,58,.26)');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,m.w,m.h);
    const halo = ctx.createRadialGradient(m.cx,m.h*.28,0,m.cx,m.h*.36,m.w*.64);
    halo.addColorStop(0,'rgba(70,134,255,.16)');
    halo.addColorStop(.52,'rgba(36,72,180,.055)');
    halo.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0,0,m.w,m.h);

    // Subtle lane lines.
    ctx.strokeStyle = 'rgba(125,174,255,.055)';
    ctx.lineWidth = 1;
    for (let i=0;i<SLOTS;i++) {
      const x = m.cx + (i-(SLOTS-1)/2)*m.gap;
      ctx.beginPath(); ctx.moveTo(x,m.boardTop-12); ctx.lineTo(x,m.slotY-4); ctx.stroke();
    }

    // Top ball feeder / drop point.
    const feederY = Math.max(31,m.boardTop*.42);
    ctx.save();
    ctx.shadowColor='rgba(72,151,255,.48)'; ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(m.cx,feederY,18,0,Math.PI*2);
    const fg=ctx.createRadialGradient(m.cx-5,feederY-6,2,m.cx,feederY,20);
    fg.addColorStop(0,'#365dcc');fg.addColorStop(.68,'#132c83');fg.addColorStop(1,'#091851');
    ctx.fillStyle=fg;ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle='rgba(139,198,255,.78)';ctx.stroke();
    ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(m.cx,feederY,6,0,Math.PI*2);ctx.fillStyle='#DBE63C';ctx.fill();
    ctx.restore();

    // Pegs: dark base + blue rim + pearl center for a 3D look.
    for (let r=0;r<ROWS;r++) {
      const y = m.boardTop + r*m.rowGap;
      for (let j=0;j<=r;j++) {
        const x = m.cx + (j-r/2)*m.gap;
        const active = activeRows.has(r);
        const rr = active ? 7.2 : 6.2;
        ctx.save();
        ctx.shadowColor = active ? 'rgba(219,230,60,.72)' : 'rgba(64,147,255,.34)';
        ctx.shadowBlur = active ? 17 : 9;
        ctx.beginPath();ctx.arc(x,y,rr+2.3,0,Math.PI*2);
        ctx.fillStyle=active?'rgba(219,230,60,.28)':'rgba(14,32,92,.95)';ctx.fill();
        ctx.shadowBlur=0;
        ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);
        const pg=ctx.createRadialGradient(x-2.3,y-2.6,1,x,y,rr+1);
        if (active) { pg.addColorStop(0,'#ffffff');pg.addColorStop(.34,'#edf58c');pg.addColorStop(1,'#b6c414'); }
        else { pg.addColorStop(0,'#ffffff');pg.addColorStop(.38,'#eaf2ff');pg.addColorStop(1,'#81a8ec'); }
        ctx.fillStyle=pg;ctx.fill();
        ctx.lineWidth=1;ctx.strokeStyle=active?'rgba(255,255,255,.72)':'rgba(220,236,255,.72)';ctx.stroke();
        ctx.restore();
      }
    }

    const now = performance.now();
    const slotW = m.gap * .88;
    const slotPalette = [
      ['#dbe63c','#879900'],['#4dd6ff','#1664bc'],['#8798ff','#384bb0'],['#53649b','#253266'],['#946eff','#4930a8'],
      ['#53649b','#253266'],['#8798ff','#384bb0'],['#4dd6ff','#1664bc'],['#dbe63c','#879900']
    ];
    for (let i=0;i<SLOTS;i++) {
      const x = m.cx + (i-(SLOTS-1)/2)*m.gap;
      const count = Number(slotLandingCounts[i] || 0);
      const selected = count > 0 && (state === 'settled' || slotFlashUntil[i] > now);
      const x0 = x-slotW/2;
      const [topC,bottomC]=slotPalette[i] || slotPalette[4];
      ctx.save();
      if (selected) { ctx.shadowColor=topC;ctx.shadowBlur=22; }
      roundRect(x0,m.slotY,slotW,m.slotH,11);
      const sg=ctx.createLinearGradient(0,m.slotY,0,m.slotY+m.slotH);
      if (selected) { sg.addColorStop(0,topC);sg.addColorStop(1,bottomC); }
      else { sg.addColorStop(0,'rgba(80,111,196,.34)');sg.addColorStop(1,'rgba(25,41,100,.56)'); }
      ctx.fillStyle=sg;ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle=selected?'rgba(255,255,255,.72)':'rgba(147,185,255,.28)';
      ctx.lineWidth=selected?1.6:1.1;ctx.stroke();
      ctx.fillStyle=selected && i!==0 && i!==8 ? '#fff' : (selected ? '#13256d' : '#fff');
      ctx.font=`950 ${Math.max(13,Math.min(18,slotW*.28))}px Inter,system-ui,sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(fmtMult(slotMultiplier(i)),x,m.slotY+m.slotH/2+(count>1?5:0));
      if (count>1) {
        ctx.font=`900 ${Math.max(9,Math.min(11,slotW*.18))}px Inter,system-ui,sans-serif`;
        ctx.fillText(`● ${count}`,x,m.slotY+12);
      }
      ctx.restore();
    }

    for (const b of balls) {
      if (!b.visible) continue;
      // Short luminous trail makes the motion easier to read with many balls.
      if (Number.isFinite(b.progress) && b.progress > .025 && b.progress < 1) {
        for (let k=3;k>=1;k--) {
          const tp=Math.max(0,b.progress-k*.014);
          const p=samplePath(b.path,tp);
          ctx.beginPath();ctx.arc(p.x,p.y,Math.max(2,(b.r||9)*(1-k*.20)),0,Math.PI*2);
          ctx.fillStyle=`rgba(219,230,60,${.045+(3-k)*.025})`;ctx.fill();
        }
      }
      drawBall(b.x,b.y,b.r||9);
    }
  }

  function roundRect(x,y,w,h,r) {
    const rr = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }

  function drawBall(x,y,r) {
    ctx.save();
    ctx.shadowColor='rgba(219,230,60,.78)';ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(x,y,r+1.2,0,Math.PI*2);
    ctx.fillStyle='rgba(219,230,60,.20)';ctx.fill();
    ctx.shadowBlur=0;
    const grad=ctx.createRadialGradient(x-r*.40,y-r*.45,1.4,x,y,r*1.15);
    grad.addColorStop(0,'#ffffff');
    grad.addColorStop(.18,'#f7ffb2');
    grad.addColorStop(.50,'#dbe63c');
    grad.addColorStop(1,'#8da200');
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=grad;ctx.fill();
    ctx.lineWidth=1.1;ctx.strokeStyle='rgba(255,255,255,.78)';ctx.stroke();
    ctx.restore();
  }

  function buildPath(slotIndex, randomness=Math.random()) {
    const m = boardMetrics();
    const steps = Array(slotIndex).fill(1).concat(Array(ROWS-slotIndex).fill(0));
    for (let i=steps.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1)); [steps[i],steps[j]]=[steps[j],steps[i]];
    }
    let rights = 0;
    const startJitter = (Math.random()-.5) * Math.min(12,m.gap*.22);
    const pts = [{x:m.cx+startJitter,y:m.boardTop-m.rowGap*.78,row:-1}];
    for (let r=0;r<ROWS;r++) {
      rights += steps[r];
      const localJitter = (Math.random()-.5) * Math.min(7,m.gap*.12);
      const x = m.cx + (rights-(r+1)/2)*m.gap + localJitter;
      const y = m.boardTop + r*m.rowGap + m.rowGap*.55;
      pts.push({x,y,row:r});
    }
    pts.push({x:m.cx+(slotIndex-(SLOTS-1)/2)*m.gap,y:m.slotY-12,row:ROWS});
    pts.wiggleSeed = randomness * 9.71 + Math.random()*4;
    return pts;
  }

  function samplePath(pts,t) {
    const segs = pts.length-1;
    const f = Math.min(.999999,Math.max(0,t))*segs;
    const i = Math.floor(f);
    const u = f-i;
    const a=pts[i], b=pts[i+1];
    const ease = u<.5 ? 2*u*u : 1-Math.pow(-2*u+2,2)/2;
    const seed = Number(pts.wiggleSeed || 1);
    const x = a.x+(b.x-a.x)*ease + Math.sin(u*Math.PI)*Math.sin((i+1)*2.37+seed)*3.4;
    const y = a.y+(b.y-a.y)*u - Math.sin(u*Math.PI)*(4.0 + (seed%2));
    return {x,y,row:b.row};
  }

  function buildReachable(count, values) {
    const reachable = Array.from({length:count+1},()=>new Set());
    reachable[0].add(0);
    for (let n=1;n<=count;n++) {
      for (const prev of reachable[n-1]) {
        for (const v of values) reachable[n].add(prev+v);
      }
    }
    return reachable;
  }

  function shuffled(a) {
    const x = a.slice();
    for (let i=x.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]];
    }
    return x;
  }

  function chooseVisualDistribution(ticket, count) {
    if (count === 1) return [Math.max(0,Math.min(SLOTS-1,Number(ticket.scenario||1)-1))];
    const multipliers = Array.from({length:SLOTS},(_,i)=>slotMultiplier(i));
    const units = multipliers.map(v=>Math.round(v*10));
    const reachable = buildReachable(count, units);
    const denom = Number(ticket.denomination || stake || 0);
    const officialMult = denom > 0 && Number.isFinite(Number(ticket.win))
      ? Number(ticket.win)/denom
      : Number(ticket.multiplier || slotMultiplier(Math.max(0,Number(ticket.scenario||1)-1)));
    let target = Math.round(officialMult * count * 10);

    // Если реальный LMS вернёт необычный размер выигрыша, сначала ищем ближайший
    // достижимый визуальный итог. Сам денежный результат всё равно берётся только из LMS.
    if (!reachable[count].has(target)) {
      const scenarioMult = slotMultiplier(Math.max(0,Math.min(SLOTS-1,Number(ticket.scenario||1)-1)));
      const scenarioTarget = Math.round(scenarioMult * count * 10);
      if (reachable[count].has(scenarioTarget)) target = scenarioTarget;
      else {
        let best = null;
        for (const x of reachable[count]) {
          const d = Math.abs(x-target);
          if (!best || d < best.d) best = {x,d};
        }
        target = best ? best.x : 0;
      }
    }

    let remaining = target;
    const slotUse = Array(SLOTS).fill(0);
    const result = [];
    for (let left=count;left>0;left--) {
      let candidates = [];
      for (let slot=0;slot<SLOTS;slot++) {
        const v = units[slot];
        if (remaining-v < 0) continue;
        if (reachable[left-1].has(remaining-v)) candidates.push(slot);
      }
      if (!candidates.length) candidates = [Math.max(0,Math.min(SLOTS-1,Number(ticket.scenario||1)-1))];
      // Предпочитаем менее использованные симметричные ячейки, но оставляем случайность.
      candidates = shuffled(candidates).sort((a,b)=>slotUse[a]-slotUse[b] + (Math.random()-.5)*.35);
      const chosen = candidates[0];
      result.push(chosen);
      slotUse[chosen]++;
      remaining -= units[chosen];
    }
    return shuffled(result);
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
    roundDistribution = chooseVisualDistribution(ticket, selectedBallCount);
    slotLandingCounts = Array(SLOTS).fill(0);
    slotFlashUntil = Array(SLOTS).fill(0);
    activeRows = new Set();
    lastPegSoundAt = 0;
    animStart = performance.now();
    const launchGap = Math.max(55, Number(CFG.ballLaunchGapMs || 95));
    const radius = selectedBallCount >= 15 ? 7.2 : selectedBallCount >= 10 ? 8 : 9.5;
    balls = roundDistribution.map((slotIndex,i) => {
      const path = buildPath(slotIndex,Math.random());
      const delay = i * launchGap + Math.random()*Math.min(55,launchGap*.6);
      const duration = animDuration * (.88 + Math.random()*.26);
      return {
        slotIndex,
        path,
        launchAt:animStart+delay,
        duration,
        x:path[0].x,
        y:path[0].y,
        r:radius,
        visible:false,
        landed:false,
        row:-1,
        lastSoundRow:-1
      };
    });
    setState('dropping');
    setStatus(selectedBallCount > 1 ? `${tr('droppingMany')} ${selectedBallCount}` : tr('dropping'));
    requestAnimationFrame(animateDrop);
  }

  function animateDrop(now) {
    activeRows = new Set();
    let allDone = true;
    for (const b of balls) {
      if (now < b.launchAt) { allDone = false; continue; }
      b.visible = true;
      const t = Math.min(1,(now-b.launchAt)/b.duration);
      b.progress = t;
      const p = samplePath(b.path,t);
      b.x=p.x;b.y=p.y;b.row=p.row;
      if (p.row >= 0 && p.row < ROWS && t < 1) activeRows.add(p.row);
      if (p.row >= 0 && p.row < ROWS && p.row !== b.lastSoundRow && now-lastPegSoundAt > 38) {
        b.lastSoundRow = p.row;
        lastPegSoundAt = now;
        playPegSound(p.row);
      }
      if (t < 1) {
        allDone = false;
      } else if (!b.landed) {
        b.landed = true;
        const m=boardMetrics();
        b.x=m.cx+(b.slotIndex-(SLOTS-1)/2)*m.gap;
        b.y=m.slotY-12 - Math.min(slotLandingCounts[b.slotIndex],3)*2.2;
        slotLandingCounts[b.slotIndex] += 1;
        slotFlashUntil[b.slotIndex] = now + 360;
      }
    }
    drawBoard();
    if (!allDone) requestAnimationFrame(animateDrop);
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
    list.unshift({ticketId:String(ticket.ticketId),win:Number(ticket.win||0),ballCount:selectedBallCount});
    try { localStorage.setItem(historyKey(mode), JSON.stringify(list.slice(0,HISTORY_LIMIT))); } catch (_) {}
  }

  function finishRound() {
    activeRows = new Set();
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
      language,
      ballCount:selectedBallCount,
      ballDistribution:roundDistribution.map(i=>i+1)
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
      renderHeader(); renderDenoms(); renderBallCounts();
      ticketEl.textContent=`${tr('ticket')}: ${t.ticketId}`;
      window.X2LMS.emit('X2_GAME_TICKET_READY', {
        gameId, ticketId:t.ticketId, scenario:t.scenario,
        denomination:stake, currency, language, ballCount:selectedBallCount
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
      balls = [];
      roundDistribution = [];
      slotLandingCounts = Array(SLOTS).fill(0);
      slotFlashUntil = Array(SLOTS).fill(0);
      activeRows = new Set();
      resultEl.classList.remove('show');
      resultEl.textContent = '';
      ticketEl.textContent = `${tr('ticket')}: —`;
      currentMode = nextMode;
      const b = await window.X2LMS.getBalance({currency});
      balance = Number(b.balance);
      if (b.currency) currency=String(b.currency).toUpperCase();
      if (b.currencyDisplay) currencyDisplay=String(b.currencyDisplay);
      renderHeader(); renderDenoms(); renderBallCounts(); renderModeButtons();
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
      ${list.length ? `<div class="ticket-list">${list.map(x=>`<div class="ticket-row"><span>${escapeHtml(x.ticketId)}${x.ballCount ? ` · ${escapeHtml(x.ballCount)} шар.` : ''}</span><strong>${escapeHtml(fmt(x.win))}</strong></div>`).join('')}</div>` : `<p class="muted">${escapeHtml(tr('noTickets'))}</p>`}`;
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
    renderBallCounts();
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
      renderHeader();renderDenoms();renderBallCounts();renderModeButtons();renderInfoTabs();
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
