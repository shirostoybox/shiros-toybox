// 商品分享連結：/p/商品編號　專區分享連結：/z/專區編號
// LINE、Threads 來讀這個網址時，回傳商品名稱和照片（不放價格）當作預覽；
// 客人點開後，自動轉到 LINE 裡的四郎玩具箱，並打開這個商品。
const SUPABASE_URL = 'https://dqimojivpeennporcbwv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eHAca3rAtH_a8cQz6ggtaA_fxgCEPK6';
const LIFF_ID = '2011208900-FRP3QI9Q';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function zonePage(req, res) {
  const zoneId = String(req.query.zone || '').trim();
  const note = String(req.query.n || '').trim().slice(0, 40);
  let image = '';
  let count = 0;
  if (/^[A-Za-z0-9_\-]+$/.test(zoneId)) {
    try {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/products?live_zone_id=eq.' + encodeURIComponent(zoneId) + '&stock_status=eq.live_limited&is_hidden=is.false&select=id,image_version,is_private',
        { headers: { apikey: SUPABASE_KEY } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          count = rows.length;
          const pub = rows.filter((x) => !x.is_private);
          const last = pub.length ? pub[pub.length - 1] : null;
          if (last) image = SUPABASE_URL + '/storage/v1/object/public/product-images/' + last.id + '.jpg' + (last.image_version ? '?v=' + last.image_version : '');
        }
      }
    } catch (e) { /* 讀不到就用一般的預覽 */ }
  }
  // 後台有上傳「分享封面圖」就優先用封面圖，沒有才用最新上架的商品照片
  if (/^[A-Za-z0-9_\-]+$/.test(zoneId)) {
    try {
      const coverBase = SUPABASE_URL + '/storage/v1/object/public/product-images/zonecover-' + encodeURIComponent(zoneId) + '.jpg';
      const h = await fetch(coverBase + '?check=' + Date.now(), { method: 'HEAD' });
      if (h.ok) {
        const tag = String(h.headers.get('etag') || h.headers.get('last-modified') || Date.now()).replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
        image = coverBase + '?v=' + tag;
      }
    } catch (e) { /* 沒有封面圖就用商品照片 */ }
  }
  const host = (req.headers && req.headers.host) || 'shiros-toybox.vercel.app';
  const zver = String(req.query.v || '').replace(/[^0-9a-z]/gi, '').slice(0, 16);
  const zqs = [];
  if (note) zqs.push('n=' + encodeURIComponent(note));
  if (zver) zqs.push('v=' + zver);
  const pageUrl = 'https://' + host + '/z/' + encodeURIComponent(zoneId) + (zqs.length ? '?' + zqs.join('&') : '');
  const goUrl = 'https://liff.line.me/' + LIFF_ID + '?view=live&zone=' + encodeURIComponent(zoneId);
  const title = '限時連線專區' + (note ? '｜' + note : '') + '｜四郎玩具箱';
  const desc = (count ? count + ' 件限時商品開放喊單中・' : '') + '日本連線代購，點進來看看 ♡';
  sendPage(res, { title, desc, image, pageUrl, goUrl, heading: '限時連線專區' + (note ? '｜' + note : '') });
}

function sendPage(res, o) {
  const html = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(o.title) + '</title>'
    + '<meta name="description" content="' + esc(o.desc) + '">'
    + '<meta property="og:type" content="website">'
    + '<meta property="og:site_name" content="四郎玩具箱">'
    + '<meta property="og:title" content="' + esc(o.title) + '">'
    + '<meta property="og:description" content="' + esc(o.desc) + '">'
    + '<meta property="og:url" content="' + esc(o.pageUrl) + '">'
    + (o.image ? '<meta property="og:image" content="' + esc(o.image) + '">' : '')
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + esc(o.title) + '">'
    + '<meta name="twitter:description" content="' + esc(o.desc) + '">'
    + (o.image ? '<meta name="twitter:image" content="' + esc(o.image) + '">' : '')
    + '<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#171A24;color:#F3F4F8;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif;text-align:center;padding:24px;box-sizing:border-box}'
    + 'img{width:160px;height:160px;object-fit:cover;border-radius:18px;background:#fff}a{color:#2FD8C9;font-weight:700}</style>'
    + '</head><body>'
    + (o.image ? '<img src="' + esc(o.image) + '" alt="">' : '')
    + '<p style="margin:0;font-weight:700;">' + esc(o.heading) + '</p>'
    + '<p style="margin:0;font-size:13px;color:#9AA0B4;">正在前往四郎玩具箱⋯</p>'
    + '<a href="' + esc(o.goUrl) + '">沒有自動跳轉，請點這裡</a>'
    + '<script>setTimeout(function(){location.replace(' + JSON.stringify(o.goUrl) + ');},300);</script>'
    + '</body></html>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
}

// 分類分享頁：/c/分類?z=專區編號（或 regular＝現貨・預購）&n=分類名稱&zn=專區備註&v=版本
function shortHash(str) {
  let h = 0; str = String(str || '');
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}
async function catPage(req, res) {
  const cat = String(req.query.cat || '').trim().slice(0, 60);
  // 短網址 /c/分類/版本 沒帶專區：自動判斷（這個分類有限時連線商品就用它的專區，沒有就是現貨・預購）
  let zoneKey = String(req.query.z || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 40);
  if (!zoneKey && cat) {
    try {
      const zr = await fetch(
        SUPABASE_URL + '/rest/v1/products?cat=eq.' + encodeURIComponent(cat) + '&stock_status=eq.live_limited&select=live_zone_id&limit=1',
        { headers: { apikey: SUPABASE_KEY } }
      );
      if (zr.ok) { const zrows = await zr.json(); if (Array.isArray(zrows) && zrows.length && zrows[0].live_zone_id) zoneKey = String(zrows[0].live_zone_id); }
    } catch (e) { /* 判斷不到就當現貨・預購 */ }
  }
  if (!zoneKey) zoneKey = 'regular';
  let label = String(req.query.n || '').trim().slice(0, 40);
  const ver = String(req.query.v || '').replace(/[^0-9a-z]/gi, '').slice(0, 16);
  const isLive = zoneKey !== 'regular';
  let image = '';
  let count = 0;
  if (cat) {
    try {
      const filter = isLive
        ? '&live_zone_id=eq.' + encodeURIComponent(zoneKey) + '&stock_status=eq.live_limited'
        : '&stock_status=in.(in,preorder)';
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/products?cat=eq.' + encodeURIComponent(cat) + filter + '&is_hidden=is.false&select=id,image_version,cat_label,is_private',
        { headers: { apikey: SUPABASE_KEY } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          count = rows.length;
          if (!label) label = String(rows[0].cat_label || '').trim();
          const pub = rows.filter((x) => !x.is_private);
          const last = pub.length ? pub[pub.length - 1] : null;
          if (last) image = SUPABASE_URL + '/storage/v1/object/public/product-images/' + last.id + '.jpg' + (last.image_version ? '?v=' + last.image_version : '');
        }
      }
    } catch (e) { /* 讀不到就用一般的預覽 */ }
    // 有拼好的分類預覽圖就用它
    try {
      const coverBase = SUPABASE_URL + '/storage/v1/object/public/product-images/catcover-' + zoneKey + '-' + shortHash(cat) + '.jpg';
      const h = await fetch(coverBase + '?check=' + Date.now(), { method: 'HEAD' });
      if (h.ok) {
        const tag = String(h.headers.get('etag') || h.headers.get('last-modified') || Date.now()).replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
        image = coverBase + '?v=' + tag;
      }
    } catch (e) { /* 沒有預覽圖就用商品照片 */ }
  }
  const host = (req.headers && req.headers.host) || 'shiros-toybox.vercel.app';
  if (!label) label = '商品分類';
  // og:url 照原本分享的網址格式：有帶 z= 就保留，才不會被判斷到別的專區
  const pageUrl = 'https://' + host + '/c/' + encodeURIComponent(cat) + (req.query.z
    ? '?z=' + encodeURIComponent(zoneKey) + (ver ? '&v=' + ver : '')
    : (ver ? '/' + ver : ''));
  const goUrl = 'https://liff.line.me/' + LIFF_ID + (isLive
    ? '?view=live&zone=' + encodeURIComponent(zoneKey) + '&cat=' + encodeURIComponent(cat)
    : '?view=shop&cat=' + encodeURIComponent(cat));
  const where = isLive ? '限時連線專區' : '現貨・預購';
  const title = label + '｜' + where + '｜四郎玩具箱';
  const desc = (count ? count + ' 件商品開放喊單中・' : '') + '日本連線代購，點進來看看 ♡';
  sendPage(res, { title, desc, image, pageUrl, goUrl, heading: label + '｜' + where });
}

module.exports = async (req, res) => {
  if (req.query && req.query.cat) return catPage(req, res);
  if (req.query && req.query.zone) return zonePage(req, res);
  const id = String((req.query && req.query.id) || '').trim();
  let product = null;
  if (id && /^[A-Za-z0-9_\-]+$/.test(id)) {
    try {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(id) + '&select=id,name,sub,image_version,options,option_photos,is_private,is_hidden',
        { headers: { apikey: SUPABASE_KEY } }
      );
      if (r.ok) {
        const rows = await r.json();
        // 隱藏中的商品：預覽不顯示名稱和照片，當作找不到
        if (Array.isArray(rows) && rows.length && !rows[0].is_hidden) product = rows[0];
      }
    } catch (e) { /* 讀不到就用一般的預覽 */ }
  }

  const host = (req.headers && req.headers.host) || 'shiros-toybox.vercel.app';
  // 分享連結帶的 ?v= 版本號也放進 og:url，LINE 等 App 才會把它當成新網址重新抓預覽
  const ver = String((req.query && req.query.v) || '').replace(/[^0-9a-z]/gi, '').slice(0, 16);
  // ?o=選項（例如角色）：只接受這件商品規格一裡有的選項
  let opt = String((req.query && req.query.o) || '').trim().slice(0, 40);
  const optList = product ? String(product.options || '').split(/[,，、\n]/).map((x) => x.trim()).filter(Boolean) : [];
  if (!optList.includes(opt) || (product && product.is_private)) opt = '';
  let optPhotos = {};
  try { optPhotos = product && product.option_photos ? JSON.parse(product.option_photos) : {}; } catch (e) { optPhotos = {}; }
  const optSlot = opt ? parseInt(optPhotos[opt], 10) : 0;
  const qs = [];
  if (ver) qs.push('v=' + ver);
  if (opt) qs.push('o=' + encodeURIComponent(opt));
  const pageUrl = 'https://' + host + '/p/' + encodeURIComponent(id) + (qs.length ? '?' + qs.join('&') : '');
  const goUrl = product
    ? 'https://liff.line.me/' + LIFF_ID + '?view=product&pid=' + encodeURIComponent(product.id) + (opt ? '&opt=' + encodeURIComponent(opt) : '')
      + (req.query && req.query.reset === '1' ? '&reset=1' : '')
    : 'https://liff.line.me/' + LIFF_ID;

  const title = product ? product.name + (opt ? '・' + opt : '') + '｜四郎玩具箱' : '四郎玩具箱';
  const desc = product && product.sub
    ? product.sub + '・日本連線代購，點進來看看 ♡'
    : '日本連線代購・點進來看看 ♡';
  // 客訂商品：預覽一律用網站上的客訂圖（真實照片放在不公開的空間）
  const image = product && product.is_private
    ? 'https://' + host + '/custom-cover.jpg'
    : product
    ? SUPABASE_URL + '/storage/v1/object/public/product-images/' + product.id + (optSlot > 1 && optSlot <= 20 ? '-' + optSlot : '') + '.jpg' + (product.image_version ? '?v=' + product.image_version : '')
    : '';

  const html = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="description" content="' + esc(desc) + '">'
    + '<meta property="og:type" content="website">'
    + '<meta property="og:site_name" content="四郎玩具箱">'
    + '<meta property="og:title" content="' + esc(title) + '">'
    + '<meta property="og:description" content="' + esc(desc) + '">'
    + '<meta property="og:url" content="' + esc(pageUrl) + '">'
    + (image ? '<meta property="og:image" content="' + esc(image) + '"><meta property="og:image:alt" content="' + esc(product.name) + '">' : '')
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + esc(title) + '">'
    + '<meta name="twitter:description" content="' + esc(desc) + '">'
    + (image ? '<meta name="twitter:image" content="' + esc(image) + '">' : '')
    + '<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#171A24;color:#F3F4F8;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif;text-align:center;padding:24px;box-sizing:border-box}'
    + 'img{width:160px;height:160px;object-fit:cover;border-radius:18px;background:#fff}a{color:#2FD8C9;font-weight:700}</style>'
    + '</head><body>'
    + (image ? '<img src="' + esc(image) + '" alt="">' : '')
    + '<p style="margin:0;font-weight:700;">' + esc(product ? product.name : '四郎玩具箱') + '</p>'
    + '<p style="margin:0;font-size:13px;color:#9AA0B4;">正在前往四郎玩具箱⋯</p>'
    + '<a href="' + esc(goUrl) + '">沒有自動跳轉，請點這裡</a>'
    + '<script>setTimeout(function(){location.replace(' + JSON.stringify(goUrl) + ');},300);</script>'
    + '</body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
