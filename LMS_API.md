# PLINKO — LMS API contract

Игра использует тот же основной frontend adapter contract, что Чуко / Алтын Хан.

## Init

```js
iframe.contentWindow.postMessage({
  type: 'X2_LMS_INIT',
  session: currentLmsSession,
  accessToken: currentAccessToken,
  gameId: 137,
  denominations: [25,50,100],
  denomination: 50,
  language: 'RU',
  currency: 'KGS',
  currencyDisplay: 'сом',
  mode: 'real',
  balance: 1000,
  apiBase: 'https://dev.superloto.kg',
  endpoint: '/api/Lotto.Users.cls'
}, GAME_ORIGIN);
```

## Ticket

GET или POST:

```text
https://dev.superloto.kg/api/Lotto.Users.cls?Method=PayTicket&gameId=137&amount=50
```

Обязательные параметры:

- `Method=PayTicket`
- `gameId`
- `amount` — выбранный номинал билета

Пример ответа:

```json
{
  "ticketId":"123456",
  "scenario":4,
  "gameId":137,
  "amount":50,
  "win":200,
  "newBalance":1150,
  "currency":"KGS",
  "language":"ru"
}
```

Допускается тот же объект внутри `data`.

## Scenarios

- `scenario:1` → ячейка 1 (крайняя слева)
- ...
- `scenario:9` → ячейка 9 (крайняя справа)

В REAL frontend не вычисляет приз и не заменяет scenario.

## Автоигра

Дополнительного LMS endpoint не требуется.

Каждый раунд автоигры вызывает обычный `PayTicket` отдельно. Следующий билет запрашивается только после завершения визуализации предыдущего.

При `Стоп` уже купленный/запущенный билет завершается, новый `PayTicket` не отправляется.

## REAL / DEMO

Переключатель REAL/DEMO находится во frontend.

- DEMO использует локальный виртуальный баланс и не вызывает `PayTicket`.
- REAL использует обычный LMS `PayTicket`.
- standalone-сборка с `mock:true` не включает REAL без LMS-контекста/сессии.

## Events

- `X2_GAME_READY`
- `X2_GAME_BALANCE_LOADED`
- `X2_GAME_DENOMINATION_CHANGED`
- `X2_GAME_TICKET_READY`
- `X2_GAME_ROUND_COMPLETE`
- `X2_GAME_MODE_CHANGED`
- `X2_GAME_HELP_REQUEST`
- `X2_GAME_ERROR`
