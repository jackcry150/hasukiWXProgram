export function productText(product = {}) {
  return [product.title, product.subtitle, product.proportion, product.dimensions, product.material,
    ...(Array.isArray(product.version) ? product.version : [])].filter(Boolean).join(' ').toLowerCase();
}

export function productScales(product = {}) {
  const text = productText(product).replace(/[：:／]/g, '/');
  return [...new Set(Array.from(text.matchAll(/(?:^|[^\d])1\s*\/\s*(\d{1,3})(?!\d)/g), match => `1/${Number(match[1])}`))];
}

export function saleState(product = {}, now = Date.now() / 1000) {
  if (Number(product.is_supervising) === 1 || product.isReservation) return 'preview';
  if (Number(product.startTimeStamp) > now) return 'preview';
  if (Number(product.type) === 2) {
    if (Number(product.endTimeStamp) > 0 && Number(product.endTimeStamp) <= now) return 'closed';
    return 'presale';
  }
  return 'stock';
}

export function browseProducts(products, { keyword = '', scale = '', state = '', availableFirst = true, now } = {}) {
  const words = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const seen = new Set();
  const rows = products.filter(product => {
    if (!product) return false;
    const key = product.id || `${product.title}-${product.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return words.every(word => productText(product).includes(word))
      && (!scale || productScales(product).includes(scale))
      && (!state || saleState(product, now) === state);
  });
  if (!availableFirst) return rows;
  const rank = product => ({ stock: 0, presale: 0, preview: 1, closed: 2 })[saleState(product, now)];
  return rows.map((product, index) => ({ product, index }))
    .sort((a, b) => rank(a.product) - rank(b.product) || a.index - b.index)
    .map(row => row.product);
}

export function productSubtitle(product = {}) {
  const subtitle = String(product.subtitle || '').trim();
  const title = String(product.title || '').trim();
  if (!subtitle || title.includes(subtitle) || subtitle === '更多款式信息请进入详情页查看') return '';
  return subtitle;
}

export function albumSearchKeyword(album = {}) {
  return String(album.title || '').split(/来源\s*[：:]/)[0]
    .replace(/GooMooPlay|橘猫智酷|HASUKI/gi, '').trim().slice(0, 80);
}

export function decodeSearchKeyword(value) {
  if (typeof value !== 'string') return '';
  try { return decodeURIComponent(value).slice(0, 80); }
  catch { return value.slice(0, 80); }
}
