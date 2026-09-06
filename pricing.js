const { getItem, getSyrup } = require('./menu');

class OrderValidationError extends Error {}

// Rebuilds each cart line from the menu (never trusts client-supplied prices/names)
// and returns priced lines plus the authoritative total.
function priceOrder(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new OrderValidationError('Order must contain at least one item.');
  }

  const lines = rawItems.map((raw) => {
    const item = getItem(raw && raw.itemId);
    if (!item) {
      throw new OrderValidationError(`Unknown item: ${raw && raw.itemId}`);
    }

    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new OrderValidationError(`Invalid quantity for ${item.name}.`);
    }

    let syrups = [];
    if (raw.syrupIds && raw.syrupIds.length) {
      if (!item.customizable) {
        throw new OrderValidationError(`${item.name} cannot be customised with syrups.`);
      }
      const ids = [...new Set(raw.syrupIds)];
      syrups = ids.map((id) => {
        const syrup = getSyrup(id);
        if (!syrup) throw new OrderValidationError(`Unknown syrup: ${id}`);
        return syrup;
      });
    }

    const syrupTotal = syrups.reduce((sum, s) => sum + s.price, 0);
    const unitPrice = item.price + syrupTotal;
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;

    return {
      itemId: item.id,
      name: item.name,
      category: item.category,
      qty,
      unitPrice,
      basePrice: item.price,
      syrups: syrups.map((s) => ({ id: s.id, name: s.name, price: s.price })),
      lineTotal,
    };
  });

  const total = Math.round(lines.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;
  return { lines, total };
}

module.exports = { priceOrder, OrderValidationError };
