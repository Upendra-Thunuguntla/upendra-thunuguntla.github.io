/**
 * MuleSoft Secure Properties - Browser Crypto Engine
 * Built from decompiled secure-properties-tool.jar source.
 *
 * KEY FACTS (from SymmetricEncryptionKeyFactory.java + JCEEncrypter.java):
 *
 *   Key bytes  : key.getBytes()  ->  raw UTF-8 bytes, NO hashing, NO padding
 *   IV (default): Arrays.copyOfRange(key.getEncoded(), 0, blockSize)
 *                 = FIRST N BYTES OF THE KEY (not zeros, not MD5!)
 *                 AES block = 16 bytes, Blowfish/DES/DESede block = 8 bytes
 *   IV (random) : random bytes, prepended to ciphertext
 *   Padding     : PKCS5Padding (= PKCS7 for 64/128-bit blocks)
 *   Value in    : value.getBytes()  ->  UTF-8
 *   Value out   : new String(bytes) ->  UTF-8
 *   Output      : Base64, wrapped in ![ ]
 *
 * Supported algorithms: AES, Blowfish, DES, DESede, RC2, RC4(RCA)
 * Supported modes     : CBC, CFB, OFB, ECB
 */

// ---- CryptoJS loader --------------------------------------------------------

let _cjsPromise = null;

function loadCryptoJS() {
  if (window.CryptoJS) return Promise.resolve(window.CryptoJS);
  if (_cjsPromise) return _cjsPromise;
  _cjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js';
    s.onload = () => resolve(window.CryptoJS);
    s.onerror = () => reject(new Error('Failed to load CryptoJS from CDN.'));
    document.head.appendChild(s);
  });
  return _cjsPromise;
}

// ---- Utilities --------------------------------------------------------------

const _enc = new TextEncoder();
const _dec = new TextDecoder();

function strToBytes(str)   { return _enc.encode(str); }
function bytesToStr(bytes) { return _dec.decode(bytes); }

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function base64ToBytes(b64) {
  const bin = atob(b64.trim());
  return new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function stripWrapper(val) {
  return val.replace(/^!\[/, '').replace(/\]$/, '').trim();
}

// ---- Key & IV derivation (exact match to Java source) -----------------------
//
// SymmetricEncryptionKeyFactory.java:
//   this.key = key.getBytes();   <- raw UTF-8, no hash, no derivation
//
// JCEEncrypter.java:
//   ivInByteArray = Arrays.copyOfRange(key.getEncoded(), 0, cipher.getBlockSize());
//   i.e. IV = first <blockSize> bytes of the key bytes
//   If key is shorter than blockSize, remaining bytes stay 0x00

function getKeyBytes(keyStr) {
  return strToBytes(keyStr);  // raw UTF-8
}

function getIVFromKey(keyBytes, blockSize) {
  const iv = new Uint8Array(blockSize);
  iv.set(keyBytes.slice(0, blockSize));  // zero-padded if key < blockSize
  return iv;
}

// Block sizes (bytes)
const BLOCK_SIZES = {
  AES:      16,
  Blowfish:  8,
  DES:       8,
  DESede:    8,
  RC2:       8,
  RCA:       0,   // stream cipher, no block/IV
};

// ---- AES via Web Crypto API (CBC only) --------------------------------------

async function aesCbcCrypt(op, dataBytes, keyBytes, ivBytes) {
  // AES key must be exactly 16, 24, or 32 bytes
  const validLen = keyBytes.length <= 16 ? 16
                 : keyBytes.length <= 24 ? 24 : 32;
  const keyMat = new Uint8Array(validLen);
  keyMat.set(keyBytes.slice(0, validLen));

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyMat, { name: 'AES-CBC' }, false,
    [op === 'encrypt' ? 'encrypt' : 'decrypt']
  );
  const result = await crypto.subtle[op === 'encrypt' ? 'encrypt' : 'decrypt'](
    { name: 'AES-CBC', iv: ivBytes }, cryptoKey, dataBytes
  );
  return new Uint8Array(result);
}

// ---- CryptoJS handler (all algorithms, all modes) ---------------------------

const CJS_ALGOS = {
  AES:      () => window.CryptoJS.AES,
  Blowfish: () => window.CryptoJS.Blowfish,
  DES:      () => window.CryptoJS.DES,
  DESede:   () => window.CryptoJS.TripleDES,
  RC2:      () => { throw new Error('RC2 is not supported by CryptoJS. Use AES, Blowfish, DES, or DESede.'); },
  RCA:      () => window.CryptoJS.RC4,
};

const CJS_MODES = {
  CBC: () => window.CryptoJS.mode.CBC,
  CFB: () => window.CryptoJS.mode.CFB,
  OFB: () => window.CryptoJS.mode.OFB,
  ECB: () => window.CryptoJS.mode.ECB,
};

async function cjsCrypt(op, dataBytes, keyBytes, algorithm, mode, ivBytes) {
  const CryptoJS = await loadCryptoJS();
  const Algo     = CJS_ALGOS[algorithm]();
  const isStream = BLOCK_SIZES[algorithm] === 0;

  // Key as CryptoJS WordArray (from raw bytes)
  const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));

  const cfg = {
    mode:    isStream ? CryptoJS.mode.CTR : CJS_MODES[mode](),
    padding: isStream ? CryptoJS.pad.NoPadding : CryptoJS.pad.Pkcs7,
  };

  if (!isStream && mode !== 'ECB' && ivBytes) {
    cfg.iv = CryptoJS.enc.Hex.parse(bytesToHex(ivBytes));
  }

  if (op === 'encrypt') {
    const plainWA   = CryptoJS.enc.Hex.parse(bytesToHex(dataBytes));
    const encrypted = Algo.encrypt(plainWA, key, cfg);
    return base64ToBytes(encrypted.ciphertext.toString(CryptoJS.enc.Base64));
  } else {
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(bytesToHex(dataBytes))
    });
    const decrypted = Algo.decrypt(cipherParams, key, cfg);
    const hexOut    = decrypted.toString(CryptoJS.enc.Hex);
    return new Uint8Array(hexOut.match(/.{2}/g).map(b => parseInt(b, 16)));
  }
}

// ---- Core cipher runner (mirrors JCEEncrypter.runCipher) --------------------

async function runCipher(op, valueBytes, keyStr, algorithm, mode, useRandomIV) {
  const keyBytes  = getKeyBytes(keyStr);
  const blockSize = BLOCK_SIZES[algorithm];
  const isStream  = blockSize === 0;
  const isECB     = mode === 'ECB';
  const needsIV   = !isStream && !isECB;

  let ivBytes = null;

  if (op === 'encrypt') {

    if (needsIV) {
      if (useRandomIV) {
        ivBytes = crypto.getRandomValues(new Uint8Array(blockSize));
      } else {
        // JCEEncrypter.java line 54805:
        // ivInByteArray = Arrays.copyOfRange(key.getEncoded(), 0, cipher.getBlockSize())
        ivBytes = getIVFromKey(keyBytes, blockSize);
      }
    }

    let cipherBytes;
    if (algorithm === 'AES' && mode === 'CBC') {
      cipherBytes = await aesCbcCrypt('encrypt', valueBytes, keyBytes, ivBytes);
    } else {
      cipherBytes = await cjsCrypt('encrypt', valueBytes, keyBytes, algorithm, mode, ivBytes);
    }

    // JCEEncrypter.java lines 54809-54813: prepend IV when useRandomIV
    if (useRandomIV && needsIV) {
      const out = new Uint8Array(blockSize + cipherBytes.length);
      out.set(ivBytes);
      out.set(cipherBytes, blockSize);
      return out;
    }
    return cipherBytes;

  } else {
    // decrypt
    let cipherBytes = valueBytes;

    if (needsIV) {
      if (useRandomIV) {
        // JCEEncrypter.java lines 54801-54802: extract prepended IV
        ivBytes     = cipherBytes.slice(0, blockSize);
        cipherBytes = cipherBytes.slice(blockSize);
      } else {
        ivBytes = getIVFromKey(keyBytes, blockSize);
      }
    }

    if (algorithm === 'AES' && mode === 'CBC') {
      return aesCbcCrypt('decrypt', cipherBytes, keyBytes, ivBytes);
    } else {
      return cjsCrypt('decrypt', cipherBytes, keyBytes, algorithm, mode, ivBytes);
    }
  }
}

// ---- Public API -------------------------------------------------------------

/**
 * muleEncrypt(value, key, algorithm, mode, useRandomIV)
 * Returns "![base64]"
 * Mirrors: Base64.getEncoder().encode(encrypter.encrypt(value.getBytes()))
 */
async function muleEncrypt(value, key, algorithm, mode, useRandomIV) {
  const valueBytes  = strToBytes(value);
  const cipherBytes = await runCipher('encrypt', valueBytes, key, algorithm, mode, useRandomIV);
  return bytesToBase64(cipherBytes);
}

/**
 * muleDecrypt(value, key, algorithm, mode, useRandomIV)
 * Accepts "![base64]" or raw base64.
 * Mirrors: new String(encrypter.decrypt(Base64.getDecoder().decode(value)))
 */
async function muleDecrypt(value, key, algorithm, mode, useRandomIV) {
  const cipherBytes = base64ToBytes(stripWrapper(value));
  const plainBytes  = await runCipher('decrypt', cipherBytes, key, algorithm, mode, useRandomIV);
  return bytesToStr(plainBytes);
}

/**
 * getKeyInfo(key, algorithm)
 * Key validation hint for UI.
 * Min sizes from EncryptionAlgorithm.java enum definition.
 */
function getKeyInfo(key, algorithm) {
  const len = strToBytes(key).length;
  if (len === 0) return { valid: false, hint: 'Enter a key' };

  if (algorithm === 'AES') {
    if (len < 16) return { valid: false, hint: len + ' / 16 bytes min' };
    if (len < 24) return { valid: true,  hint: 'AES-128 \u2713' };
    if (len < 32) return { valid: true,  hint: 'AES-192 \u2713' };
    return               { valid: true,  hint: 'AES-256 \u2713' };
  }
  if (algorithm === 'DES') {
    if (len < 8) return { valid: false, hint: len + ' / 8 bytes min' };
    return              { valid: true,  hint: len + ' bytes \u2713' };
  }
  if (algorithm === 'DESede') {
    if (len < 16) return { valid: false, hint: len + ' / 16 bytes min' };
    return               { valid: true,  hint: len + ' bytes \u2713' };
  }
  // Blowfish, RC4: min 1 byte
  return { valid: true, hint: len + ' bytes \u2713' };
}