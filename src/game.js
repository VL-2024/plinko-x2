(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('playBtn');
  const denomsEl = document.getElementById('denoms');
  const balanceEl = document.getElementById('balance');
  const balanceLabelEl = document.getElementById('balanceLabel');
  const stakeLabelEl = document.getElementById('stakeLabel');
  const resultEl = document.getElementById('result');
  const statusEl = document.getElementById('status');
  const ticketEl = document.getElementById('ticketId');
  const modeBadge = document.getElementById('modeBadge');

  const ROWS = 8;
  const SLOTS = 9;
  const CFG = window.X2_GAME_CONFIG || {};
  const URL_PARAMS = new URLSearchParams(location.search);

  const I18N = {
    RU: {
      balance:'Баланс', stake:'Номинал', play:'БРОСИТЬ', loading:'Загрузка…',
      buying:'Получаем билет…', dropping:'Шар падает…', ticket:'Билет',
      win:'Выигрыш', noWin:'Без выигрыша', error:'Не удалось начать игру',
      insufficient:'Недостаточно средств'
    },
    KG: {
      balance:'Баланс', stake:'Номинал', play:'ЫРГЫТУУ', loading:'Жүктөлүүдө…',
      buying:'Билет алынууда…', dropping:'Шар түшүп жатат…', ticket:'Билет',
      win:'Утуш', noWin:'Утуш жок', error:'Оюн башталган жок',
      insufficient:'Каражат жетишсиз'
    }
  };

  let language = 'RU';
  let currency = 'KGS';
  let currencyDisplay = 'сом';
  let denominations = [25,50,100];
  let stake = 50;
  let balance = null;
  let gameId = URL_PARAMS.get('gameId') || CFG.gameId || 'PLINKO';
  let state = 'boot';
  let currentTicket = null;
  let ball = null;
  let path = null;
  let animStart = 0;
  let animDuration = 2300;
  let highlightRow = -1;

  function tr(k) { return (I18N[language] || I18N.RU)[k] || k; }
  function fmt(n) {
    if (n == null || !Number.isFinite(Number(n))) return '—';
    return Number(n).toLocaleString('ru-RU', { maximumFractionDigits:2 });
  }
  function fmtMult(n) {
    const x = Number(n || 0);
    return Number.isInteger(x) ? `×${x}` : `×${String(Math.round(x*100)/100).replace('.', ',')}`;
  }

  function setStatus(text='') { statusEl.textContent = text; }
  function setState(next) {
    state = next;
    const busy = ['boot','requesting','dropping'].includes(state);
    playBtn.disabled = busy;
    [...denomsEl.children].forEach(b => b.disabled = busy);
    playBtn.textContent = state === 'boot' ? tr('loading') : tr('play');
  }

  function renderHeader() {
    balanceLabelEl.textContent = tr('balance');
    stakeLabelEl.textContent = tr('stake');
    balanceEl.textContent = `${fmt(balance)} ${currencyDisplay}`;
    playBtn.textContent = state === 'boot' ? tr('loading') : tr('play');
  }

  function renderDenoms() {
    denomsEl.innerHTML = '';
    denominations.forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'denom' + (Number(v) === Number(stake) ? ' active' : '');
      b.textContent = fmt(v);
      b.disabled = ['boot','requesting','dropping'].includes(state);
      b.addEventListener('click', () => {
        if (!['idle','settled','error'].includes(state)) return;
        stake = Number(v);
        renderDenoms();
        window.X2LMS.emit('X2_GAME_DENOMINATION_CHANGED', {
          gameId, denomination:stake, currency, language
        });
      });
      denomsEl.appendChild(b);
    });
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

    // subtle guides
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let i=0;i<SLOTS;i++) {
      const x = m.cx + (i-(SLOTS-1)/2)*m.gap;
      ctx.beginPath(); ctx.moveTo(x,m.boardTop); ctx.lineTo(x,m.slotY); ctx.stroke();
    }

    // pegs: 1,2,...8
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

    // slots
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
    // Shuffle while preserving the exact number of rights => exact target slot.
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

  function startDrop(ticket) {
    currentTicket = ticket;
    path = buildPath(ticket.scenario-1);
    ball = { ...path[0], r:10 };
    highlightRow = -1;
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
    drawBoard();
    if (t<1) requestAnimationFrame(animateDrop);
    else finishRound();
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
  }

  async function requestRound() {
    if (!['idle','settled','error'].includes(state)) return;
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
      window.X2LMS.emit('X2_GAME_ERROR', {
        stage:'newGame', code:err.code||'NEW_GAME_ERROR', message:err.message||String(err)
      });
    }
  }

  async function initGame() {
    setState('boot');
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
      const b=await window.X2LMS.getBalance({currency});
      balance=Number(b.balance);
      if(b.currency) currency=String(b.currency).toUpperCase();
      if(b.currencyDisplay) currencyDisplay=String(b.currencyDisplay);
      modeBadge.textContent=window.X2LMS.isDemo()?'DEMO':'REAL';
      renderHeader();renderDenoms();
      setState('idle');
      window.X2LMS.emit('X2_GAME_BALANCE_LOADED', {
        gameId,balance,currency,currencyDisplay,language,denominations
      });
      drawBoard();
    } catch(err) {
      console.error('[PLINKO] init failed',err);
      setState('error');
      setStatus(tr('error'));
      window.X2LMS.emit('X2_GAME_ERROR', {stage:'init',code:err.code||'INIT_ERROR',message:err.message||String(err)});
    }
  }

  playBtn.addEventListener('click',requestRound);
  window.addEventListener('resize',()=>drawBoard());
  initGame();
})();
