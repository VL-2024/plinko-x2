window.X2_GAME_CONFIG = {
  gameId: 'PLINKO',
  source: 'X2_PLINKO',

  // Для standalone-превью true. В production поставить false.
  mock: true,
  demoBalance: 10000,
  demoDenominations: [25, 50, 100],
  demoDenomination: 50,
  demoLanguage: 'RU',
  demoCurrency: 'KGS',
  demoCurrencyDisplay: 'сом',

  // Интерфейс как в Чуко.
  autoPlayCounts: [5, 10, 20, 50],
  ballCounts: [1, 5, 10, 15],
  defaultBallCount: 1,
  ballLaunchGapMs: 95,
  lototron: {
    enabled: true,
    spinMs: 650
  },
  localTicketHistoryLimit: 5,
  audio: {
    soundEnabled: true,
    musicEnabled: false,
    soundVolume: 0.22,
    musicVolume: 0.055
  },

  // LMS_API.md v19 / Softloto PayTicket.
  apiBase: 'https://dev.superloto.kg',
  endpoint: '/api/Lotto.Users.cls',
  payTicketMethod: 'GET',

  // Production security: заменить на точные origin'ы X2.
  parentOrigin: '*',
  allowedParentOrigins: ['*'],

  // DEMO: scenario 1..9 = ячейка слева направо.
  demoMultipliers: [10, 2, 0.5, 0, 0.2, 0, 0.5, 2, 10]
};
