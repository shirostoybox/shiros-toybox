// 圖片中繼：有些日本官網（例如 7-11 的 img-afd…sej.co.jp）會擋掉 Supabase 伺服器來的下載，
// 後台匯入照片抓不到時，改由這支在東京機房（vercel.json regions: hnd1）的程式代抓，再交給後台壓縮上傳。
// 只接受日本網站的圖片，避免被拿去當公開代理。
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

module.exports = async (req, res) => {
  const u = String((req.query && req.query.u) || '').trim();
  let url;
  try { url = new URL(u); } catch (e) { res.status(400).send('bad url'); return; }
  if (!/^https?:$/.test(url.protocol) || !/\.jp$/i.test(url.hostname)) { res.status(400).send('only .jp images'); return; }
  const host = url.hostname;
  const root = 'https://www.' + (host.endsWith('.co.jp') ? host.split('.').slice(-3).join('.') : host.split('.').slice(-2).join('.')) + '/';
  const accept = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';
  const sets = [
    { 'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'ja,zh-TW;q=0.9,en;q=0.8' },
    { 'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'ja,zh-TW;q=0.9,en;q=0.8', 'Referer': root },
    { 'User-Agent': UA, 'Accept': accept, 'Referer': url.origin + '/' },
  ];
  let last = 0;
  for (const h of sets) {
    try {
      const r = await fetch(url.toString(), { headers: h, redirect: 'follow' });
      if (!r.ok) { last = r.status; continue; }
      const ct = String(r.headers.get('content-type') || '').split(';')[0].trim();
      if (!ct.startsWith('image/')) { last = 415; continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) { res.status(413).send('too large'); return; }
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, s-maxage=86400');
      res.status(200).send(buf);
      return;
    } catch (e) { last = last || 502; }
  }
  res.status(last || 502).send('fetch failed ' + last);
};
