// Vercel Serverless Function: api/hotmart-webhook.js
// Endpoint de Webhook Oficial Hotmart 2.0 para Sincronização em Tempo Real de Compras, Reembolsos e Cancelamentos

const crypto = require('crypto');

/**
 * Persiste o estado da licença no armazenamento persistente (Upstash Redis ou Vercel KV)
 * Lança erro explícito se o banco não estiver configurado ou se a operação HTTP falhar.
 */
async function updateLicenseStore(txKey, action, payloadData) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    throw new Error('Banco de persistência (UPSTASH_REDIS_REST_URL / KV_REST_API_URL) não configurado.');
  }

  let res;
  if (action === 'ACTIVATE') {
    res = await fetch(`${kvUrl}/set/hotmart_license_${txKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadData)
    });
  } else if (action === 'REVOKE') {
    res = await fetch(`${kvUrl}/set/hotmart_license_${txKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVOKED', revokedAt: Date.now() })
    });
    // Remove também o vínculo do aparelho
    await fetch(`${kvUrl}/del/license_bind_${txKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}` }
    });
  }

  if (!res || !res.ok) {
    const errorText = res ? await res.text() : 'Sem resposta';
    throw new Error(`Falha na persistência KV/Redis (HTTP ${res ? res.status : 0}): ${errorText}`);
  }

  return true;
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
    // A Hotmart documenta o token de segurança no cabeçalho X-HOTMART-HOTTOK ou no campo hottok.
    const EXPECTED_HOTTOK = process.env.HOTMART_HOTTOK;

    // Se o servidor de produção não possui a chave configurada, rejeita com 503 Service Unavailable
    if (!EXPECTED_HOTTOK) {
      console.error('[Hotmart Webhook] ERRO DE SEGURANÇA: HOTMART_HOTTOK não está configurado nas variáveis de ambiente da Vercel.');
      return res.status(503).json({
        error: 'Serviço de webhook inativo: variável HOTMART_HOTTOK não configurada no servidor.'
      });
    }

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

    // 3. Processamento e Persistência Confiável
    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE':
        await updateLicenseStore(txKey, 'ACTIVATE', {
          transaction: transaction,
          email: buyerEmail,
          name: buyerName,
          status: 'ACTIVE',
          tier: 'PRO',
          updatedAt: Date.now()
        });
        console.log(`[Hotmart Webhook] Compra gravada com sucesso: ${transaction} (${buyerEmail})`);
        break;

      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'PURCHASE_CANCELED':
      case 'PURCHASE_EXPIRED':
        await updateLicenseStore(txKey, 'REVOKE', null);
        console.log(`[Hotmart Webhook] Licença revogada com sucesso: ${transaction}`);
        break;

      default:
        console.log(`[Hotmart Webhook] Evento não transacional ou informativo: ${event}`);
        break;
    }

    // 4. Apenas retorna 200 após confirmação real e bem-sucedida de gravação
    return res.status(200).json({ received: true, event: event, transaction: transaction });

  } catch (err) {
    console.error('[Hotmart Webhook] ERRO DE PROCESSAMENTO / PERSISTÊNCIA:', err.message);
    // Retorna HTTP 500 para sinalizar falha real à Hotmart e acionar a política de retentativas
    return res.status(500).json({
      error: 'Falha interna ao processar ou persistir webhook.',
      detail: err.message
    });
  }
};
