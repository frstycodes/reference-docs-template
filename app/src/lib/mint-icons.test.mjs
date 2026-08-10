/* The sanitiser is the only thing standing between a fetched third-party SVG
   and the app's one `dangerouslySetInnerHTML`, so it gets the adversarial
   tests rather than the happy-path ones. */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSymbol, mintIcons } from './mint-icons.mjs'

const ok = (body, viewBox = '0 0 24 24') => sanitizeSymbol('i-x', { viewBox, body })

test('a plain logo survives intact', () => {
  const out = ok('<path fill="#5E6AD2" d="M2 4h8v8z"/>')
  assert.equal(out, '<symbol id="i-x" viewBox="0 0 24 24"><path fill="#5E6AD2" d="M2 4h8v8z"/></symbol>')
})

test('<style> is dropped WITH its text, not unwrapped into the page', () => {
  // The real case: withpact.com/favicon.svg ships exactly this, and a
  // `path{}` rule inlined into the document repaints every path on the page.
  const out = ok('<style>path { fill: #0f0e0d }</style><path d="M0 0h4v4z"/>')
  assert.doesNotMatch(out, /fill: #0f0e0d|path \{/)
  assert.match(out, /<path d="M0 0h4v4z"\/>/)
})

test('script never survives, in any spelling', () => {
  for (const body of [
    '<script>alert(1)</script><path d="M0 0h4v4z"/>',
    '<SCRIPT >alert(1)</SCRIPT ><path d="M0 0h4v4z"/>',
    '<script src="//evil"/><path d="M0 0h4v4z"/>',
  ]) {
    const out = sanitizeSymbol('i-x', { viewBox: '0 0 24 24', body })
    assert.doesNotMatch(out ?? '', /script|alert/i, body)
  }
})

test('event handlers are not copied, however they are quoted', () => {
  const out = ok(`<path onload='alert(1)' ONCLICK="x()" d="M0 0h4v4z"/>`)
  assert.doesNotMatch(out, /onload|onclick|alert/i)
  assert.match(out, /d="M0 0h4v4z"/)
})

test('nothing may reference an external resource', () => {
  const out = ok('<image href="https://evil/x.png"/><path fill="url(#leak)" d="M0 0h4v4z"/>')
  assert.doesNotMatch(out, /image|href|url\(/)
  assert.match(out, /<path d="M0 0h4v4z"\/>/, 'the path survives, its remote fill does not')
})

test('foreignObject cannot smuggle HTML in', () => {
  const out = sanitizeSymbol('i-x', {
    viewBox: '0 0 24 24',
    body: '<foreignObject><img src=x onerror=alert(1)></foreignObject><path d="M0 0h4v4z"/>',
  })
  assert.doesNotMatch(out, /foreignObject|onerror|img/i)
})

test('a mark with nothing left to draw is dropped, not shipped empty', () => {
  assert.equal(ok('<script>alert(1)</script>'), null)
  assert.equal(ok('<g></g>'), null)
})

test('the id and viewBox are validated, not trusted', () => {
  assert.equal(sanitizeSymbol('i-x"><script>', { viewBox: '0 0 24 24', body: '<path d="M0 0h4v4z"/>' }), null)
  assert.equal(sanitizeSymbol('notprefixed', { viewBox: '0 0 24 24', body: '<path d="M0 0h4v4z"/>' }), null)
  assert.equal(sanitizeSymbol('i-x', { viewBox: '0 0 24 24"><foo', body: '<path d="M0 0h4v4z"/>' }), null)
  assert.equal(sanitizeSymbol('i-x', { viewBox: '', body: '<path d="M0 0h4v4z"/>' }), null)
})

test('mintIcons reports the ids that survived, and only those', () => {
  const warns = []
  const { markup, ids } = mintIcons({
    'i-notion': { viewBox: '0 0 24 24', body: '<path d="M0 0h4v4z"/>' },
    'i-broken': { viewBox: '0 0 24 24', body: '<script>x</script>' },
  }, (m) => warns.push(m))
  assert.deepEqual([...ids], ['i-notion'])
  assert.match(markup, /id="i-notion"/)
  assert.doesNotMatch(markup, /i-broken/)
  assert.equal(warns.length, 1)
})

test('no icons means no empty sprite element', () => {
  assert.equal(mintIcons({}).markup, '')
  assert.equal(mintIcons(undefined).markup, '')
})
