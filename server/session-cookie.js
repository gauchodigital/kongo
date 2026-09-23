import crypto from 'node:crypto';

const COOKIE = 'kongo.sid';

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${mac}`;
}

function unsign(value, secret) {
  const raw = String(value || '');
  const dot = raw.lastIndexOf('.');
  if (dot < 0) return null;
  const data = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function cookieSession({ secret, secure, maxAgeMs = 8 * 60 * 60 * 1000 }) {
  return (req, res, next) => {
    const parsed = unsign(parseCookies(req.headers.cookie)[COOKIE], secret);
    req.session = parsed && typeof parsed === 'object' ? { ...parsed } : {};

    const write = res.writeHead.bind(res);
    res.writeHead = function writeHead(...args) {
      const current = req.session && typeof req.session === 'object' ? req.session : {};
      const empty = !Object.keys(current).length;
      const same = parsed && !empty && JSON.stringify(parsed) === JSON.stringify(current);
      const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax', secure ? 'Secure' : ''].filter(Boolean);
      if (empty && parsed) {
        res.appendHeader('Set-Cookie', `${COOKIE}=; ${flags.join('; ')}; Max-Age=0`);
      } else if (!empty && !same) {
        res.appendHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(sign(current, secret))}; ${flags.join('; ')}; Max-Age=${Math.floor(maxAgeMs / 1000)}`);
      }
      return write(...args);
    };
    next();
  };
}
