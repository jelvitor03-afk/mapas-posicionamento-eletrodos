// Vercel Serverless Function: api/hotmart-webhook.js
// Endpoint de Webhook Oficial Hotmart 2.0 para Sincronização em Tempo Real de Compras, Reembolsos e Cancelamentos

const crypto = require('crypto');

// Chave secreta de autenticação do Webhook Hotmart
const EXPECTED_HOTTOK = process.env.HOTMART_HOTTOK || 'electromapas_hotmart_default_token_2026';

/**
 * Persiste o estado da licença no armazenamento persistente (Upstash Redis ou Vercel KV)
 * Grava índice duplo: por Código de Transação (txKey) e por E-mail (emailKey)
 */
async function updateLicenseStore(txKey, emailKey, action, payloadData) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    console.warn('[Hotmart Webhook] KV/Redis não configurado. Gravando em memória de instância.');
    if (action === 'ACTIVATE') {
      global.__MEM_HOTMART_TX = global.__MEM_HOTMART_TX || new Map();
      global.__MEM_HOTMART_EMAIL = global.__MEM_HOTMART_EMAIL || new Map();
      global.__MEM_HOTMART_TX.set(txKey, payloadData);
      if (emailKey) global.__MEM_HOTMART_EMAIL.set(emailKey, payloadData);
    } else if (action === 'REVOKE') {
      if (global.__MEM_HOTMART_TX) global.__MEM_HOTMART_TX.set(txKey, { status: 'REVOKED' });
      if (global.__MEM_HOTMART_EMAIL && emailKey) global.__MEM_HOTMART_EMAIL.set(emailKey, { status: 'REVOKED' });
    }
    return true;
  }

  try {
    if (action === 'ACTIVATE') {
      // 1. Grava por Transação
      await fetch(`${kvUrl}/set/hotmart_license_tx_${txKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      // 2. Grava por E-mail (se fornecido)
      if (emailKey) {
        await fetch(`${kvUrl}/set/hotmart_license_email_${emailKey}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData)
        });
      }
    } else if (action === 'REVOKE') {
      const revokePayload = JSON.stringify({ status: 'REVOKED', revokedAt: Date.now() });
      await fetch(`${kvUrl}/set/hotmart_license_tx_${txKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: revokePayload
      });
      if (emailKey) {
        await fetch(`${kvUrl}/set/hotmart_license_email_${emailKey}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
          body: revokePayload
        });
      }
      // Remove vínculo de aparelho
      await fetch(`${kvUrl}/del/license_bind_${txKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` }
      });
    }
    return true;
  } catch (err) {
    console.error('[Hotmart Webhook] Falha ao persistir em KV:', err.message);
    throw err;
  }
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
      try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    // 1. AUTENTICAÇÃO OBRIGATÓRIA ANTES DE QUALQUER LEITURA DE PAYLOAD
    const tokenFromHeader = req.headers['x-hotmart-hottok'] || req.headers['X-HOTMART-HOTTOK'];
    const tokenFromBody = body.hottok;
    const tokenFromQuery = req.query ? req.query.hottok : null;
    const providedHottok = tokenFromHeader || tokenFromBody || tokenFromQuery;

    // Se o token fornecido for ausente ou diferente do esperado, REJEITA IMEDIATAMENTE com HTTP 401 Unauthorized
    if (!providedHottok || providedHottok !== EXPECTED_HOTTOK) {
      console.warn('[Hotmart Webhook] Tentativa de acesso não autorizada: hottok ausente ou inválido.');
      return res.status(401).json({
        error: 'Acesso não autorizado: token de autenticação Hotmart (X-HOTMART-HOTTOK) ausente ou inválido.'
      });
    }

    // 2. Extração dos Dados do Evento Hotmart 2.0
    const event = body.event || (body.data && body.data.event);
    const data = body.data || body;
    const purchase = data.purchase || {};
    const buyer = data.buyer || {};
    const transaction = purchase.transaction || data.transaction;
    const buyerEmail = buyer.email || data.email;
    const buyerName = buyer.name || data.name;

    if (!transaction) {
      return res.status(400).json({ error: 'Identificador de transação não informado no payload.' });
    }

    const txKey = crypto.createHash('sha256').update(transaction.toUpperCase()).digest('hex').substring(0, 16);
    const emailKey = buyerEmail ? crypto.createHash('sha256').update(buyerEmail.trim().toLowerCase()).digest('hex').substring(0, 16) : null;

    // 3. Processamento e Persistência Confiável
    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE':
        await updateLicenseStore(txKey, emailKey, 'ACTIVATE', {
          transaction: transaction,
          email: buyerEmail,
          name: buyerName,
          status: 'ACTIVE',
          tier: 'PRO',
          updatedAt: Date.now()
        });
        console.log(`[Hotmart Webhook] Compra ativada por Transação (${transaction}) e E-mail (${buyerEmail})`);
        break;

      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_EXPIRED':
        await updateLicenseStore(txKey, emailKey, 'REVOKE', null);
        console.log(`[Hotmart Webhook] Licença revogada por reembolso/cancelamento: ${transaction}`);
        break;

      default:
        console.log(`[Hotmart Webhook] Evento não transacional: ${event}`);
        break;
    }

    return res.status(200).json({ received: true, event: event, transaction: transaction, email: buyerEmail });

  } catch (err) {
    console.error('[Hotmart Webhook] ERRO DE PROCESSAMENTO:', err.message);
    return res.status(500).json({
      error: 'Falha interna ao processar webhook.',
      detail: err.message
    });
  }
};
