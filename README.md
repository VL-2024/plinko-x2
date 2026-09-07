# X2 LOTO — PLINKO v1.0

Простая моментальная игра Plinko без лишней механики.

## Игровой цикл

1. LMS/DEMO создаёт билет.
2. LMS возвращает `ticketId`, `scenario`, `win`, `newBalance/balance`, `amount/denomination`.
3. `scenario` от 1 до 9 означает нижнюю ячейку слева направо.
4. Шар визуально проходит по Plinko-доске и гарантированно попадает в ячейку сценария.
5. Денежный результат frontend не рассчитывает в REAL.
6. После анимации отправляется `X2_GAME_ROUND_COMPLETE`.

## LMS adapter

Поверхность адаптера такая же, как у Чуко / Алтын Хан:

- `X2LMS.getGameSettings()`
- `X2LMS.getBalance()`
- `X2LMS.createTicket()`
- `X2LMS.emit()`

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

`/api/Lotto.Users.cls?Method=PayTicket&gameId=<gameId>&amount=<denomination>`

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

## REAL / DEMO

- `?mode=demo` или `X2_LMS_MODE=demo` включает demo.
- `X2_LMS_INIT.mode = "demo"` тоже включает demo.
- В DEMO реальные деньги не затрагиваются.
- В REAL сценарий и выигрыш приходят только из LMS.

## Production

В `config.js`:

```js
mock: false,
parentOrigin: 'https://x2.kg',
allowedParentOrigins: ['https://x2.kg']
```

`gameId` можно передать через URL или `X2_LMS_INIT` (например числовой ID LMS).
