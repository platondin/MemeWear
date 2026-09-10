export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const order = req.body || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const lines = items.map((item) => {
      const name = item.name || item.title || 'Product';
      const size = item.size ? `, size ${item.size}` : '';
      const qty = Number(item.quantity || item.qty || 1);
      const price = item.price != null ? ` — ${item.price}` : '';
      return `${name}${size} × ${qty}${price}`;
    }).join('\n');

    const html = `
      <h2>New MemeWear order</h2>
      <p><b>Order:</b> ${escapeHtml(order.orderNumber || order.id || 'N/A')}</p>
      <p><b>Date:</b> ${escapeHtml(order.date || new Date().toISOString())}</p>
      <h3>Customer</h3>
      <p>${escapeHtml(order.name || order.customerName || 'N/A')}<br>
      ${escapeHtml(order.email || 'N/A')}<br>
      ${escapeHtml(order.phone || '')}</p>
      <h3>Items</h3>
      <pre>${escapeHtml(lines || 'No items provided')}</pre>
      <p><b>Total:</b> ${escapeHtml(String(order.total ?? 'N/A'))}</p>
      <p><b>Payment:</b> ${escapeHtml(order.paymentMethod || 'N/A')}</p>
      <p><b>Shipping address:</b><br>${escapeHtml(order.address || order.shippingAddress || 'N/A')}</p>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM || 'MemeWear <onboarding@resend.dev>',
        to: ['dinero@dinershtein.com'],
        subject: `MemeWear order ${order.orderNumber || order.id || ''}`.trim(),
        html
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Email provider error', details: text });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send order email' });
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
