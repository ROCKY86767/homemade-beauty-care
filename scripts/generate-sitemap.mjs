import { writeFile } from 'node:fs/promises';

const siteUrl = 'https://homemade-beauty-care.vercel.app';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const staticPages = [
  ['', 'daily', '1.0'],
  ['/shop', 'daily', '0.9'],
  ['/hairpack', 'weekly', '0.9'],
  ['/category/hair-care', 'weekly', '0.8'],
  ['/category/hair-oil', 'weekly', '0.8'],
  ['/category/hair-pack', 'weekly', '0.8'],
  ['/category/skin-care', 'weekly', '0.8'],
  ['/category/face-care', 'weekly', '0.8'],
  ['/category/face-pack', 'weekly', '0.8'],
  ['/offers', 'daily', '0.8'],
  ['/new-arrivals', 'daily', '0.8'],
  ['/about', 'monthly', '0.5'],
  ['/contact', 'monthly', '0.5'],
  ['/delivery-information', 'monthly', '0.5'],
  ['/returns-refunds', 'monthly', '0.5'],
  ['/privacy-policy', 'yearly', '0.3'],
];

async function getProductSlugs() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase build env vars missing; generating sitemap with static pages only.');
    return [];
  }

  const endpoint = new URL('/rest/v1/products', supabaseUrl);
  endpoint.searchParams.set('select', 'slug,updated_at');
  endpoint.searchParams.set('is_active', 'eq.true');
  endpoint.searchParams.set('slug', 'not.is.null');
  endpoint.searchParams.set('order', 'updated_at.desc');

  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch active products for sitemap: ${response.status} ${await response.text()}`);
  }

  const products = await response.json();
  return products.filter((product) => product.slug).map((product) => ({
    path: `/product/${encodeURIComponent(product.slug)}`,
    lastmod: product.updated_at ? new Date(product.updated_at).toISOString().slice(0, 10) : null,
  }));
}

const products = await getProductSlugs();
const urls = [
  ...staticPages.map(([path, changefreq, priority]) => ({
    path,
    changefreq,
    priority,
    lastmod: null,
  })),
  ...products.map((product) => ({
    ...product,
    changefreq: 'weekly',
    priority: '0.8',
  })),
];

const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(({ path, lastmod, changefreq, priority }) => `  <url>\n    <loc>${escapeXml(siteUrl + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n') +
  '\n</urlset>\n';

await writeFile('public/sitemap.xml', xml, 'utf8');
console.log(`Generated sitemap with ${urls.length} URLs (${products.length} active product pages).`);
