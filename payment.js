const QRCode = require('qrcode');

// Builds the string that gets encoded into the payment QR code, with the
// exact order total baked in so the customer never has to type an amount.
//
// Configure via environment variables to match whatever your payment
// provider expects:
//   PAYMENT_UPI_ID      e.g. "mycafe@oksbi"  -> generates a UPI deep link
//   PAYMENT_PAYEE_NAME  e.g. "My Cafe"       -> shown by the paying app
//   PAYMENT_QR_TEMPLATE e.g. "https://pay.example.com/{orderNumber}?amt={amount}"
//                       -> use {amount} and {orderNumber} placeholders for
//                          any other provider (PayNow, Stripe link, etc.)
// If none are set, a plain-text fallback is encoded so the QR still scans
// and shows the amount/order to whoever reads it (e.g. with a phone camera).
function buildPaymentPayload({ orderNumber, total, payeeName = 'Cafe' }) {
  const amount = total.toFixed(2);

  if (process.env.PAYMENT_QR_TEMPLATE) {
    return process.env.PAYMENT_QR_TEMPLATE
      .replace('{amount}', amount)
      .replace('{orderNumber}', orderNumber);
  }

  if (process.env.PAYMENT_UPI_ID) {
    const params = new URLSearchParams({
      pa: process.env.PAYMENT_UPI_ID,
      pn: process.env.PAYMENT_PAYEE_NAME || payeeName,
      am: amount,
      cu: 'INR',
      tn: `Order ${orderNumber}`,
    });
    return `upi://pay?${params.toString()}`;
  }

  return `PAY $${amount} for order ${orderNumber} at ${process.env.PAYMENT_PAYEE_NAME || payeeName}`;
}

async function generatePaymentQrDataUrl({ orderNumber, total, payeeName }) {
  const payload = buildPaymentPayload({ orderNumber, total, payeeName });
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
  return { dataUrl, payload };
}

module.exports = { generatePaymentQrDataUrl, buildPaymentPayload };
