// 公開商品頁（不用登入就看得到，給 Google 和第一次來的客人看）
//   /shop          全部商品
//   /item/商品編號  單一商品頁（有價格、照片、說明，按鈕才進 LINE 喊單）
//   /sitemap.xml   給 Google 搜尋的網站地圖
// 不會出現：隱藏中、客訂（只給指定客人看）、缺貨、連線已結束、已關閉專區的商品
const SUPABASE_URL = 'https://dqimojivpeennporcbwv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eHAca3rAtH_a8cQz6ggtaA_fxgCEPK6';
const LIFF_ID = '2011208900-FRP3QI9Q';
const SHOP_NAME = '四郎玩具箱';
const SHOP_DESC = '日本代購・現場連線｜扭蛋、寶可夢、三麗鷗、松本清藥妝、日本限定與機場限定商品，加入 LINE 就能喊單。';
const MAX_SLOT = 20;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
function imgUrl(p, slot) {
  return SUPABASE_URL + '/storage/v1/object/public/product-images/' + p.id + (slot > 1 ? '-' + slot : '') + '.jpg' + (p.image_version ? '?v=' + p.image_version : '');
}
function slotsOf(p) {
  if (p.photo_slots === null || p.photo_slots === undefined) return [];
  return String(p.photo_slots).split(',').map((x) => parseInt(x, 10)).filter((n) => n >= 2 && n <= MAX_SLOT);
}
function optList(raw) { return String(raw || '').split(/[,，、\n]/).map((x) => x.trim()).filter(Boolean); }
function optPrices(p) {
  let o = {};
  try { o = typeof p.option_prices === 'string' ? (p.option_prices ? JSON.parse(p.option_prices) : {}) : (p.option_prices || {}); } catch (e) { o = {}; }
  const allowed = optList(p.options);
  const out = {};
  Object.keys(o || {}).forEach((k) => { const v = Math.round(Number(o[k])); if (v > 0 && allowed.includes(k)) out[k] = v; });
  return out;
}
// 有規格不同價：顯示最低價「起」
function priceInfo(p) {
  const base = Math.round(Number(p.price) || 0);
  const vals = Object.values(optPrices(p));
  const all = vals.concat(base > 0 ? [base] : []);
  if (!all.length) return { min: 0, max: 0 };
  return { min: Math.min(...all), max: Math.max(...all) };
}
// 商品名稱裡的日文括號（例如「（ブライトC）」）保留在 Google 用的標題裡，日本名也搜得到
function stockText(p, zones) {
  if (p.stock_status === 'in') return { label: '現貨', avail: 'in_stock' };
  if (p.stock_status === 'preorder') return { label: '預購', avail: 'preorder' };
  if (p.stock_status === 'live_limited') {
    const z = p.live_zone_id && zones ? zones[p.live_zone_id] : null;
    if (z && z.is_open === false) return { label: '連線已結束', avail: 'out_of_stock' };
    return { label: '日本連線中・限時喊單', avail: 'in_stock' };
  }
  return { label: '目前無法喊單', avail: 'out_of_stock' };
}
function isPublic(p) {
  return p && !p.is_hidden && !p.is_private && Number(p.price) > 0;
}
function liffUrl(p) {
  return 'https://liff.line.me/' + LIFF_ID + '?view=product&pid=' + encodeURIComponent(p.id) + '&src=web';
}

async function getProducts(filter) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/products?select=*' + (filter || ''), { headers: { apikey: SUPABASE_KEY } });
  if (!r.ok) throw new Error('products ' + r.status);
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}
async function getZones() {
  try {
    const r = await fetch(SUPABASE_URL + '/functions/v1/member-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
      body: JSON.stringify({ action: 'get-live-zones' }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const map = {};
    (d.zones || []).forEach((z) => { map[z.id] = z; });
    return map;
  } catch (e) { return null; }
}
async function listable() {
  const [rows, zones] = await Promise.all([
    getProducts('&is_hidden=not.is.true&is_private=not.is.true&stock_status=in.(in,preorder,live_limited)&order=listed_at.desc.nullslast'),
    getZones(),
  ]);
  const list = rows.filter(isPublic).filter((p) => stockText(p, zones).avail !== 'out_of_stock');
  return { list, zones };
}

const CSS = ':root{--bg:#F6F4F1;--card:#fff;--ink:#1B1E27;--muted:#6B7080;--line:#E7E3DE;--accent:#E8553B;--line-green:#06C755}'
  + '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;line-height:1.55}'
  + 'a{color:inherit}header{background:#171A24;color:#fff;padding:14px 16px}header a{text-decoration:none}header b{font-size:18px}header small{display:block;color:#AEB3C2;font-size:12px;margin-top:2px}'
  + 'main{max-width:960px;margin:0 auto;padding:16px}h1{font-size:20px;margin:4px 0 12px}'
  + '.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(min-width:640px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}'
  + '.card{background:var(--card);border-radius:16px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column;border:1px solid var(--line)}'
  + '.card img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#fff;display:block}.card div{padding:10px 12px 12px}'
  + '.card h2{font-size:14px;margin:0 0 4px;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
  + '.price{font-weight:800;font-size:16px}.tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#FDECE8;color:var(--accent);margin-bottom:6px}'
  + '.cats{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}.cats a{flex:none;text-decoration:none;font-size:13px;font-weight:700;padding:6px 12px;border-radius:999px;background:#fff;border:1px solid var(--line)}.cats a.on{background:var(--ink);color:#fff;border-color:var(--ink)}'
  + '.item{display:grid;gap:16px}@media(min-width:720px){.item{grid-template-columns:1fr 1fr}}'
  + '.gal{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory}.gal img{flex:none;width:100%;aspect-ratio:1/1;object-fit:contain;background:#fff;border-radius:16px;scroll-snap-align:start;border:1px solid var(--line)}'
  + '.box{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px}.box p{margin:6px 0}'
  + '.btn{display:block;text-align:center;text-decoration:none;font-weight:800;font-size:16px;padding:14px;border-radius:999px;background:var(--line-green);color:#fff;margin-top:12px}'
  + '.opts{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.opts span{font-size:13px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:#FAFAF8}'
  + '.how{font-size:13px;color:var(--muted)}.how ol{padding-left:20px;margin:6px 0}footer{max-width:960px;margin:0 auto;padding:20px 16px 40px;font-size:12px;color:var(--muted)}footer a{margin-right:12px}';

function page(o) {
  return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(o.title) + '</title>'
    + '<meta name="description" content="' + esc(o.desc) + '">'
    + '<link rel="canonical" href="' + esc(o.url) + '">'
    + '<meta property="og:type" content="' + (o.ogType || 'website') + '"><meta property="og:site_name" content="' + SHOP_NAME + '">'
    + '<meta property="og:title" content="' + esc(o.title) + '"><meta property="og:description" content="' + esc(o.desc) + '">'
    + '<meta property="og:url" content="' + esc(o.url) + '">' + (o.image ? '<meta property="og:image" content="' + esc(o.image) + '">' : '')
    + (o.jsonld ? '<script type="application/ld+json">' + JSON.stringify(o.jsonld).replace(/</g, '\\u003c') + '</script>' : '')
    + '<style>' + CSS + '</style></head><body>'
    + '<header><a href="/shop"><b>🧸 ' + SHOP_NAME + '</b><small>日本代購・現場連線・LINE 喊單</small></a></header>'
    + '<main>' + o.body + '</main>'
    + '<footer><a href="/shop">全部商品</a><a href="/info">購買說明</a><a href="https://liff.line.me/' + LIFF_ID + '">加入 LINE</a>'
    + '<p>© ' + SHOP_NAME + '・Instagram／Threads @shiros_toybox</p></footer>'
    + '</body></html>';
}
function send(res, html, type, maxAge) {
  res.setHeader('Content-Type', (type || 'text/html') + '; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=' + (maxAge || 600) + ', stale-while-revalidate=3600');
  res.status(200).send(html);
}

async function listPage(req, res, host) {
  const { list, zones } = await listable();
  const cat = String(req.query.c || '').trim();
  const cats = [];
  const seen = {};
  list.forEach((p) => { const k = p.cat || ''; if (k && !seen[k]) { seen[k] = 1; cats.push({ k, label: p.cat_label || k }); } });
  const shown = cat ? list.filter((p) => p.cat === cat) : list;
  const catLabel = cat ? ((cats.find((x) => x.k === cat) || {}).label || '') : '';
  const body = '<h1>' + esc(catLabel || '全部商品') + '<span style="font-size:13px;color:#6B7080;font-weight:500;">　' + shown.length + ' 件</span></h1>'
    + '<nav class="cats"><a href="/shop"' + (cat ? '' : ' class="on"') + '>全部</a>'
    + cats.map((c) => '<a href="/shop?c=' + encodeURIComponent(c.k) + '"' + (c.k === cat ? ' class="on"' : '') + '>' + esc(c.label) + '</a>').join('') + '</nav>'
    + '<div class="grid">' + shown.map((p) => {
      const pi = priceInfo(p);
      return '<a class="card" href="/item/' + encodeURIComponent(p.id) + '"><img loading="lazy" src="' + esc(imgUrl(p, 1)) + '" alt="' + esc(p.name) + '">'
        + '<div><span class="tag">' + esc(stockText(p, zones).label) + '</span><h2>' + esc(p.name) + '</h2>'
        + '<span class="price">NT$' + fmt(pi.min) + (pi.max > pi.min ? ' 起' : '') + '</span></div></a>';
    }).join('') + '</div>'
    + (shown.length ? '' : '<p>目前沒有商品，歡迎加入 LINE 看最新連線 ♡</p>');
  send(res, page({
    title: (catLabel ? catLabel + '｜' : '') + SHOP_NAME + '｜日本代購・現場連線',
    desc: SHOP_DESC, url: 'https://' + host + '/shop' + (cat ? '?c=' + encodeURIComponent(cat) : ''),
    image: shown[0] ? imgUrl(shown[0], 1) : '', body,
  }));
}

async function itemPage(req, res, host) {
  const id = String(req.query.id || '').trim();
  let p = null;
  let zones = null;
  if (/^[A-Za-z0-9_\-]+$/.test(id)) {
    try {
      const [rows, z] = await Promise.all([getProducts('&id=eq.' + encodeURIComponent(id)), getZones()]);
      p = rows[0] || null; zones = z;
    } catch (e) { p = null; }
  }
  if (!isPublic(p)) {
    res.statusCode = 404;
    return send(res, page({ title: '找不到這件商品｜' + SHOP_NAME, desc: SHOP_DESC, url: 'https://' + host + '/shop',
      body: '<div class="box"><p><b>這件商品已經下架或還沒公開</b></p><p><a href="/shop">看其他商品 →</a></p></div>' }), 'text/html', 60);
  }
  const pi = priceInfo(p);
  const st = stockText(p, zones);
  const slots = [1].concat(slotsOf(p));
  const imgs = slots.map((s) => imgUrl(p, s));
  const opts = optList(p.options);
  const op = optPrices(p);
  const opts2 = optList(p.options2);
  const url = 'https://' + host + '/item/' + encodeURIComponent(p.id);
  const desc = (p.sub ? p.sub + '・' : '') + '日本代購，' + st.label + '。加入 LINE 就能喊單。';
  const canOrder = st.avail !== 'out_of_stock';
  const body = '<div class="item"><div class="gal">' + imgs.map((u, i) => '<img ' + (i ? 'loading="lazy" ' : '') + 'src="' + esc(u) + '" alt="' + esc(p.name) + (i ? ' ' + (i + 1) : '') + '">').join('') + '</div>'
    + '<div><div class="box"><span class="tag">' + esc(st.label) + '</span>'
    + (p.cat_label ? '<span class="tag" style="background:#EEF2FF;color:#3730A3;margin-left:6px;">' + esc(p.cat_label) + '</span>' : '')
    + '<h1>' + esc(p.name) + '</h1>'
    + '<p class="price" style="font-size:22px;">NT$' + fmt(pi.min) + (pi.max > pi.min ? ' ～ ' + fmt(pi.max) : '') + '</p>'
    + (p.sub ? '<p>' + esc(p.sub) + '</p>' : '')
    + (opts.length ? '<p style="font-size:13px;font-weight:700;margin-top:12px;">' + esc(String(p.option_label || '款式').replace(/（.*$/, '')) + '</p><div class="opts">' + opts.map((o) => '<span>' + esc(o) + (op[o] ? '　NT$' + fmt(op[o]) : '') + '</span>').join('') + '</div>' : '')
    + (opts2.length && opts2.join() !== opts.join() ? '<p style="font-size:13px;font-weight:700;">' + esc(String(p.option2_label || '規格').replace(/（.*$/, '')) + '</p><div class="opts">' + opts2.map((o) => '<span>' + esc(o) + '</span>').join('') + '</div>' : '')
    + (canOrder ? '<a class="btn" href="' + esc(liffUrl(p)) + '">💬 用 LINE 喊單</a>' : '<p style="margin-top:12px;font-weight:700;">這件目前無法喊單，加入 LINE 看下一次連線 ♡</p><a class="btn" href="https://liff.line.me/' + LIFF_ID + '">加入 LINE</a>')
    + '</div>'
    + '<div class="box how" style="margin-top:12px;"><b style="color:#1B1E27;">怎麼買？</b><ol><li>按上面的按鈕，加入四郎玩具箱 LINE</li><li>選款式、數量後喊單</li><li>結單後匯款，商品備齊後用超商店到店或宅配寄出</li></ol><a href="/info">完整購買說明 →</a></div>'
    + '</div></div>';
  const jsonld = {
    '@context': 'https://schema.org/', '@type': 'Product', name: p.name, image: imgs, description: p.sub || p.name, sku: p.id,
    offers: {
      '@type': pi.max > pi.min ? 'AggregateOffer' : 'Offer', priceCurrency: 'TWD',
      ...(pi.max > pi.min ? { lowPrice: pi.min, highPrice: pi.max, offerCount: Math.max(opts.length, 1) } : { price: pi.min }),
      availability: st.avail === 'preorder' ? 'https://schema.org/PreOrder' : st.avail === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition', url, seller: { '@type': 'Organization', name: SHOP_NAME },
    },
  };
  send(res, page({ title: p.name + '｜' + SHOP_NAME, desc, url, image: imgs[0], body, jsonld, ogType: 'product' }));
}

function xmlEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
async function sitemap(req, res, host) {
  const { list } = await listable();
  const urls = ['/shop', '/info'].map((u) => '<url><loc>https://' + host + u + '</loc></url>')
    .concat(list.map((p) => '<url><loc>https://' + host + '/item/' + encodeURIComponent(p.id) + '</loc></url>'));
  send(res, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join('') + '</urlset>', 'application/xml', 1800);
}

module.exports = async (req, res) => {
  const host = (req.headers && req.headers.host) || 'shiros-toybox.vercel.app';
  try {
    if (req.query.sitemap) return await sitemap(req, res, host);
    if (req.query.id) return await itemPage(req, res, host);
    return await listPage(req, res, host);
  } catch (e) {
    res.statusCode = 500;
    send(res, page({ title: SHOP_NAME, desc: SHOP_DESC, url: 'https://' + host + '/shop', body: '<div class="box"><p>暫時讀不到商品，請稍後再試。</p></div>' }), 'text/html', 30);
  }
};
