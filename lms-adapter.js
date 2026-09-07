(() => {
  'use strict';

  const cfg = window.X2_GAME_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const source = cfg.source || 'X2_PLINKO';

  let init = null;
  let initResolver = null;
  let initRejecter = null;
  let runtimeMode = null;
  let demoIndex = 0;
  let demoBalance = Number(cfg.demoBalance ?? 10000);

  function normLang(v) {
    const s = String(v || 'RU').toUpperCase();
    return s === 'KY' ? 'KG' : (s === 'KG' ? 'KG' : 'RU');
  }

  function allowedOrigin(origin) {
    const list = Array.isArray(cfg.allowedParentOrigins) ? cfg.allowedParentOrigins : [cfg.parentOrigin || '*'];
    return list.includes('*') || list.includes(origin);
  }

  function post(type, payload = {}) {
    const message = { source, type, ...payload };
    try {
      window.parent?.postMessage(message, cfg.parentOrigin || '*');
    } catch (e) {
      console.warn('[X2LMS] postMessage failed', e);
    }
    window.dispatchEvent(new CustomEvent(type, { detail: message }));
  }

  function readUrlInit() {
    const denominations = (params.get('denominations') || '')
      .split(',').map(Number).filter(n => Number.isFinite(n) && n > 0);
    const mode = String(params.get('mode') || params.get('X2_LMS_MODE') || '').toLowerCase();
    const balance = Number(params.get('balance'));
    return {
      session: params.get('session') || params.get('accessToken') || null,
      accessToken: params.get('accessToken') || null,
      gameId: params.get('gameId') || cfg.gameId || 'PLINKO',
      denominations,
      denomination: Number(params.get('denomination')) || undefined,
      language: params.get('language') || undefined,
      currency: params.get('currency') || undefined,
      currencyDisplay: params.get('currencyDisplay') || undefined,
      mode: mode || undefined,
      balance: Number.isFinite(balance) ? balance : undefined,
      apiBase: params.get('apiBase') || undefined,
      endpoint: params.get('endpoint') || undefined
    };
  }

  function mergeInit(a, b) {
    const out = { ...(a || {}), ...(b || {}) };
    if (!Array.isArray(out.denominations) || !out.denominations.length) {
      out.denominations = Array.isArray(cfg.demoDenominations) ? cfg.demoDenominations.slice() : [25,50,100];
    }
    out.language = normLang(out.language || cfg.demoLanguage || 'RU');
    out.currency = String(out.currency || cfg.demoCurrency || 'KGS').toUpperCase();
    out.currencyDisplay = String(out.currencyDisplay || cfg.demoCurrencyDisplay || out.currency);
    out.gameId = out.gameId || cfg.gameId || 'PLINKO';
    out.denomination = Number(out.denomination || cfg.demoDenomination || out.denominations[0]);
    return out;
  }

  function resolvedMode(settings = init) {
    if (runtimeMode) return runtimeMode;
    const urlMode = String(params.get('mode') || params.get('X2_LMS_MODE') || '').toLowerCase();
    const mode = String(urlMode || settings?.mode || '').toLowerCase();
    if (mode === 'real' || mode === 'demo') return mode;
    return cfg.mock ? 'demo' : 'real';
  }

  function isDemo(settings = init) {
    return resolvedMode(settings) === 'demo';
  }

  function canUseReal() {
    const settings = init || readUrlInit();
    const urlMode = String(params.get('mode') || params.get('X2_LMS_MODE') || '').toLowerCase();
    return urlMode === 'real' || !cfg.mock || !!settings?.session || !!settings?.accessToken || String(settings?.mode || '').toLowerCase() === 'real';
  }

  function setMode(mode) {
    const next = String(mode || '').toLowerCase();
    if (!['real','demo'].includes(next)) {
      const err = new Error('INVALID_MODE');
      err.code = 'INVALID_MODE';
      throw err;
    }
    if (next === 'real' && !canUseReal()) {
      const err = new Error('REAL_REQUIRES_LMS');
      err.code = 'REAL_REQUIRES_LMS';
      throw err;
    }
    runtimeMode = next;
    return next;
  }

  window.addEventListener('message', (event) => {
    if (!allowedOrigin(event.origin)) return;
    const data = event.data || {};
    if (data.type !== 'X2_LMS_INIT') return;
    init = mergeInit(readUrlInit(), data);
    if (Number.isFinite(Number(init.balance)) && resolvedMode(init) === 'demo') demoBalance = Number(init.balance);
    if (initResolver) {
      initResolver(init);
      initResolver = null;
      initRejecter = null;
    }
  });

  function getGameSettings() {
    if (init) return Promise.resolve(init);

    const urlInit = readUrlInit();
    const hasUsefulUrlInit = !!(urlInit.session || urlInit.accessToken || urlInit.mode || urlInit.denominations.length || params.has('gameId'));
    if (hasUsefulUrlInit || cfg.mock) {
      init = mergeInit(null, urlInit);
      return Promise.resolve(init);
    }

    return new Promise((resolve, reject) => {
      initResolver = resolve;
      initRejecter = reject;
      setTimeout(() => {
        if (!initResolver) return;
        const err = new Error('LMS_INIT_TIMEOUT');
        err.code = 'LMS_INIT_TIMEOUT';
        const rejectInit = initRejecter;
        initResolver = null;
        initRejecter = null;
        rejectInit?.(err);
      }, 8000);
    });
  }

  async function jsonOrThrow(res) {
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(body?.message || body?.error || `HTTP_${res.status}`);
      err.code = body?.code || `HTTP_${res.status}`;
      throw err;
    }
    return body;
  }

  function authHeaders(settings) {
    const headers = { 'Accept':'application/json' };
    const token = settings?.accessToken || settings?.session;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-ID'] = token;
    }
    return headers;
  }

  async function getBalance({ currency } = {}) {
    const settings = init || await getGameSettings();
    if (isDemo(settings)) {
      return {
        balance: demoBalance,
        currency: settings.currency,
        currencyDisplay: settings.currencyDisplay
      };
    }

    // LMS v19 может передать баланс сразу в X2_LMS_INIT.
    if (Number.isFinite(Number(settings.balance))) {
      return {
        balance: Number(settings.balance),
        currency: settings.currency,
        currencyDisplay: settings.currencyDisplay
      };
    }

    // Совместимость со старым адаптером Чуко/Алтын Хан, если balance endpoint доступен.
    const base = settings.apiBase || cfg.apiBase || '';
    const balanceEndpoint = settings.balanceEndpoint || cfg.balanceEndpoint;
    if (!balanceEndpoint) {
      const err = new Error('BALANCE_NOT_PROVIDED');
      err.code = 'BALANCE_NOT_PROVIDED';
      throw err;
    }
    const url = new URL(balanceEndpoint, base || location.origin);
    url.searchParams.set('currency', currency || settings.currency || 'KGS');
    return jsonOrThrow(await fetch(url, { method:'GET', headers:authHeaders(settings), credentials:'include' }));
  }

  function requestId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `x2-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeTicket(raw, req, settings) {
    const d = raw?.data && typeof raw.data === 'object' ? raw.data : raw;
    if (!d || typeof d !== 'object') {
      const err = new Error('INVALID_LMS_RESPONSE');
      err.code = 'INVALID_LMS_RESPONSE';
      throw err;
    }

    const ticketId = d.ticketId ?? d.ticketID ?? d.id;
    const scenario = Number(d.scenario);
    const win = Number(d.win ?? d.prize ?? 0);
    const newBalance = Number(d.newBalance ?? d.balance);
    const amount = Number(d.amount ?? d.denomination ?? req.denomination);

    if (!ticketId || !Number.isInteger(scenario) || scenario < 1 || scenario > 9 || !Number.isFinite(win)) {
      const err = new Error('INVALID_TICKET_FIELDS');
      err.code = 'INVALID_TICKET_FIELDS';
      throw err;
    }

    return {
      ...d,
      ticketId: String(ticketId),
      scenario,
      win,
      balance: Number.isFinite(newBalance) ? newBalance : undefined,
      denomination: amount,
      gameId: d.gameId ?? settings.gameId ?? req.gameId,
      currency: String(d.currency || settings.currency || req.currency || 'KGS').toUpperCase(),
      currencyDisplay: d.currencyDisplay || d.currencyLabel || d.currencySymbol || settings.currencyDisplay,
      language: normLang(d.language || settings.language || req.language),
      multiplier: d.multiplier != null ? Number(d.multiplier) : (amount > 0 ? win / amount : 0)
    };
  }

  async function createDemoTicket(req, settings) {
    const multipliers = Array.isArray(cfg.demoMultipliers) && cfg.demoMultipliers.length === 9
      ? cfg.demoMultipliers : [10,2,.5,0,.2,0,.5,2,10];
    const scenario = (demoIndex++ % 9) + 1;
    const denomination = Number(req.denomination || settings.denomination || 50);
    const multiplier = Number(multipliers[scenario - 1]);
    const win = Math.round(denomination * multiplier * 100) / 100;
    // DEMO баланс отдельный, реальный баланс не затрагивается.
    demoBalance = Math.round((demoBalance - denomination + win) * 100) / 100;
    await new Promise(r => setTimeout(r, 160));
    return {
      ticketId: `DEMO-${Date.now()}-${scenario}`,
      scenario,
      gameId: settings.gameId || req.gameId,
      amount: denomination,
      denomination,
      win,
      newBalance: demoBalance,
      balance: demoBalance,
      currency: settings.currency,
      currencyDisplay: settings.currencyDisplay,
      language: settings.language,
      multiplier
    };
  }

  async function createTicket(req = {}) {
    const settings = init || await getGameSettings();
    if (isDemo(settings)) return createDemoTicket(req, settings);

    const base = settings.apiBase || cfg.apiBase || '';
    const endpoint = settings.endpoint || cfg.endpoint || '/api/Lotto.Users.cls';
    const url = new URL(endpoint, base || location.origin);
    url.searchParams.set('Method', 'PayTicket');
    url.searchParams.set('gameId', String(req.gameId ?? settings.gameId));
    url.searchParams.set('amount', String(req.denomination));

    const method = String(settings.payTicketMethod || cfg.payTicketMethod || 'GET').toUpperCase();
    const rid = requestId();
    const headers = authHeaders(settings);
    headers['Idempotency-Key'] = rid;
    headers['X-Request-ID'] = rid;

    let options = { method, headers, credentials:'include' };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      options.body = new URLSearchParams({
        Method:'PayTicket',
        gameId:String(req.gameId ?? settings.gameId),
        amount:String(req.denomination)
      });
    }

    const raw = await jsonOrThrow(await fetch(url, options));
    const ticket = normalizeTicket(raw, req, settings);
    if (Number.isFinite(ticket.balance)) settings.balance = ticket.balance;
    return ticket;
  }

  window.X2LMS = {
    getGameSettings,
    getBalance,
    createTicket,
    emit: post,
    isDemo: () => isDemo(init),
    getMode: () => resolvedMode(init),
    setMode,
    canUseReal,
    getRawInit: () => init
  };
})();
