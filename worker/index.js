const GITHUB_DISPATCH_URL =
  'https://api.github.com/repos/SomeOrdinaryBro/smoke-tracker/dispatches'

// ---------------------------------------------------------------------------
// JWT helpers (Web Crypto / RS256)
// ---------------------------------------------------------------------------

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

function b64urlToBytes(str) {
  return Uint8Array.from(b64urlDecode(str), (c) => c.charCodeAt(0))
}

async function verifyAuth0JWT(token, env) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')
  const [headerB64, payloadB64, sigB64] = parts

  const header = JSON.parse(b64urlDecode(headerB64))
  if (header.alg !== 'RS256') throw new Error(`Unsupported algorithm: ${header.alg}`)
  if (!header.kid) throw new Error('Missing kid in JWT header')

  // Fetch JWKS — cached at the edge for 1 h
  const jwksRes = await fetch(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  })
  if (!jwksRes.ok) throw new Error('Failed to fetch JWKS')
  const { keys } = await jwksRes.json()

  const jwk = keys.find((k) => k.kid === header.kid && k.use === 'sig')
  if (!jwk) throw new Error('Signing key not found in JWKS')

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    b64urlToBytes(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  )
  if (!valid) throw new Error('Invalid signature')

  const payload = JSON.parse(b64urlDecode(payloadB64))
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) throw new Error('Token expired')
  if (payload.iss !== `https://${env.AUTH0_DOMAIN}/`) throw new Error('Invalid issuer')

  // For Auth0 ID tokens, aud = client ID
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!aud.includes(env.AUTH0_CLIENT_ID)) throw new Error('Invalid audience')

  return payload
}

// ---------------------------------------------------------------------------
// Route: POST /log
// ---------------------------------------------------------------------------

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function handleLog(request, env) {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return jsonResponse({ error: 'Missing authorization token' }, 401)

  try {
    await verifyAuth0JWT(token, env)
  } catch (err) {
    console.error('JWT verification failed:', err.message)
    return jsonResponse({ error: `Unauthorized: ${err.message}` }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { date, smoked, craving } = body ?? {}
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof smoked !== 'boolean' ||
    !Number.isInteger(craving) ||
    craving < 1 ||
    craving > 5
  ) {
    return jsonResponse(
      { error: 'Invalid payload: date (YYYY-MM-DD), smoked (bool), craving (1-5)' },
      400,
    )
  }

  const ghRes = await fetch(GITHUB_DISPATCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GH_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'log-day',
      client_payload: { date, smoked, craving },
    }),
  })

  if (!ghRes.ok) {
    console.error('GitHub dispatch failed:', ghRes.status, await ghRes.text())
    return jsonResponse({ error: 'Failed to dispatch to GitHub' }, 500)
  }

  return jsonResponse({ ok: true }, 200)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/log' && request.method === 'POST') {
      return handleLog(request, env)
    }

    // All other requests (SPA routes, static assets) fall through to the
    // Cloudflare Assets binding, which handles not_found → index.html
    return env.ASSETS.fetch(request)
  },
}
