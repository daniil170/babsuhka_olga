/**
 * Vercel Serverless Function: api/unsubscribe.js
 * Unsubscribes an email address from newsletter campaigns
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let email = '';
  if (req.method === 'GET') {
    email = req.query?.email || '';
  } else if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    email = body?.email || req.query?.email || '';
  }

  email = (email || '').trim().toLowerCase();

  // If GET request from email link directly in browser, redirect to frontend /unsubscribe page
  if (req.method === 'GET' && req.headers['accept']?.includes('text/html')) {
    const redirectUrl = `/unsubscribe?email=${encodeURIComponent(email)}`;
    return res.redirect(302, redirectUrl);
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Укажите корректный email адрес для отписки.'
    });
  }

  return res.status(200).json({
    success: true,
    email,
    message: 'Вы успешно отписаны от рассылки Babushka Olga.'
  });
}
