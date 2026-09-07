# X2 LOTO — PLINKO v1.1

Простая моментальная игра Plinko без лишней механики.

## Что добавлено в v1.1

Интерфейс приведён к логике Чуко:

- `Новая игра` — покупает билет и сразу запускает падение одного шара;
- `Автоигра` — 5 / 10 / 20 / 50 билетов;
- `REAL / DEMO`;
- `Инфо`;
- `Звук` вкл/выкл;
- `Музыка` вкл/выкл;
- последние билеты в `Инфо → Мои билеты`;
- настройки звука и музыки сохраняются в `localStorage`.

Plinko остаётся одноэкранной игрой: отдельной кнопки «Бросить» нет — после `Новая игра` шар падает автоматически.

## Игровой цикл

1. Игрок выбирает номинал.
2. Нажимает `Новая игра`.
3. LMS/DEMO создаёт билет.
4. LMS возвращает `ticketId`, `scenario`, `win`, `newBalance/balance`, `amount/denomination`.
5. `scenario` от 1 до 9 означает нижнюю ячейку слева направо.
6. Шар визуально проходит по Plinko-доске и гарантированно попадает в ячейку сценария.
7. Денежный результат frontend не рассчитывает в REAL.
8. После анимации отправляется `X2_GAME_ROUND_COMPLETE`.

## Автоигра

Количество задаётся в `config.js`:

```js
autoPlayCounts: [5, 10, 20, 50]
```

UX:

1. нажать `Автоигра`;
2. выбрать количество;
3. кнопка меняется на `Старт 10`;
4. нажать `Старт 10`;
5. во время серии кнопка показывает `Стоп 3/10`;
6. при остановке текущий уже купленный билет завершается, новый больше не покупается.

В REAL каждый билет автоигры отдельно запрашивается у LMS.

## REAL / DEMO

REAL:

- билет, сценарий, `win` и баланс приходят из LMS;
- frontend не выбирает выигрыш;
- публичный standalone-preview с `mock:true` не позволяет включить REAL без LMS-сессии.

DEMO:

- виртуальный баланс;
- реальные деньги не затрагиваются;
- сценарии 1–9 идут циклически.

Переключение режима отправляет событие:

```text
X2_GAME_MODE_CHANGED
```

## Инфо

`Инфо` содержит:

- `Таблица выплат`;
- `Как играть`;
- `Мои билеты`.

Последние завершённые билеты хранятся локально отдельно для REAL и DEMO. Лимит:

```js
localTicketHistoryLimit: 5
```

## Звук и музыка

Используется WebAudio без внешних файлов.

В `config.js`:

```js
audio: {
  soundEnabled: true,
  musicEnabled: false,
  soundVolume: 0.22,
  musicVolume: 0.055
}
```

Состояния переключателей сохраняются в `localStorage`.

## LMS adapter

Основной контракт остаётся тем же, что у Чуко / Алтын Хан:

- `X2LMS.getGameSettings()`
- `X2LMS.getBalance()`
- `X2LMS.createTicket()`
- `X2LMS.emit()`

Для UI REAL/DEMO добавлены вспомогательные методы:

- `X2LMS.setMode()`
- `X2LMS.getMode()`
- `X2LMS.canUseReal()`

Формат покупки билета **не изменён**.

Поддерживается `X2_LMS_INIT` с:

- `language`
- `currency`
- `currencyDisplay`
- `denominations`
- `denomination`
- `mode`
- `balance`
- `gameId`
- `apiBase`
- `endpoint`
- `accessToken/session`

### Softloto PayTicket

REAL-запрос строится в формате LMS_API.md v19:

```text
/api/Lotto.Users.cls?Method=PayTicket&gameId=<gameId>&amount=<denomination>
```

Принимается прямой JSON или объект в `data`:

```json
{
  "ticketId":"...",
  "scenario":4,
  "gameId":137,
  "amount":15,
  "win":60,
  "newBalance":985.5,
  "currency":"KGS",
  "language":"ru"
}
```

`newBalance` нормализуется в `balance`, `amount` — в `denomination`.

## Production

В `config.js`:

```js
mock: false,
parentOrigin: 'https://x2.kg',
allowedParentOrigins: ['https://x2.kg']
```

`gameId` можно передать через URL или `X2_LMS_INIT` (например числовой ID LMS).
