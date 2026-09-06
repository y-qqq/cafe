# Cafe Preorder

A small preorder site: customers build an order on their phone, see the
exact total, and pay by scanning a QR code that already has the amount
encoded in it. Staff watch orders come in on a live dashboard and update
status as they're made.

## Menu

- 3 food items (fixed price, no customisation)
- 4 drinks, each customisable with syrups (vanilla, caramel, hazelnut,
  sugar-free vanilla) at $0.50 each

Edit `menu.js` to change items, descriptions, prices, or syrup options —
everything else (cart, pricing, QR amount, dashboard) reads from that file.

## Running it

```bash
npm install
npm start
```

- Customer site: http://localhost:3000
- Staff dashboard: http://localhost:3000/admin.html (default passcode: `admin123`)

## Configuration (environment variables)

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `CAFE_NAME` | Shown on the site and in the QR payee name | `The Corner Cafe` |
| `ADMIN_PASSCODE` | Passcode to view/manage orders on the dashboard | `admin123` |
| `PAYMENT_UPI_ID` | Your UPI ID (e.g. `mycafe@oksbi`) — if set, the QR encodes a UPI payment link with the order amount pre-filled | unset |
| `PAYMENT_PAYEE_NAME` | Payee name shown in the paying app | `CAFE_NAME` |
| `PAYMENT_QR_TEMPLATE` | Custom QR content for any other payment provider. Use `{amount}` and `{orderNumber}` placeholders, e.g. `https://pay.example.com/mycafe?amt={amount}&ref={orderNumber}` | unset |

If none of the payment variables are set, the QR encodes a plain-text
"pay $X for order #Y" message so it still scans and displays the right
amount — good enough for a static wall-mounted payment sign where a staff
member confirms the transfer manually.

## How pricing works

The browser never sends a price — only item IDs, quantities and chosen
syrup IDs. `pricing.js` looks every item and syrup up in `menu.js` and
computes the authoritative total server-side before it's ever shown to the
customer or baked into the payment QR code.

## Data storage

Orders are stored in a local SQLite database at `data/orders.db` (created
automatically). The dashboard polls every 5 seconds, and there's a
one-click CSV export for bookkeeping (`Export CSV` button).
