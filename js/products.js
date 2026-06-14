/* ====================================
   PRODUCT DATA — Babushka Olga
   All products stored as JS array
   ==================================== */

const PRODUCTS = [
  {
    id: 'sweater-gray-diamond',
    name: {
      ru: 'Свитер «Серый ромб»',
      en: 'Sweater "Gray Diamond"'
    },
    description: {
      ru: 'Вязаный крючком свитер из мягкой пряжи с классическим узором «бабушкин квадрат». V-образный вырез и эффектный зигзагообразный низ придают изделию уникальный силуэт. Идеален для прохладных вечеров у Каспийского моря.',
      en: 'Crocheted sweater made from soft yarn with classic granny square pattern. V-neckline and striking zigzag hem create a unique silhouette. Perfect for cool evenings by the Caspian Sea.'
    },
    composition: {
      ru: '50% шерсть, 50% акрил',
      en: '50% wool, 50% acrylic'
    },
    price: 35000,
    discount: 0,
    sizes: ['S', 'M', 'L', 'XL'],
    images: [
      'assets/products/sweater-gray-1.jpg',
      'assets/products/sweater-gray-2.jpg',
      'assets/products/sweater-gray-1.jpg'
    ],
    status: 'available',
    badge: 'new',
    category: 'sweater'
  },
  {
    id: 'vest-rainbow',
    name: {
      ru: 'Жилет «Радужный»',
      en: 'Vest "Rainbow"'
    },
    description: {
      ru: 'Яркий вязаный жилет с разноцветными квадратами на чёрном фоне. Боковые завязки позволяют регулировать посадку. Каждый квадрат связан уникальным сочетанием цветов — вы не найдёте двух одинаковых изделий.',
      en: 'Vibrant crocheted vest with colorful granny squares on black background. Side ties allow adjustable fit. Each square features a unique color combination — no two pieces are alike.'
    },
    composition: {
      ru: '100% хлопок',
      en: '100% cotton'
    },
    price: 25000,
    discount: 15,
    sizes: ['S', 'M', 'L'],
    images: [
      'assets/products/vest-colorful-1.jpg',
      'assets/products/vest-colorful-1.jpg',
      'assets/products/vest-colorful-1.jpg'
    ],
    status: 'available',
    badge: 'sale',
    category: 'vest'
  },
  {
    id: 'sweater-ethno',
    name: {
      ru: 'Свитер «Этно»',
      en: 'Sweater "Ethno"'
    },
    description: {
      ru: 'Многоцветный свитер с концентрическим узором, вдохновлённый казахскими национальными орнаментами. Широкий свободный крой oversize. Связан вручную из натуральной пряжи.',
      en: 'Multicolor sweater with concentric pattern inspired by Kazakh national ornaments. Wide oversized fit. Handmade from natural yarn.'
    },
    composition: {
      ru: '70% шерсть, 30% акрил',
      en: '70% wool, 30% acrylic'
    },
    price: 40000,
    discount: 0,
    sizes: ['M', 'L', 'XL'],
    images: [
      'assets/products/sweater-ethno-1.jpg',
      'assets/products/sweater-ethno-1.jpg',
      'assets/products/sweater-ethno-1.jpg'
    ],
    status: 'available',
    badge: null,
    category: 'sweater'
  },
  {
    id: 'poncho-caspian',
    name: {
      ru: 'Пончо «Каспий»',
      en: 'Poncho "Caspian"'
    },
    description: {
      ru: 'Тёплое вязаное пончо с яркими красно-синими полосами и узором granny square. Свободный крой подойдёт на любую фигуру. Идеально для морских прогулок в Актау.',
      en: 'Warm crocheted poncho with vibrant red and blue stripes and granny square pattern. Free fit suits any body type. Perfect for seaside walks in Aktau.'
    },
    composition: {
      ru: '60% шерсть, 40% акрил',
      en: '60% wool, 40% acrylic'
    },
    price: 30000,
    discount: 0,
    sizes: ['ONE SIZE'],
    images: [
      'assets/products/poncho-1.jpg',
      'assets/products/poncho-1.jpg',
      'assets/products/poncho-1.jpg'
    ],
    status: 'sold',
    badge: null,
    category: 'poncho'
  }
];

/* ── Helper functions ── */
function getProducts() {
  const stored = localStorage.getItem('bo_products');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [...PRODUCTS];
    }
  }
  return [...PRODUCTS];
}

function saveProducts(products) {
  localStorage.setItem('bo_products', JSON.stringify(products));
}

function getAvailableProducts() {
  return getProducts().filter(p => p.status === 'available');
}

function getSoldProducts() {
  return getProducts().filter(p => p.status === 'sold');
}

function getProductById(id) {
  return getProducts().find(p => p.id === id);
}

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₸';
}

function getDiscountedPrice(price, discount) {
  if (!discount) return price;
  return Math.round(price * (1 - discount / 100));
}

// Initialize products in localStorage if not exists
if (!localStorage.getItem('bo_products')) {
  saveProducts(PRODUCTS);
}
