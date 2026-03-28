const KEYCRM_API = 'https://openapi.keycrm.app/v1';

export default async (req, context) => {
  const API_KEY = Netlify.env.get('KEYCRM_API_KEY');

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'KEYCRM_API_KEY not set' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
  const now = new Date();
  const days30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromDate = days30ago.toISOString().split('T')[0];

  try {
    let allOrders = [];
    let page = 1;
    while (page <= 25) {
      const url = `${KEYCRM_API}/order?include=products&limit=50&page=${page}&filter[created_at][from]=${fromDate}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      allOrders = [...allOrders, ...(data.data || [])];
      if (!data.next_page_url) break;
      page++;
    }

    const sales30 = {}, sales7 = {};
    allOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const is7days = orderDate >= days7ago;
      (order.products || []).forEach(p => {
        const key = p.offer_id != null ? String(p.offer_id) : `prod_${p.product_id}`;
        const qty = Number(p.quantity) || 0;
        sales30[key] = (sales30[key] || 0) + qty;
        if (is7days) sales7[key] = (sales7[key] || 0) + qty;
      });
    });

    return new Response(JSON.stringify({ sales30, sales7, ordersCount: allOrders.length, dateFrom: fromDate }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/analytics' };
