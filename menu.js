// Single source of truth for what's sellable and at what price.
// Prices are in dollars; the server always recomputes totals from here,
// never trusting a price sent by the browser.

const SYRUPS = [
  { id: 'vanilla', name: 'Vanilla syrup', price: 0.5 },
  { id: 'caramel', name: 'Caramel syrup', price: 0.5 },
  { id: 'hazelnut', name: 'Hazelnut syrup', price: 0.5 },
  { id: 'sugar-free-vanilla', name: 'Sugar-free vanilla syrup', price: 0.5 },
];

const Cafe X Coffee Club exclusives = [
  {
    id: 'pudding-matcha:',
    category: 'Cafe X Coffee Club exclusives',
    name: 'banana pudding matcha',
    description: 'a trendy, dessert-inspired fusion treat that combines classic vanilla banana pudding with the earthy, vibrant flavor of Japanese green tea.',
    price: 3.5,
    customizable: false,
  },
  {
    id: 'affogato',
    category: 'Cafe X Coffee Club exclusives',
    name: 'affofato',
    description: 'a cold scoop of vanilla ice cream or gelato with a hot shot of rich espresso',
    price: 2.5,
    customizable: false,
  },
  {
    id: 'red velvet cookie',
    category: 'Cafe X Coffee Club exclusives',
    name: 'red velvet cookie',
    description: 'A red velvet cookie is a striking, vibrant red treat that combines the classic cocoa and subtle tangy flavor of traditional red velvet cake with a soft, chewy cookie texture. ',
    price: 1.0,
    customizable: false,
  },
];

const DRINKS = [
  {
    id: 'iced-latte',
    category: 'drink',
    name: 'Iced Latte',
    description: 'Espresso, milk, over ice',
    price: 4.5,
    customizable: true,
  },
  {
    id: 'cappuccino',
    category: 'drink',
    name: 'Cappuccino',
    description: 'Espresso, steamed milk, thick foam',
    price: 4.2,
    customizable: true,
  },
  {
    id: 'iced-tea',
    category: 'drink',
    name: 'Iced Tea',
    description: 'House-brewed black tea, over ice',
    price: 3.8,
    customizable: true,
  },
  {
    id: 'hot-chocolate',
    category: 'drink',
    name: 'Hot Chocolate',
    description: 'Steamed milk, Belgian cocoa',
    price: 4.0,
    customizable: true,
  },
];

const ALL_ITEMS = [...FOOD, ...DRINKS];
const ITEMS_BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]));
const SYRUPS_BY_ID = new Map(SYRUPS.map((s) => [s.id, s]));

function getMenu() {
  return { food: FOOD, drinks: DRINKS, syrups: SYRUPS };
}

function getItem(itemId) {
  return ITEMS_BY_ID.get(itemId);
}

function getSyrup(syrupId) {
  return SYRUPS_BY_ID.get(syrupId);
}

module.exports = { getMenu, getItem, getSyrup };
