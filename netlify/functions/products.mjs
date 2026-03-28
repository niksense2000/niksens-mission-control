const KEYCRM_API = 'https://openapi.keycrm.app/v1';

export default async (req, context) => {
  const API_KEY = Netlify.env.get('KEYCRM_API_KEY');

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'KEYCRM_API_KEY not set' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const catRes = await fetch(`${KEYCRM_API}/products/categories?limit=100`, { headers });
    const catData = await catRes.json();

    let products = [];
    let page = 1;
    while (page <= 15) {
      const res = await fetch(`${KEYCRM_API}/products?include=offers&limit=50&page=${page}`, { headers });
      const data = await res.json();
      products = [...products, ...(data.data || [])];
      if (!data.next_page_url) break;
      page++;
    }

    let stocks = [];
    page = 1;
    while (page <= 15) {
      const res = await fetch(`${KEYCRM_API}/offers/stocks?limit=100&page=${page}`, { headers });
      const data = await res.json();
      stocks = [...stocks, ...(data.data || [])];
      if (!data.next_page_url) break;
      page++;
    }

    const stockMap = {};
    stocks.forEach(s => {
      if (s.offer_id != null) {
        const key = String(s.offer_id);
        stockMap[key] = (stockMap[key] || 0) + (Number(s.quantity) || 0);
      }
    });

    return new Response(JSON.stringify({
      categories: catData.data || catData || [],
      products,
      stockMap
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/products' };
