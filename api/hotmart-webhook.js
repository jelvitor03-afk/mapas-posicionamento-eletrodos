// Vercel Serverless Function: api/hotmart-webhook.js
// Official Hotmart 2.0 Webhook Endpoint for Real-Time Synchronization of Purchases, Refunds, and Cancellations

const crypto = require('crypto');

function getExpectedHottok() {
  return process.env.HOTMART_HOTTOK || 'electromapas_hotmart_default_token_2026';
}

function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getKvConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return url && token ? { url, token } : null;
}

async function kvCommand(cmdArray) {
  const kv = getKvConfig();
  if (!kv) return null;

  const res = await fetch(kv.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kv.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cmdArray)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Upstash REST HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (data && data.error) {
    throw new Error(`Upstash REST error: ${data.error}`);
  }
  return data ? data.result : null;
}

/**
 * Persists license state into Upstash Redis / Vercel KV (or local memory fallback if unconfigured).
 * Maintains dual lookup keys: transaction key (`txKey`) and buyer email key (`emailKey`).
 */
async function updateLicenseStore(txKey, emailKey, action, payloadData) {
  const kv = getKvConfig();
  const memTx = (global.__MEM_HOTMART_TX = global.__MEM_HOTMART_TX || new Map());
  const memEmail = (global.__MEM_HOTMART_EMAIL = global.__MEM_HOTMART_EMAIL || new Map());
  const memBindings = (global.__ELECTROMAPAS_DEVICE_BINDINGS = global.__ELECTROMAPAS_DEVICE_BINDINGS || new Map());

  if (!kv) {
    console.warn('[Hotmart Webhook] KV/Redis not configured. Storing in instance memory fallback.');
    if (action === 'ACTIVATE') {
      memTx.set(txKey, payloadData);
      if (emailKey) memEmail.set(emailKey, payloadData);
    } else if (action === 'REVOKE') {
      memTx.set(txKey, payloadData);
      if (emailKey) memEmail.set(emailKey, payloadData);
      memBindings.delete(txKey);
      if (emailKey) memBindings.delete(`email_${emailKey}`);
    }
    return 'memory_fallback';
  }

  const serialized = JSON.stringify(payloadData);

  if (action === 'ACTIVATE') {
    await kvCommand(['SET', `hotmart_license_tx_${txKey}`, serialized]);
    if (emailKey) {
      await kvCommand(['SET', `hotmart_license_email_${emailKey}`, serialized]);
    }
  } else if (action === 'REVOKE') {
    await kvCommand(['SET', `hotmart_license_tx_${txKey}`, serialized]);
    if (emailKey) {
      await kvCommand(['SET', `hotmart_license_email_${emailKey}`, serialized]);
    }
    await kvCommand(['DEL', `license_bind_${txKey}`]);
    if (emailKey) {
      await kvCommand(['DEL', `license_bind_email_${emailKey}`]);
    }
  }

  return 'persistent_kv';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-HOTMART-HOTTOK, x-hotmart-hottok');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    // 1. Mandatory Hottok authentication before reading business payload
    const tokenFromHeader = req.headers['x-hotmart-hottok'] || req.headers['X-HOTMART-HOTTOK'];
    const tokenFromBody = body.hottok;
    const tokenFromQuery = req.query ? req.query.hottok : null;
    const providedHottok = String(tokenFromHeader || tokenFromBody || tokenFromQuery || '').trim();
    const expectedHottok = getExpectedHottok();

    if (!providedHottok || !constantTimeEquals(providedHottok, expectedHottok)) {
      console.warn('[Hotmart Webhook] Unauthorized attempt: missing or invalid hottok.');
      return res.status(401).json({
        error: 'Acesso não autorizado: token de autenticação Hotmart (X-HOTMART-HOTTOK) ausente ou inválido.'
      });
    }

    // 2. Parse Hotmart 2.0 event payload
    const event = String(body.event || (body.data && body.data.event) || '').trim().toUpperCase();
    const data = body.data || body;
    const purchase = data.purchase || {};
    const buyer = data.buyer || {};
    const product = data.product || {};
    const offer = purchase.offer || {};

    const transaction = String(purchase.transaction || data.transaction || '').trim();
    const buyerEmail = buyer.email || data.email ? String(buyer.email || data.email).trim().toLowerCase() : null;
    const buyerName = buyer.name || data.name ? String(buyer.name || data.name).trim() : null;
    const productId = product.id ? String(product.id) : null;
    const offerCode = offer.code ? String(offer.code) : null;

    if (!transaction) {
      return res.status(400).json({ error: 'Identificador de transação não informado no payload.' });
    }

    const txKey = crypto.createHash('sha256').update(transaction.toUpperCase()).digest('hex').slice(0, 16);
    const emailKey = buyerEmail
      ? crypto.createHash('sha256').update(buyerEmail.toLowerCase()).digest('hex').slice(0, 16)
      : null;

    let storageMode = getKvConfig() ? 'persistent_kv' : 'memory_fallback';

    // 3. Process lifecycle transitions
    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE': {
        storageMode = await updateLicenseStore(txKey, emailKey, 'ACTIVATE', {
          transaction,
          email: buyerEmail,
          name: buyerName,
          productId,
          offerCode,
          event,
          status: 'ACTIVE',
          tier: 'PRO',
          updatedAt: Date.now()
        });
        console.log(`[Hotmart Webhook] Activated license: ${transaction}`);
        break;
      }

      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_EXPIRED':
      case 'PURCHASE_PROTEST': {
        storageMode = await updateLicenseStore(txKey, emailKey, 'REVOKE', {
          transaction,
          email: buyerEmail,
          productId,
          offerCode,
          event,
          status: 'REVOKED',
          revokedAt: Date.now()
        });
        console.log(`[Hotmart Webhook] Revoked license (${event}): ${transaction}`);
        break;
      }

      default:
        console.log(`[Hotmart Webhook] Non-transactional event ignored: ${event || 'UNKNOWN'}`);
        break;
    }

    return res.status(200).json({
      received: true,
      event,
      transaction,
      storageMode
    });
  } catch (err) {
    console.error('[Hotmart Webhook] Processing error:', err.message);
    return res.status(500).json({
      error: 'Falha interna ao processar webhook.',
      detail: err.message
    });
  }
};
