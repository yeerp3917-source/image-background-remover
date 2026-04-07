/**
 * 轻量级 JWT 工具 —— 完全基于 Web Crypto API
 * 兼容 Cloudflare Workers / Edge Runtime
 *
 * 算法：HS256（HMAC-SHA256）
 * Payload 约定：{ sub: userId, name, email, picture, iat, exp }
 */

export interface SessionPayload {
  sub: string     // userId（Google sub）
  name: string
  email: string
  picture: string
  iat: number
  exp: number
}

function base64UrlEncode(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length + 2) % 4 || 4)
  const binary = atob(padded)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

async function getKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret)
  return crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/** 签发 JWT */
export async function signJWT(payload: Omit<SessionPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds = 60 * 60 * 24 * 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: SessionPayload = { ...payload, iat: now, exp: now + expiresInSeconds }

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const body   = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${header}.${body}`

  const key = await getKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))

  return `${signingInput}.${base64UrlEncode(signature)}`
}

/** 验证并解析 JWT；失败返回 null */
export async function verifyJWT(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, body, sig] = parts
    const signingInput = `${header}.${body}`

    const key = await getKey(secret)
    const sigBytes = base64UrlDecode(sig)
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(signingInput)
    )
    if (!valid) return null

    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null // 已过期

    return payload
  } catch {
    return null
  }
}
