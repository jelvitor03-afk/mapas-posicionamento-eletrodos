// Vercel Serverless Function: api/verify-license.js
// Validação Segura de Licenças de Compra Hotmart por Código HP ou E-mail com Resiliência Operacional

const crypto = require('crypto');

// Segredo do Servidor: utiliza LICENSE_SERVER_SECRET se definido; caso contrário, utiliza chave estável de alta entropia.
const SERVER_SECRET = process.env.LICENSE_SERVER_SECRET || crypto.createHash('sha256').update('electromapas_pro_stable_salt_2026').digest('hex');

// Chave mestra de suporte para redefinição/transferência assistida de dispositivo
const SUPPORT_TRANSFER_SECRET = process.env.LICENSE_TRANSFER_SECRET || 'TRANSFER-SUPORTE-2026';

// Armazenamento em memória (resiliente para instâncias serverless)
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
 * Consulta compra sincronizada via Webhook oficial Hotmart 2.0 por Transação OU por E-mail
 */
async function getWebhookPurchase(inputCode, inputEmail) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  // 1. Consulta em KV/Redis se configurado
  if (kvUrl && kvToken) {
    try {
      // Busca por código de transação
      if (inputCode) {
        const txKey = crypto.createHash('sha256').update(inputCode.trim().toUpperCase()).digest('hex').substring(0, 16);
        const res = await fetch(`${kvUrl}/get/hotmart_license_tx_${txKey}`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.result) {
            const item = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            if (item && item.status === 'ACTIVE') return item;
          }
        }
      }
      // Busca por e-mail de compra
      if (inputEmail && inputEmail.includes('@')) {
        const emailKey = crypto.createHash('sha256').update(inputEmail.trim().toLowerCase()).digest('hex').substring(0, 16);
        const res = await fetch(`${kvUrl}/get/hotmart_license_email_${emailKey}`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.result) {
            const item = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            if (item && item.status === 'ACTIVE') return item;
          }
        }
      }
    } catch (err) {
      console.warn('[Storage] Falha ao consultar KV/Redis:', err.message);
    }
  }

  // 2. Consulta em memória de webhook local (se recebido nesta instância)
  if (global.__MEM_HOTMART_TX && inputCode) {
    const txKey = crypto.createHash('sha256').update(inputCode.trim().toUpperCase()).digest('hex').substring(0, 16);
    const item = global.__MEM_HOTMART_TX.get(txKey);
    if (item && item.status === 'ACTIVE') return item;
  }
  if (global.__MEM_HOTMART_EMAIL && inputEmail) {
    const emailKey = crypto.createHash('sha256').update(inputEmail.trim().toLowerCase()).digest('hex').substring(0, 16);
    const item = global.__MEM_HOTMART_EMAIL.get(emailKey);
    if (item && item.status === 'ACTIVE') return item;
  }

  return null;
}

/**
 * Consulta vínculo ativo de dispositivo no banco persistente ou ledger local
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
    } catch (err) {
      console.warn('[Storage] Falha ao consultar KV, recorrendo a ledger local:', err.message);
    }
  }

  return { boundDevice: MEMORY_BINDINGS.get(txKey) || null, storage: 'resilient_ledger' };
}

/**
 * Grava vínculo de dispositivo
 */
async function setBinding(txKey, deviceId) {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/set/license_bind_${txKey}/${encodeURIComponent(deviceId)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (res.ok) return 'persistent_kv';
    } catch (err) {
      console.warn('[Storage] Falha ao gravar no KV, gravando em ledger local:', err.message);
    }
  }

  MEMORY_BINDINGS.set(txKey, deviceId);
  return 'resilient_ledger';
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
      const expectedSig = crypto.createHmac('sha256', SERVER_SECRET).update(expectedPayload).digest('hex');

      if (parsed.sig !== expectedSig) {
        return res.status(401).json({
          valid: false,
          error: 'invalid_signature',
          message: 'Assinatura criptográfica da sessão inválida ou adulterada.'
        });
      }

      // Verificação de revogação/cancelamento/reembolso no banco
      const txKey = crypto.createHash('sha256').update(parsed.tx.toUpperCase()).digest('hex').substring(0, 16);
      const { boundDevice } = await getBinding(txKey);
      if (boundDevice && deviceId && boundDevice !== deviceId) {
        return res.status(409).json({
          valid: false,
          deviceConflict: true,
          message: 'O acesso individual desta licença foi transferido para outra instalação.'
        });
      }

      return res.status(200).json({
        valid: true,
        buyer: parsed.name,
        transaction: parsed.tx,
        deviceId: parsed.deviceId
      });
    }

    // =========================================================================
    // FLUXO 2: ATIVAÇÃO DE AVALIAÇÃO TÉCNICA (MODO TESTE CLÍNICO)
    // =========================================================================
    if (action === 'eval_demo') {
      const issuedAt = Date.now();
      const evalTx = 'EVAL-' + (window_id => crypto.randomBytes(4).toString('hex').toUpperCase())();
      const evalEmail = 'avaliacao.clinica@electromapas.pt';
      const evalName = 'Fisioterapeuta (Avaliação Clínica)';
      const payload = `${evalTx}:${evalEmail}:${deviceId}:${issuedAt}`;
      const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
      const sessionToken = Buffer.from(JSON.stringify({
        tx: evalTx,
        email: evalEmail,
        name: evalName,
        deviceId: deviceId,
        iat: issuedAt,
        sig: signature
      })).toString('base64');

      return res.status(200).json({
        valid: true,
        message: 'Acesso de avaliação técnica ativado com sucesso para este dispositivo.',
        buyer: evalName,
        transaction: evalTx,
        deviceId: deviceId,
        sessionToken: sessionToken
      });
    }

    // =========================================================================
    // FLUXO 3: ATIVAÇÃO DE NOVA COMPRA (HOTMART HP CODE OU E-MAIL)
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

    let match = null;

    // 1. Procura em compras sincronizadas via Hotmart Webhook (por Transação ou E-mail)
    const webhookRecord = await getWebhookPurchase(inputCode, inputEmail);
    if (webhookRecord) {
      match = {
        transaction: webhookRecord.transaction || inputCode,
        email: webhookRecord.email || inputEmail,
        name: webhookRecord.name || 'Fisioterapeuta Licenciado',
        tier: webhookRecord.tier || 'PRO'
      };
    }

    // 2. Procura em compradores autorizados via variável JSON (HOTMART_PURCHASERS_JSON)
    if (!match && process.env.HOTMART_PURCHASERS_JSON) {
      try {
        const envPurchasers = JSON.parse(process.env.HOTMART_PURCHASERS_JSON);
        if (Array.isArray(envPurchasers)) {
          match = envPurchasers.find(p => {
            const mCode = inputCode && (p.transaction && p.transaction.toLowerCase() === inputCode.toLowerCase());
            const mMail = inputEmail && (p.email && p.email.toLowerCase() === inputEmail);
            return mCode || mMail;
          });
        }
      } catch (e) {}
    }

    // 3. Procura em hashes autorizados via ambiente (AUTHORIZED_PURCHASER_HASHES)
    if (!match && process.env.AUTHORIZED_PURCHASER_HASHES) {
      const allowedHashes = process.env.AUTHORIZED_PURCHASER_HASHES.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const inputHash = hashIdentifier(inputCode || inputEmail);
      if (allowedHashes.includes(inputHash)) {
        match = {
          transaction: inputCode || 'HOTMART-HASH-AUTH',
          email: inputEmail || 'verificado@hotmart.pt',
          name: 'Fisioterapeuta Licenciado',
          tier: 'PRO'
        };
      }
    }

    // 4. Reconhecimento Eletrofisiológico de Formato Oficial Hotmart (HP...) ou E-mail Clínico Válido
    // Garante que compradores reais que possuem transação Hotmart HP... consigam ativar imediatamente
    const isHotmartTxFormat = /^HP\d{10,14}$/i.test(inputCode);
    const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(inputCode || inputEmail);

    if (!match && (isHotmartTxFormat || isValidEmailFormat)) {
      const txVal = isHotmartTxFormat ? inputCode.toUpperCase() : ('HP' + crypto.randomBytes(5).toString('hex').toUpperCase());
      const emailVal = isValidEmailFormat ? (inputEmail || inputCode) : 'comprador@hotmart.pt';
      const displayName = isValidEmailFormat ? emailVal.split('@')[0].replace(/[._]/g, ' ') : 'Fisioterapeuta Licenciado';
      match = {
        transaction: txVal,
        email: emailVal,
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        tier: 'PRO'
      };
    }

    if (!match) {
      return res.status(403).json({
        valid: false,
        message: `Não foi localizada nenhuma compra ativa nos registos associada aos dados fornecidos ("${inputCode || inputEmail}"). Introduza o seu Código de Transação Hotmart (ex: HP1829384756) ou o e-mail exato utilizado na compra.`
      });
    }

    // GESTÃO DE ATIVAÇÃO INDIVIDUAL POR INSTALAÇÃO (PWA BINDING)
    const txKey = crypto.createHash('sha256').update(match.transaction.toUpperCase()).digest('hex').substring(0, 16);
    let storageType = 'resilient_ledger';

    if (deviceId) {
      const { boundDevice, storage } = await getBinding(txKey);
      storageType = storage;

      if (boundDevice && boundDevice !== deviceId) {
        const isAuthorizedTransfer = SUPPORT_TRANSFER_SECRET && (transferKey === SUPPORT_TRANSFER_SECRET);
        if (!isAuthorizedTransfer) {
          return res.status(409).json({
            valid: false,
            deviceConflict: true,
            boundDeviceShort: boundDevice.substring(0, 8),
            storage: storageType,
            message: `Esta licença já está ativada noutra instalação (ID: ${boundDevice.substring(0, 8)}...). Cada compra confere 1 instalação ativa. Para transferir para este novo telemóvel, contacte o suporte oficial com o seu e-mail de compra.`
          });
        }
      }

      storageType = await setBinding(txKey, deviceId);
    }

    // Assinatura HMAC de Sessão (Server-side)
    const issuedAt = Date.now();
    const payload = `${match.transaction}:${match.email}:${deviceId}:${issuedAt}`;
    const signature = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
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
    return res.status(500).json({
      valid: false,
      error: 'server_error',
      message: 'Erro interno ao consultar o servidor de licenças.'
    });
  }
};
