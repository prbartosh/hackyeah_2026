// @vitest-environment jsdom
import { createElement, useState, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runAction, runActions } from '@/tour/engine/actions'
import type { TourContext } from '@/tour/types'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function makeCtx(): TourContext & { store: Record<string, string> } {
  const store: Record<string, string> = {}
  return { store, get: (k) => store[k], set: (k, v) => { store[k] = v }, api: async () => undefined as never }
}

const FAST = { typingBudgetMs: 0, highlightMs: 0, findTimeoutMs: 50 }
let root: Root
let host: HTMLElement

beforeEach(() => {
  // jsdom nie liczy układu: uznajemy każdy element za widoczny
  Element.prototype.getClientRects = function () { return [{}] as unknown as DOMRectList }
  Element.prototype.scrollIntoView = () => {}
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function Form({ onSend }: { onSend: (v: string) => void }) {
  const [text, setText] = useState('')
  const [role, setRole] = useState('a')
  return createElement('div', null,
    createElement('textarea', { 'data-tour': 'pole', value: text, onChange: (e: { target: { value: string } }) => setText(e.target.value) }),
    createElement('select', { 'data-tour': 'rola', value: role, onChange: (e: { target: { value: string } }) => setRole(e.target.value) },
      createElement('option', { value: 'a' }, 'A'), createElement('option', { value: 'b' }, 'Beta')),
    createElement('button', { 'data-tour': 'wyslij', disabled: !text, onClick: () => onSend(`${text}|${role}`) }, 'Wyślij'),
    createElement('a', { 'data-tour': 'link', href: '/watek/abc123?x=1' }, 'Wątek  '),
  )
}

describe('wykonawca akcji', () => {
  it('wpisuje tekst w kontrolowane pole, wybiera opcję i klika', async () => {
    const sent: string[] = []
    act(() => root.render(createElement(Form, { onSend: (v) => sent.push(v) })))
    const ctx = makeCtx()
    await act(async () => {
      await runActions([
        { kind: 'fill', target: 'pole', value: async () => 'Cześć, świecie' },
        { kind: 'select', target: 'rola', value: 'Beta' },
        { kind: 'click', target: 'wyslij' },
      ], ctx, FAST)
    })
    expect(sent).toEqual(['Cześć, świecie|b'])
  })

  it('capture zapisuje wartość z regexem do ctx', async () => {
    act(() => root.render(createElement(Form, { onSend: () => {} })))
    const ctx = makeCtx()
    await runAction({ kind: 'capture', target: 'link', key: 'token', from: 'href', pattern: '/watek/([^/?#]+)' }, ctx, FAST)
    await runAction({ kind: 'capture', target: 'link', key: 'tekst', from: 'text' }, ctx, FAST)
    expect(ctx.store).toEqual({ token: 'abc123', tekst: 'Wątek' })
  })

  it('capture z niepasującym wzorcem rzuca', async () => {
    act(() => root.render(createElement(Form, { onSend: () => {} })))
    await expect(runAction({ kind: 'capture', target: 'link', key: 'x', from: 'href', pattern: '/nie/(\\d+)' }, makeCtx(), FAST)).rejects.toThrow()
  })

  it('pomija akcję, której elementu nie ma', async () => {
    act(() => root.render(createElement(Form, { onSend: () => {} })))
    expect(await runAction({ kind: 'click', target: 'brak' }, makeCtx(), FAST)).toBe(false)
    await runActions([{ kind: 'check', target: 'brak' }], makeCtx(), FAST)
  })

  it('czeka na element, który pojawia się później', async () => {
    const ctx = makeCtx()
    const p = runAction({ kind: 'capture', target: 'pozniej', key: 'k', from: 'text' }, ctx, { ...FAST, findTimeoutMs: 1000 })
    setTimeout(() => { const el = document.createElement('span'); el.dataset.tour = 'pozniej'; el.textContent = 'ok'; host.appendChild(el) }, 100)
    expect(await p).toBe(true)
    expect(ctx.store.k).toBe('ok')
  })
})
