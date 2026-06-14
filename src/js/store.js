// store.js - State Management using LocalStorage

const PRODUCTS_KEY = 'babushka_olga_products';
const VIDEO_KEY = 'babushka_olga_video_url';

const DEFAULT_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-hand-knitting-a-wool-yarn-sweater-40348-large.mp4';

const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Кардиган "Мозаика"',
    description: 'Яркий и невероятно уютный кардиган, собранный вручную из традиционных мотивов "бабушкин квадрат". Свободный крой оверсайз, спущенная линия плеча и широкие рукава создают расслабленный силуэт. Теплый и объемный, он идеально подойдет для прохладных вечеров.',
    price: 18500,
    sizes: ['OS (One Size)'],
    status: 'in_stock', // in_stock, running_low, sold
    images: [
      '/product1_1.jpg',
      '/product1_1.jpg', // Detail view (handled via CSS styling)
      '/product1_1.jpg'  // Texture view
    ]
  },
  {
    id: 'prod-2',
    name: 'Джемпер "Шахматы"',
    description: 'Стильный вязаный джемпер с контрастным шахматным узором в черно-серых тонах. Декоративный фигурный край низа придает изделию оригинальный вид. Выполнен из мягкой премиальной пряжи, которая отлично держит форму и приятна к телу.',
    price: 14200,
    sizes: ['S', 'M'],
    status: 'running_low',
    images: [
      '/product2_1.jpg',
      '/product2_1.jpg',
      '/product2_1.jpg'
    ]
  },
  {
    id: 'prod-3',
    name: 'Пончо "Этно Рустик"',
    description: 'Традиционное пончо с воротником-лодочкой в яркой красно-синей гамме с этническими узорами. Бахрома по нижнему краю и геометрический крой создают динамичный образ в стиле бохо. Отличная альтернатива легкой куртке или кардигану.',
    price: 12800,
    sizes: ['OS (One Size)'],
    status: 'sold', // Archived item
    images: [
      '/product3_1.jpg',
      '/product3_1.jpg',
      '/product3_1.jpg'
    ]
  },
  {
    id: 'prod-4',
    name: 'Жилет "Квадраты Коко"',
    description: 'Вязаный жилет ручной работы на боковых завязках. Собран из ярких цветочных мотивов на глубоком черном фоне. Регулируемый объем за счет завязок позволяет сочетать жилет с рубашками, платьями или носить как самостоятельный топ.',
    price: 9500,
    sizes: ['S', 'M', 'L'],
    status: 'in_stock',
    images: [
      '/product4_1.jpg',
      '/product4_1.jpg',
      '/product4_1.jpg'
    ]
  }
];

export function initStore() {
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem(VIDEO_KEY)) {
    localStorage.setItem(VIDEO_KEY, DEFAULT_VIDEO_URL);
  }
}

export function getProducts() {
  initStore();
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY));
  } catch (e) {
    console.error('Error parsing products from localStorage', e);
    return DEFAULT_PRODUCTS;
  }
}

export function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function addProduct(product) {
  const products = getProducts();
  const newProduct = {
    id: 'prod-' + Date.now(),
    ...product,
    price: Number(product.price) || 0,
    sizes: Array.isArray(product.sizes) ? product.sizes : [product.sizes]
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(id, updatedFields) {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = {
      ...products[index],
      ...updatedFields,
      price: updatedFields.price !== undefined ? Number(updatedFields.price) : products[index].price,
      sizes: updatedFields.sizes !== undefined ? (Array.isArray(updatedFields.sizes) ? updatedFields.sizes : [updatedFields.sizes]) : products[index].sizes
    };
    saveProducts(products);
    return products[index];
  }
  return null;
}

export function deleteProduct(id) {
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  saveProducts(products);
}

export function getVideoUrl() {
  initStore();
  return localStorage.getItem(VIDEO_KEY) || DEFAULT_VIDEO_URL;
}

export function saveVideoUrl(url) {
  localStorage.setItem(VIDEO_KEY, url);
}
