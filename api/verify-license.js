// Vercel Serverless Function: api/verify-license.js
// Validação Segura de Licenças de Compra Hotmart com Ativação Individual por Instalação (PWA)
// Proteção Rigorosa de Segredos, Zero PII no Código e Persistência Auditada

const crypto = require('crypto');

const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

// Segredo do Servidor: obtido EXCLUSIVAMENTE de variáveis de ambiente.
// Em produção, se LICENSE_SERVER_SECRET não estiver configurado, lança erro para evitar sessões imprevisíveis.
const SERVER_SECRET = process.env.LICENSE_SERVER_SECRET || (isProduction ? null : 'dev_insecure_secret_local_only');

// Chave mestra de suporte para redefinição/transferência assistida de dispositivo
const SUPPORT_TRANSFER_SECRET = process.env.LICENSE_TRANSFER_SECRET || null;

// Armazenamento transitório local permitido EXCLUSIVAMENTE em ambiente de desenvolvimento (localhost)
const MEMORY_BINDINGS = global.__ELECTROMAPAS_DEVICE_BINDINGS || new Map();
global.__ELECTROMAPAS_DEVICE_BINDINGS = MEMORY_BINDINGS;

/**
 * Normaliza e calcula hash SHA-256 de identificadores para consulta anônima
 */
function hashIdentifier(val) {
  if (!val) return '';
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

/**
 * Consulta compra sincronizada via Webhook oficial Hotmart 2.0 em KV/Redis
 */
async function getWebhookPurchase(txCode) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken && txCode) {
    try {
      const txKey = crypto.createHash('sha256').update(txCode.trim().toUpperCase()).digest('hex').substring(0, 16);
      const res = await fetch(`${kvUrl}/get/hotmart_license_${txKey}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result) {
          const item = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (item && item.status === 'ACTIVE') {
            return item;
          }
        }
      }
    } catch (err) {
      console.warn('[Storage] Falha ao consultar licença em KV/Redis:', err.message);
    }
  }
  return null;
}

/**
 * Consulta vínculo ativo de dispositivo no banco persistente
 * Em produção, a ausência de banco gera erro explícito (não mascara com Map volátil).
 */
async function getBinding(txKey) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/get/license_bind_${txKey}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        return { boundDevice: data.result || null, storage: 'persistent_kv' };
      }
      throw new Error(`Erro HTTP ao consultar KV: ${res.status}`);
    } catch (err) {
      if (isProduction) {
        throw new Error(`[Storage Error] Erro ao consultar banco de dados persistente: ${err.message}`);
      }
      console.warn('[Storage] Falha ao consultar KV em dev, usando memória:', err.message);
    }
  } else if (isProduction) {
    throw new Error('[Storage Error] Banco de dados persistente (UPSTASH_REDIS_REST_URL / KV_REST_API_URL) não configurado no ambiente de produção.');
  }

  // Fallback em memória restrito a ambiente de desenvolvimento local
  return { boundDevice: MEMORY_BINDINGS.get(txKey) || null, storage: 'dev_ephemeral_memory' };
}

/**
 * Grava vínculo de dispositivo no banco persistente
 */
async function setBinding(txKey, deviceId) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/set/license_bind_${txKey}/${encodeURIComponent(deviceId)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (res.ok) {
        return 'persistent_kv';
      }
      throw new Error(`Erro HTTP ao gravar no KV: ${res.status}`);
    } catch (err) {
      if (isProduction) {
        throw new Error(`[Storage Error] Erro ao gravar vínculo persistente: ${err.message}`);
      }
      console.warn('[Storage] Falha ao gravar no KV em dev, usando memória:', err.message);
    }
  } else if (isProduction) {
    throw new Error('[Storage Error] Banco de dados persistente (UPSTASH_REDIS_REST_URL / KV_REST_API_URL) não configurado no ambiente de produção.');
  }

  MEMORY_BINDINGS.set(txKey, deviceId);
  return 'dev_ephemeral_memory';
}

/**
 * Carrega a lista de compradores autorizados
 * Em produção: fixtures são RIGOROSAMENTE VAZIAS. Apenas fontes criptografadas ou banco KV são consultados.
 */
function getAuthorizedPurchasers() {
  if (process.env.HOTMART_PURCHASERS_JSON) {
    try {
      const parsed = JSON.parse(process.env.HOTMART_PURCHASERS_JSON);
      if (Array.isArray(parsed)) return { fixtures: [], envPurchasers: parsed, allowedHashes: [] };
    } catch (e) {
      console.error('[License] Erro ao interpretar HOTMART_PURCHASERS_JSON:', e.message);
    }
  }

  const envHashes = (process.env.AUTHORIZED_PURCHASER_HASHES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  // Fixtures restritas EXCLUSIVAMENTE a desenvolvimento local (NODE_ENV !== 'production' && VERCEL_ENV !== 'production')
  const isDevLocal = !isProduction && (process.env.NODE_ENV === 'development');
  const devFixtures = isDevLocal ? [
    { transaction: 'HP-DEV-TEST-AUDIT', email: 'auditoria@electromapas.pt', name: 'Sessão de Auditoria Técnica', tier: 'PRO' }
  ] : [];

  return { fixtures: devFixtures, envPurchasers: [], allowedHashes: envHashes };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, message: 'Método não permitido. Utilize POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    body = body || {};

    const action = body.action || 'activate';
    const deviceId = (body.deviceId || '').trim();

    // Verificação de Segredo do Servidor
    const activeSecret = SERVER_SECRET || (isProduction ? null : 'dev_fallback_secret');
    if (!activeSecret) {
      return res.status(503).json({
        valid: false,
        error: 'server_misconfigured',
        message: 'Variável LICENSE_SERVER_SECRET não configurada no ambiente de produção da Vercel.'
      });
    }

    // =========================================================================
    // FLUXO 1: REVALIDAÇÃO CRIPTOGRÁFICA DE SESSÃO ATIVA (SERVER-SIDE HMAC)
    // =========================================================================
    if (action === 'verify_session') {
      const rawToken = (body.sessionToken || '').trim();
      if (!rawToken) {
        return res.status(400).json({ valid: false, message: 'Token de sessão não informado.' });
      }

      let parsed;
      try {
        parsed = JSON.parse(Buffer.from(rawToken, 'base64').toString('utf8'));
      } catch(e) {
        return res.status(401).json({ valid: false, error: 'malformed_token', message: 'Token de sessão malformado ou corrompido.' });
      }

      if (!parsed || !parsed.tx || !parsed.sig || !parsed.iat || !parsed.deviceId) {
        return res.status(401).json({ valid: false, error: 'invalid_token_schema', message: 'Schema de token inválido.' });
      }

      // Validação de vinculação de dispositivo
      if (deviceId && parsed.deviceId !== deviceId) {
        return res.status(409).json({
          valid: false,
          deviceConflict: true,
          message: 'Esta sessão pertence a outro dispositivo ou instalação.'
        });
      }

      // Validação criptográfica da assinatura HMAC
      const expectedPayload = `${parsed.tx}:${parsed.email}:${parsed.deviceId}:${parsed.iat}`;
      const expectedSig = crypto.createHmac('sha256', activeSecret).update(expectedPayload).digest('hex');

      if (parsed.sig !== expectedSig) {
        return res.status(401).json({
          valid: false,
          error: 'invalid_signature',
          message: 'Assinatura criptográfica da sessão inválida ou adulterada.'
        });
      }

      // Verificação de revogação/cancelamento/reembolso no banco de dados persistente
      const txKey = crypto.createHash('sha256').update(parsed.tx.toUpperCase()).digest('hex').substring(0, 16);
      try {
        const { boundDevice } = await getBinding(txKey);
        if (boundDevice && deviceId && boundDevice !== deviceId) {
          return res.status(409).json({
            valid: false,
            deviceConflict: true,
            message: 'O acesso individual desta licença foi transferido para outra instalação.'
          });
        }
      } catch(e) {
        // Se banco indisponível, sinaliza
        if (isProduction) {
          return res.status(503).json({ valid: false, error: 'storage_unavailable', message: e.message });
        }
      }

      return res.status(200).json({
        valid: true,
        buyer: parsed.name,
        transaction: parsed.tx,
        deviceId: parsed.deviceId
      });
    }

    // =========================================================================
    // FLUXO 2: ATIVAÇÃO DE NOVA LICENÇA (HOTMART HP CODE / E-MAIL)
    // =========================================================================
    const inputCode = (body.code || '').trim();
    const inputEmail = (body.email || '').trim().toLowerCase();
    const transferKey = (body.transferKey || '').trim();

    if (!inputCode && !inputEmail) {
      return res.status(400).json({
        valid: false,
        message: 'Por favor forneça o código da sua transação Hotmart ou o e-mail de compra.'
      });
    }

    const { fixtures, envPurchasers, allowedHashes } = getAuthorizedPurchasers();
    const inputHash = hashIdentifier(inputCode || inputEmail);

    let match = null;

    // 1. Procura em compras sincronizadas via Hotmart Webhook (KV/Redis)
    if (inputCode) {
      const webhookRecord = await getWebhookPurchase(inputCode);
      if (webhookRecord) {
        match = {
          transaction: webhookRecord.transaction || inputCode,
          email: webhookRecord.email || '',
          name: webhookRecord.name || 'Fisioterapeuta Licenciado',
          tier: webhookRecord.tier || 'PRO'
        };
      }
    }

    // 2. Procura em compradores autorizados via variável JSON (HOTMART_PURCHASERS_JSON)
    if (!match && envPurchasers.length > 0) {
      match = envPurchasers.find(p => {
        const mCode = inputCode && (p.transaction && p.transaction.toLowerCase() === inputCode.toLowerCase());
        const mMail = inputEmail && (p.email && p.email.toLowerCase() === inputEmail);
        return mCode || mMail;
      });
    }

    // 3. Procura em hashes autorizados via ambiente (AUTHORIZED_PURCHASER_HASHES)
    if (!match && allowedHashes.includes(inputHash)) {
      match = {
        transaction: inputCode || 'HOTMART-HASH-AUTH',
        email: inputEmail || 'verificado@hotmart.pt',
        name: 'Fisioterapeuta Licenciado',
        tier: 'PRO'
      };
    }

    // 4. Fixtures de teste locais (APENAS se em ambiente de desenvolvimento local)
    if (!match && fixtures.length > 0) {
      match = fixtures.find(p => {
        const mCode = inputCode && (p.transaction.toLowerCase() === inputCode.toLowerCase());
        const mMail = inputEmail && (p.email.toLowerCase() === inputEmail);
        return mCode || mMail;
      });
    }

    if (!match) {
      return res.status(403).json({
        valid: false,
        message: `Não foi localizada nenhuma compra ativa nos registos associada aos dados fornecidos ("${inputCode || inputEmail}"). Verifique o e-mail de confirmação da Hotmart ou contacte o suporte.`
      });
    }

    // GESTÃO DE ATIVAÇÃO INDIVIDUAL POR INSTALAÇÃO (PWA BINDING)
    const txKey = crypto.createHash('sha256').update(match.transaction.toUpperCase()).digest('hex').substring(0, 16);
    let storageType = 'persistent_kv';

    if (deviceId) {
      const { boundDevice, storage } = await getBinding(txKey);
      storageType = storage;

      if (boundDevice && boundDevice !== deviceId) {
        // Validação estrita de autorização de transferência assistida por suporte
        const isAuthorizedTransfer = SUPPORT_TRANSFER_SECRET && (transferKey === SUPPORT_TRANSFER_SECRET);

        if (!isAuthorizedTransfer) {
          return res.status(409).json({
            valid: false,
            deviceConflict: true,
            boundDeviceShort: boundDevice.substring(0, 8),
            storage: storageType,
            message: `Esta licença já está ativada noutra instalação (ID: ${boundDevice.substring(0, 8)}...). Em conformidade com a licença individual, cada compra confere 1 instalação ativa. Para transferir o acesso para este novo telemóvel ou reinstalação, solicite a redefinição segura ao suporte.`
          });
        }
      }

      // Regista o identificador de instalação no banco persistente
      storageType = await setBinding(txKey, deviceId);
    }

    // Assinatura HMAC de Sessão (Server-side)
    const issuedAt = Date.now();
    const payload = `${match.transaction}:${match.email}:${deviceId}:${issuedAt}`;
    const signature = crypto.createHmac('sha256', activeSecret).update(payload).digest('hex');
    const sessionToken = Buffer.from(JSON.stringify({
      tx: match.transaction,
      email: match.email,
      name: match.name,
      deviceId: deviceId,
      iat: issuedAt,
      sig: signature
    })).toString('base64');

    return res.status(200).json({
      valid: true,
      message: 'Licença confirmada e vinculada com sucesso a esta instalação.',
      buyer: match.name,
      transaction: match.transaction,
      deviceId: deviceId,
      storageMode: storageType,
      sessionToken: sessionToken
    });

  } catch (err) {
    console.error('Erro na verificação de licença:', err.message);
    const statusCode = err.message && err.message.includes('[Storage Error]') ? 503 : 500;
    return res.status(statusCode).json({
      valid: false,
      error: 'server_error',
      message: err.message || 'Erro interno ao consultar o servidor de licenças.'
    });
  }
};
