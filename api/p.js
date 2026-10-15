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
        SUPABASE_URL + '/rest/v1/products?live_zone_id=eq.' + encodeURIComponent(zoneId) + '&stock_status=eq.live_limited&select=id,image_version',
        { headers: { apikey: SUPABASE_KEY } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) {
          count = rows.length;
          const last = rows[rows.length - 1];
          image = SUPABASE_URL + '/storage/v1/object/public/product-images/' + last.id + '.jpg' + (last.image_version ? '?v=' + last.image_version : '');
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
  const pageUrl = 'https://' + host + '/z/' + encodeURIComponent(zoneId);
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

module.exports = async (req, res) => {
  if (req.query && req.query.zone) return zonePage(req, res);
  const id = String((req.query && req.query.id) || '').trim();
  let product = null;
  if (id && /^[A-Za-z0-9_\-]+$/.test(id)) {
    try {
      const r = await fetch(
        SUPABASE_URL + '/rest/v1/products?id=eq.' + encodeURIComponent(id) + '&select=id,name,sub,image_version',
        { headers: { apikey: SUPABASE_KEY } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows) && rows.length) product = rows[0];
      }
    } catch (e) { /* 讀不到就用一般的預覽 */ }
  }

  const host = (req.headers && req.headers.host) || 'shiros-toybox.vercel.app';
  // 分享連結帶的 ?v= 版本號也放進 og:url，LINE 等 App 才會把它當成新網址重新抓預覽
  const ver = String((req.query && req.query.v) || '').replace(/[^0-9a-z]/gi, '').slice(0, 16);
  const pageUrl = 'https://' + host + '/p/' + encodeURIComponent(id) + (ver ? '?v=' + ver : '');
  const goUrl = product
    ? 'https://liff.line.me/' + LIFF_ID + '?view=product&pid=' + encodeURIComponent(product.id)
    : 'https://liff.line.me/' + LIFF_ID;

  const title = product ? product.name + '｜四郎玩具箱' : '四郎玩具箱';
  const desc = product && product.sub
    ? product.sub + '・日本連線代購，點進來看看 ♡'
    : '日本連線代購・點進來看看 ♡';
  const image = product
    ? SUPABASE_URL + '/storage/v1/object/public/product-images/' + product.id + '.jpg' + (product.image_version ? '?v=' + product.image_version : '')
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
