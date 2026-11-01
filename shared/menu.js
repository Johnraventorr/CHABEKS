// MENU NG CHABAKES — dito i-edit ang pangalan, description, presyo at picture (nasa /public/images).
// opts = [[label, presyo], ...]. Ang presyo/availability ay puwede ring baguhin ng admin sa "Menu" tab.
// Ginagamit ito ng frontend AT ng server, kaya hindi puwedeng dayain ang presyo.
const box6 = [['per piece', 50], ['box of 6', 300]]

export const categories = [
  {
    id: 'cookies', title: 'Cookies', cover: 'og', shape: 'round',
    note: '40g each · premium ingredients · crafted with love',
    items: [
      { name: 'OG Choco Chip', img: 'og', desc: 'Rich, gooey, and studded with melty chocolate chips and chunks.', opts: box6 },
      { name: "S'more or Less", img: 'smore', desc: 'Toasted marshmallow bliss with melted chocolate and a graham cracker crunch.', opts: box6 },
      { name: 'Red Velvet', img: 'red', desc: 'Velvet cookie with hints of sweetness coming from the cream cheese filling.', opts: box6 },
      { name: 'Biscoff Dream', img: 'biscoff', desc: 'Cookie butter infused with caramelized Biscoff crunch and smoothie.', opts: box6 },
      { name: 'Double Choco', img: 'double', desc: 'Deep, rich cocoa cookie packed with bursts of chocolate chunks.', opts: box6 },
      { name: 'Brookie', img: 'brookie', desc: 'The perfect mashup of fudgy brownie and classic chocolate chip cookie.', opts: box6 },
    ],
  },
  {
    id: 'loaves', title: 'Banana Loaves', cover: 'nuts', shape: 'sq',
    note: 'Choconana series · 400 grams each',
    items: [
      { name: 'Choconana & Nuts', img: 'nuts', desc: 'Made with ripe bananas. Moist, sweet, and topped with choco chunks and nuts.', opts: [['400 g', 170]] },
      { name: 'Choconana', img: 'choco', desc: 'Moist, sweet, and perfectly spiced banana bread graciously topped with chocolate chunks.', opts: [['400 g', 160]] },
      { name: 'Choconana Biscoff', img: 'bisloaf', desc: 'Perfect moist banana bread—enhanced by cookie butter taste from Biscoff.', opts: [['400 g', 180]] },
    ],
  },
  {
    id: 'pastries', title: 'Pastries', cover: 'crink', shape: 'sq',
    note: '',
    items: [
      {
        name: 'Cinnamon Roll', img: 'cinn',
        desc: 'Pillowy dough, buttery cinnamon-sugar filling, topped with creamcheese frosting. Per piece.',
        opts: [['Classic', 60], ['Nutella Nuts', 65], ["S'mores", 65], ['Tiramisu', 65]],
      },
      { name: 'Red Velvet Crinkles w/ Creamcheese', img: 'crink', desc: 'Soft, chewy, and coated in powdered sugar filled with cream cheese at the center.', opts: [['box of 9', 185]] },
      { name: 'Banana Muffins', img: 'muff', desc: 'Soft, moist, and naturally sweet, made with ripe, flavorful bananas.', opts: [['chocolate chips', 45], ['chocochips with nuts', 50], ['chocochips with creamcheese', 55]] },
    ],
  },
  {
    id: 'brownies', title: 'Brownies', cover: 'brow', shape: 'sq',
    note: '',
    items: [
      { name: 'Classic Brownie', img: 'brow', desc: 'Fudgy classic brownie.', opts: [['box of 6', 150]] },
    ],
  },
]

export const STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled']
export const PAYMENTS = ['Cash', 'GCash']
export const FULFILLMENT = ['Pickup', 'Delivery']

/** Stable key ng isang variant: "Item|label" */
export const optKey = (item, label) => `${item}|${label}`
