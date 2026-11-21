// Vercel Serverless Function: api/verify-license.js
// Secure Hotmart License Verification by Transaction Code (HP...) or Email with Revocation Enforcement & Single-Device Binding

const crypto = require('crypto');

function getServerSecret() {
  return (
    process.env.LICENSE_SERVER_SECRET ||
    crypto.createHash('sha256').update('electromapas_pro_stable_salt_2026').digest('hex')
  );
}

function getTransferSecret() {
  return process.env.LICENSE_TRANSFER_SECRET || 'TRANSFER-SUPORTE-2026';
}

function getMemoryBindings() {
  if (!global.__ELECTROMAPAS_DEVICE_BINDINGS) {
    global.__ELECTROMAPAS_DEVICE_BINDINGS = new Map();
  }
  return global.__ELECTROMAPAS_DEVICE_BINDINGS;
}

function hashIdentifier(val) {
  if (!val) return '';
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex');
}

function shortHashUpper(val) {
  return crypto.createHash('sha256').update(String(val).trim().toUpperCase()).digest('hex').slice(0, 16);
}

function shortHashLower(val) {
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex').slice(0, 16);
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
    throw new Error(`Upstash REST HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data && data.error) {
    throw new Error(`Upstash REST error: ${data.error}`);
  }
  return data ? data.result : null;
}

function parseStoredJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Looks up webhook purchase records in Upstash Redis / KV and process memory.
 * CRITICAL: Returns BOTH 'ACTIVE' and 'REVOKED' records so refunded licenses
 * are explicitly blocked instead of falling through to legacy format checks.
 */
async function getWebhookPurchase(inputCode, inputEmail) {
  const kv = getKvConfig();
  let txRecord = null;
  let emailRecord = null;

  const txKey = inputCode ? shortHashUpper(inputCode) : null;
  const emailKey = inputEmail && inputEmail.includes('@') ? shortHashLower(inputEmail) : null;

  if (kv) {
    try {
      if (txKey) {
        const rawTx = await kvCommand(['GET', `hotmart_license_tx_${txKey}`]);
        txRecord = parseStoredJson(rawTx);
      }
      if (emailKey) {
        const rawEmail = await kvCommand(['GET', `hotmart_license_email_${emailKey}`]);
        emailRecord = parseStoredJson(rawEmail);
      }
    } catch (err) {
      console.warn('[Storage] KV lookup failed:', err.message);
    }
  }

  if (!txRecord && txKey && global.__MEM_HOTMART_TX) {
    txRecord = global.__MEM_HOTMART_TX.get(txKey) || null;
  }
  if (!emailRecord && emailKey && global.__MEM_HOTMART_EMAIL) {
    emailRecord = global.__MEM_HOTMART_EMAIL.get(emailKey) || null;
  }

  // Revocation always takes strict precedence over any stale active record
  if (txRecord && txRecord.status === 'REVOKED') return txRecord;
  if (emailRecord && emailRecord.status === 'REVOKED') return emailRecord;

  if (txRecord && txRecord.status === 'ACTIVE') return txRecord;
  if (emailRecord && emailRecord.status === 'ACTIVE') return emailRecord;

  return null;
}

async function getBinding(bindKey) {
  const kv = getKvConfig();
  if (kv) {
    try {
      const boundDevice = await kvCommand(['GET', `license_bind_${bindKey}`]);
      return { boundDevice: boundDevice || null, storage: 'persistent_kv' };
    } catch (err) {
      console.warn('[Storage] KV binding read failed, falling back to local ledger:', err.message);
    }
  }

  return { boundDevice: getMemoryBindings().get(bindKey) || null, storage: 'resilient_ledger' };
}

async function setBinding(bindKey, deviceId) {
  const kv = getKvConfig();
  if (kv) {
    try {
      await kvCommand(['SET', `license_bind_${bindKey}`, deviceId]);
      return 'persistent_kv';
    } catch (err) {
      console.warn('[Storage] KV binding write failed, falling back to local ledger:', err.message);
    }
  }

  getMemoryBindings().set(bindKey, deviceId);
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
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const action = body.action || 'activate';
    const deviceId = String(body.deviceId || '').trim();
    const serverSecret = getServerSecret();

    // =========================================================================
    // FLOW 1: CRYPTOGRAPHIC SESSION REVALIDATION + SERVER REVOCATION CHECK
    // =========================================================================
    if (action === 'verify_session') {
      const rawToken = String(body.sessionToken || '').trim();
      if (!rawToken) {
        return res.status(400).json({ valid: false, message: 'Token de sessão não informado.' });
      }

      let parsed;
      try {
        parsed = JSON.parse(Buffer.from(rawToken, 'base64').toString('utf8'));
      } catch (e) {
        return res.status(401).json({ valid: false, error: 'malformed_token', message: 'Token de sessão malformado ou corrompido.' });
      }

      if (!parsed || !parsed.tx || !parsed.sig || !parsed.iat || !parsed.deviceId) {
        return res.status(401).json({ valid: false, error: 'invalid_token_schema', message: 'Schema de token inválido.' });
      }

      if (deviceId && parsed.deviceId !== deviceId) {
        return res.status(409).json({
          valid: false,
          deviceConflict: true,
          message: 'Esta sessão pertence a outro dispositivo ou instalação.'
        });
      }

      const expectedPayload = `${parsed.tx}:${parsed.email}:${parsed.deviceId}:${parsed.iat}`;
      const expectedSig = crypto.createHmac('sha256', serverSecret).update(expectedPayload).digest('hex');

      if (parsed.sig !== expectedSig) {
        return res.status(401).json({
          valid: false,
          error: 'invalid_signature',
          message: 'Assinatura criptográfica da sessão inválida ou adulterada.'
        });
      }

      // Enforce webhook refund/chargeback/cancel revocation on active sessions
      const webhookState = await getWebhookPurchase(parsed.tx, parsed.email);
      if (webhookState && webhookState.status === 'REVOKED') {
        return res.status(403).json({
          valid: false,
          revoked: true,
          message: 'Esta licença foi revogada devido a reembolso ou cancelamento na Hotmart.'
        });
      }

      const bindKey = parsed.bindKey || shortHashUpper(parsed.tx);
      const { boundDevice } = await getBinding(bindKey);
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
    // FLOW 2: TECHNICAL EVALUATION BYPASS DISABLED BY DEFAULT
    // =========================================================================
    if (action === 'eval_demo') {
      if (process.env.ALLOW_EVAL_DEMO !== 'true') {
        return res.status(403).json({
          valid: false,
          message: 'O modo de avaliação técnica está desativado. Ativa a tua licença com o código Hotmart ou e-mail de compra.'
        });
      }

      const issuedAt = Date.now();
      const evalTx = 'EVAL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const evalEmail = 'avaliacao.clinica@electromapas.pt';
      const evalName = 'Fisioterapeuta (Avaliação Clínica)';
      const payload = `${evalTx}:${evalEmail}:${deviceId}:${issuedAt}`;
      const signature = crypto.createHmac('sha256', serverSecret).update(payload).digest('hex');
      const sessionToken = Buffer.from(
        JSON.stringify({
          tx: evalTx,
          email: evalEmail,
          name: evalName,
          deviceId,
          iat: issuedAt,
          sig: signature
        })
      ).toString('base64');

      return res.status(200).json({
        valid: true,
        message: 'Acesso de avaliação técnica ativado com sucesso para este dispositivo.',
        buyer: evalName,
        transaction: evalTx,
        deviceId,
        sessionToken
      });
    }

    // =========================================================================
    // FLOW 3: LICENSE ACTIVATION (HOTMART TRANSACTION HP... OR BUYER EMAIL)
    // =========================================================================
    const rawCode = String(body.code || '').trim();
    const rawEmail = String(body.email || '').trim().toLowerCase();
    const inputEmail = rawEmail.includes('@') ? rawEmail : (rawCode.includes('@') ? rawCode.toLowerCase() : '');
    const inputCode = rawCode && !rawCode.includes('@') ? rawCode.toUpperCase() : '';
    const transferKey = String(body.transferKey || '').trim();

    if (!inputCode && !inputEmail) {
      return res.status(400).json({
        valid: false,
        message: 'Por favor indica o código da tua transação Hotmart ou o e-mail utilizado na compra.'
      });
    }

    // 1. Query Hotmart Webhook registry FIRST (enforces both ACTIVE and REVOKED records)
    const webhookRecord = await getWebhookPurchase(inputCode, inputEmail);
    if (webhookRecord && webhookRecord.status === 'REVOKED') {
      return res.status(403).json({
        valid: false,
        revoked: true,
        message: 'Esta licença foi revogada devido a reembolso ou cancelamento na Hotmart.'
      });
    }

    let match = null;
    if (webhookRecord && webhookRecord.status === 'ACTIVE') {
      const txVal = String(webhookRecord.transaction || inputCode).toUpperCase();
      match = {
        transaction: txVal,
        email: webhookRecord.email || inputEmail || 'comprador@hotmart.pt',
        name: webhookRecord.name || 'Fisioterapeuta Licenciado',
        tier: webhookRecord.tier || 'PRO',
        bindKey: shortHashUpper(txVal)
      };
    }

    // 2. Check environment JSON whitelist (HOTMART_PURCHASERS_JSON)
    if (!match && process.env.HOTMART_PURCHASERS_JSON) {
      try {
        const envPurchasers = JSON.parse(process.env.HOTMART_PURCHASERS_JSON);
        if (Array.isArray(envPurchasers)) {
          const found = envPurchasers.find((p) => {
            const mCode = inputCode && p.transaction && p.transaction.toUpperCase() === inputCode;
            const mMail = inputEmail && p.email && p.email.toLowerCase() === inputEmail;
            return mCode || mMail;
          });
          if (found) {
            const txVal = String(found.transaction || inputCode || ('EM-' + shortHashLower(inputEmail).slice(0, 10).toUpperCase())).toUpperCase();
            match = {
              transaction: txVal,
              email: found.email || inputEmail || 'comprador@hotmart.pt',
              name: found.name || 'Fisioterapeuta Licenciado',
              tier: found.tier || 'PRO',
              bindKey: found.transaction ? shortHashUpper(txVal) : `email_${shortHashLower(inputEmail)}`
            };
          }
        }
      } catch (e) {}
    }

    // 3. Check authorized SHA-256 whitelist (AUTHORIZED_PURCHASER_HASHES)
    if (!match && process.env.AUTHORIZED_PURCHASER_HASHES) {
      const allowedHashes = process.env.AUTHORIZED_PURCHASER_HASHES.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const codeHash = inputCode ? hashIdentifier(inputCode) : '';
      const mailHash = inputEmail ? hashIdentifier(inputEmail) : '';
      if ((codeHash && allowedHashes.includes(codeHash)) || (mailHash && allowedHashes.includes(mailHash))) {
        const txVal = inputCode || 'EM-' + shortHashLower(inputEmail).slice(0, 10).toUpperCase();
        match = {
          transaction: txVal,
          email: inputEmail || 'verificado@hotmart.pt',
          name: 'Fisioterapeuta Licenciado',
          tier: 'PRO',
          bindKey: inputCode ? shortHashUpper(txVal) : `email_${shortHashLower(inputEmail)}`
        };
      }
    }

    // 4. Backward-compatible format check for pre-webhook purchases (disabled when STRICT_WEBHOOK_ONLY=true)
    if (!match && process.env.STRICT_WEBHOOK_ONLY !== 'true') {
      const isHotmartTxFormat = /^HP\d{10,14}$/i.test(inputCode);
      const isValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(inputEmail);

      if (isHotmartTxFormat || isValidEmailFormat) {
        const emailHash = isValidEmailFormat ? shortHashLower(inputEmail) : '';
        const txVal = isHotmartTxFormat
          ? inputCode.toUpperCase()
          : `EM-${emailHash.slice(0, 10).toUpperCase()}`;
        const emailVal = isValidEmailFormat ? inputEmail : 'comprador@hotmart.pt';
        const displayName = isValidEmailFormat
          ? emailVal.split('@')[0].replace(/[._]/g, ' ')
          : 'Fisioterapeuta Licenciado';

        match = {
          transaction: txVal,
          email: emailVal,
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          tier: 'PRO',
          bindKey: isHotmartTxFormat ? shortHashUpper(txVal) : `email_${emailHash}`
        };
      }
    }

    if (!match) {
      return res.status(403).json({
        valid: false,
        message: `Não foi localizada nenhuma compra ativa nos registos associada aos dados fornecidos ("${inputCode || inputEmail}"). Introduz o teu Código de Transação Hotmart (ex.: HP1829384756) ou o e-mail exato utilizado na compra.`
      });
    }

    // Single-device PWA binding
    const bindKey = match.bindKey || shortHashUpper(match.transaction);
    let storageType = getKvConfig() ? 'persistent_kv' : 'resilient_ledger';

    if (deviceId) {
      const { boundDevice, storage } = await getBinding(bindKey);
      storageType = storage;

      if (boundDevice && boundDevice !== deviceId) {
        const transferSecret = getTransferSecret();
        const isAuthorizedTransfer = transferSecret && transferKey === transferSecret;
        if (!isAuthorizedTransfer) {
          return res.status(409).json({
            valid: false,
            deviceConflict: true,
            boundDeviceShort: boundDevice.slice(0, 8),
            storage: storageType,
            message: `Esta licença já está ativada noutra instalação (ID: ${boundDevice.slice(0, 8)}...). Cada compra confere 1 instalação ativa. Para transferir para este novo telemóvel, contacta o suporte oficial através da tua conta Hotmart com o teu e-mail de compra.`
          });
        }
      }

      storageType = await setBinding(bindKey, deviceId);
    }

    const issuedAt = Date.now();
    const payload = `${match.transaction}:${match.email}:${deviceId}:${issuedAt}`;
    const signature = crypto.createHmac('sha256', serverSecret).update(payload).digest('hex');
    const sessionToken = Buffer.from(
      JSON.stringify({
        tx: match.transaction,
        email: match.email,
        name: match.name,
        deviceId,
        bindKey,
        iat: issuedAt,
        sig: signature
      })
    ).toString('base64');

    return res.status(200).json({
      valid: true,
      message: 'Licença confirmada e vinculada com sucesso a esta instalação.',
      buyer: match.name,
      transaction: match.transaction,
      deviceId,
      storageMode: storageType,
      sessionToken
    });
  } catch (err) {
    console.error('License verification error:', err.message);
    return res.status(500).json({
      valid: false,
      error: 'server_error',
      message: 'Erro interno ao consultar o servidor de licenças.'
    });
  }
};
