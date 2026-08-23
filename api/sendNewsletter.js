/**
 * Vercel Serverless Function: api/sendNewsletter.js
 * Sends email campaigns via Resend API
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, errors: ['Method not allowed. Use POST.'] });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ success: false, errors: ['Invalid JSON in request body'] });
      }
    }

    const { campaignId, subject, content, recipientEmails } = body || {};

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['Поле "Тема письма" (subject) обязательно для заполнения.']
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['Содержимое письма (content) не может быть пустым.']
      });
    }

    if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res.status(400).json({
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['Список получателей (recipientEmails) пуст.']
      });
    }

    // Clean & validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = [...new Set(
      recipientEmails
        .map(e => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
        .filter(e => emailRegex.test(e))
    )];

    if (validEmails.length === 0) {
      return res.status(400).json({
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['Не найдено ни одного корректного email адреса получателя.']
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['RESEND_API_KEY не установлен в переменных окружения.']
      });
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Babushka Olga <info@babushka-olga.com>';

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    // Helper to send individual email via Resend if batch fails or for single recipients
    async function sendSingleEmail(toEmail) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: subject.trim(),
          html: content
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Ошибка Resend (${response.status})`);
      }
      return data;
    }

    // Send using Resend Batch API (max 100 per request)
    const BATCH_SIZE = 100;
    for (let i = 0; i < validEmails.length; i += BATCH_SIZE) {
      const chunk = validEmails.slice(i, i + BATCH_SIZE);
      const batchPayload = chunk.map(email => ({
        from: fromEmail,
        to: [email],
        subject: subject.trim(),
        html: content
      }));

      try {
        const batchResponse = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(batchPayload)
        });

        const batchData = await batchResponse.json();

        if (batchResponse.ok) {
          if (Array.isArray(batchData.data)) {
            sentCount += batchData.data.length;
          } else {
            sentCount += chunk.length;
          }
        } else {
          // If batch fails, try fallback to single sending for this chunk
          console.warn('Resend batch failed, attempting individual sends:', batchData);
          for (const email of chunk) {
            try {
              await sendSingleEmail(email);
              sentCount++;
            } catch (singleErr) {
              failedCount++;
              errors.push(`${email}: ${singleErr.message}`);
            }
          }
        }
      } catch (batchErr) {
        console.warn('Network error in batch, trying fallback:', batchErr);
        for (const email of chunk) {
          try {
            await sendSingleEmail(email);
            sentCount++;
          } catch (singleErr) {
            failedCount++;
            errors.push(`${email}: ${singleErr.message}`);
          }
        }
      }
    }

    const overallSuccess = sentCount > 0;

    return res.status(200).json({
      success: overallSuccess,
      campaignId: campaignId || null,
      sentCount,
      failedCount,
      errors: errors.slice(0, 10) // limit error details
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error.message || 'Внутренняя ошибка сервера']
    });
  }
}
