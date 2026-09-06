(function () {
  const state = {
    cafeName: 'Cafe',
    menu: null,
    cardState: new Map(), // itemId -> { qty, syrupIds: Set }
    cart: [], // { lineId, itemId, name, qty, syrupIds: [], syrupNames: [], unitPrice, lineTotal }
  };

  const foodGrid = document.getElementById('food-grid');
  const drinksGrid = document.getElementById('drinks-grid');
  const cartLinesEl = document.getElementById('cart-lines');
  const cartTotalEl = document.getElementById('cart-total');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const errorBanner = document.getElementById('error-banner');

  const orderView = document.getElementById('order-view');
  const confirmationView = document.getElementById('confirmation-view');

  init();

  async function init() {
    const res = await fetch('/api/menu');
    const data = await res.json();
    state.cafeName = data.cafeName;
    state.menu = data.menu;

    document.getElementById('cafe-name').textContent = state.cafeName;
    document.getElementById('page-title').textContent = `Preorder — ${state.cafeName}`;

    [...state.menu.food, ...state.menu.drinks].forEach((item) => {
      state.cardState.set(item.id, { qty: 1, syrupIds: new Set() });
    });

    renderMenu(state.menu.food, foodGrid);
    renderMenu(state.menu.drinks, drinksGrid);
    renderCart();

    document.getElementById('place-order-btn').addEventListener('click', placeOrder);
    document.getElementById('new-order-btn').addEventListener('click', resetToOrderView);
    document.getElementById('customer-name').addEventListener('input', updatePlaceOrderState);
    document.getElementById('customer-phone').addEventListener('input', updatePlaceOrderState);
  }

  function renderMenu(items, container) {
    container.innerHTML = '';
    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card';

      const syrupsHtml = item.customizable
        ? `<div class="syrups">${state.menu.syrups
            .map(
              (s) => `
              <label class="syrup-chip" data-syrup="${s.id}" data-item="${item.id}">
                <input type="checkbox" value="${s.id}" />
                ${s.name} (+$${s.price.toFixed(2)})
              </label>`
            )
            .join('')}</div>`
        : '';

      card.innerHTML = `
        <div class="card-head">
          <h3>${item.name}</h3>
          <span class="price">$${item.price.toFixed(2)}</span>
        </div>
        <p class="description">${item.description}</p>
        ${syrupsHtml}
        <div class="card-footer">
          <div class="qty-stepper" data-item="${item.id}">
            <button type="button" data-action="dec">−</button>
            <span data-role="qty">1</span>
            <button type="button" data-action="inc">+</button>
          </div>
          <button class="btn btn-primary" data-action="add" data-item="${item.id}">Add</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.qty-stepper').forEach((stepper) => {
      const itemId = stepper.dataset.item;
      stepper.querySelector('[data-action="dec"]').addEventListener('click', () => {
        const cs = state.cardState.get(itemId);
        cs.qty = Math.max(1, cs.qty - 1);
        stepper.querySelector('[data-role="qty"]').textContent = cs.qty;
      });
      stepper.querySelector('[data-action="inc"]').addEventListener('click', () => {
        const cs = state.cardState.get(itemId);
        cs.qty = Math.min(20, cs.qty + 1);
        stepper.querySelector('[data-role="qty"]').textContent = cs.qty;
      });
    });

    container.querySelectorAll('.syrup-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const itemId = chip.dataset.item;
        const syrupId = chip.dataset.syrup;
        const cs = state.cardState.get(itemId);
        const checkbox = chip.querySelector('input');
        if (cs.syrupIds.has(syrupId)) {
          cs.syrupIds.delete(syrupId);
          checkbox.checked = false;
          chip.classList.remove('checked');
        } else {
          cs.syrupIds.add(syrupId);
          checkbox.checked = true;
          chip.classList.add('checked');
        }
      });
    });

    container.querySelectorAll('[data-action="add"]').forEach((btn) => {
      btn.addEventListener('click', () => addToCart(btn.dataset.item));
    });
  }

  function findItem(itemId) {
    return [...state.menu.food, ...state.menu.drinks].find((i) => i.id === itemId);
  }

  function addToCart(itemId) {
    const item = findItem(itemId);
    const cs = state.cardState.get(itemId);
    const syrupIds = [...cs.syrupIds];
    const syrups = syrupIds.map((id) => state.menu.syrups.find((s) => s.id === id));
    const unitPrice = item.price + syrups.reduce((sum, s) => sum + s.price, 0);

    state.cart.push({
      lineId: `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId,
      name: item.name,
      qty: cs.qty,
      syrupIds,
      syrupNames: syrups.map((s) => s.name),
      unitPrice,
      lineTotal: Math.round(unitPrice * cs.qty * 100) / 100,
    });

    cs.qty = 1;
    cs.syrupIds.clear();
    renderMenu(state.menu.food, foodGrid);
    renderMenu(state.menu.drinks, drinksGrid);
    renderCart();
  }

  function removeFromCart(lineId) {
    state.cart = state.cart.filter((l) => l.lineId !== lineId);
    renderCart();
  }

  function renderCart() {
    if (state.cart.length === 0) {
      cartLinesEl.innerHTML = '<p class="cart-empty">Your cart is empty. Add something tasty!</p>';
    } else {
      cartLinesEl.innerHTML = state.cart
        .map(
          (l) => `
        <div class="cart-line">
          <div>
            <div>${l.qty}× ${l.name}</div>
            ${l.syrupNames.length ? `<div class="meta">+ ${l.syrupNames.join(', ')}</div>` : ''}
            <button class="remove" data-line="${l.lineId}">Remove</button>
          </div>
          <div>$${l.lineTotal.toFixed(2)}</div>
        </div>`
        )
        .join('');

      cartLinesEl.querySelectorAll('.remove').forEach((btn) => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.line));
      });
    }

    const total = state.cart.reduce((sum, l) => sum + l.lineTotal, 0);
    cartTotalEl.textContent = `$${total.toFixed(2)}`;
    updatePlaceOrderState();
  }

  function updatePlaceOrderState() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    placeOrderBtn.disabled = state.cart.length === 0 || !name || !phone;
  }

  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
  }

  function clearError() {
    errorBanner.classList.add('hidden');
  }

  async function placeOrder() {
    clearError();
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing order…';

    const payload = {
      customerName: document.getElementById('customer-name').value.trim(),
      customerPhone: document.getElementById('customer-phone').value.trim(),
      note: document.getElementById('customer-note').value.trim(),
      items: state.cart.map((l) => ({ itemId: l.itemId, qty: l.qty, syrupIds: l.syrupIds })),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Could not place order.');
        placeOrderBtn.textContent = 'Place order';
        updatePlaceOrderState();
        return;
      }

      showConfirmation(data.order, data.paymentQr);
    } catch (err) {
      showError('Network error — please try again.');
      placeOrderBtn.textContent = 'Place order';
      updatePlaceOrderState();
    }
  }

  function showConfirmation(order, paymentQr) {
    document.getElementById('conf-order-number').textContent = order.orderNumber;
    document.getElementById('conf-total').textContent = `$${order.total.toFixed(2)}`;
    document.getElementById('conf-qr').src = paymentQr;

    document.getElementById('conf-receipt').innerHTML = order.items
      .map(
        (l) => `
      <div class="receipt-line">
        <span>${l.qty}× ${l.name}${l.syrups.length ? `<span class="meta">+ ${l.syrups.map((s) => s.name).join(', ')}</span>` : ''}</span>
        <span>$${l.lineTotal.toFixed(2)}</span>
      </div>`
      )
      .join('');

    orderView.classList.add('hidden');
    confirmationView.classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function resetToOrderView() {
    state.cart = [];
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-note').value = '';
    placeOrderBtn.textContent = 'Place order';
    renderCart();
    clearError();
    confirmationView.classList.add('hidden');
    orderView.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
})();
