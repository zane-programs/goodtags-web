import { describe, expect, it } from 'vitest'
import { emptyNav, pathOf, pushPath, stateFromPath } from './routes'

const focused = (path: string): { name: string; params: Record<string, string> } => {
  const state = stateFromPath(path)
  return state.root.at(-1) ?? state.home.at(-1) ?? { name: `tab:${state.tab}`, params: {} }
}

describe('links decorated by whoever shared them', () => {
  it.each([
    ['/?fbclid=IwAR0abc', 'tab:home'],
    ['/?utm_source=x&utm_medium=y#top', 'tab:home'],
    ['/search?fbclid=x', 'tab:search'],
    ['/favorites/?gclid=x', 'tab:favorites'],
    ['/popular?fbclid=x', 'collection'],
    ['/popular/', 'collection'],
    ['/about?ref=share', 'about'],
    ['/tag/5?fbclid=x', 'tag'],
    ['/popular/tag/5/?fbclid=x', 'tag'],
    ['/tag/5/videos?si=abc', 'tagVideos'],
  ])('%s opens %s, never "not found"', (path, name) => {
    expect(focused(path).name).toBe(name)
  })

  it('still builds the stack beneath a decorated deep link', () => {
    const state = stateFromPath('/popular/tag/5/videos?fbclid=x')
    expect(state.home.map(route => route.name)).toEqual(['collection'])
    expect(state.root.map(route => route.name)).toEqual(['tag', 'tagVideos'])
    expect(state.root[0].params).toEqual({ id: '5', list: '/popular' })
    // The tag's own URL is clean, so sharing it again does not pass the tracker on.
    expect(state.root[0].path).toBe('/popular/tag/5')
  })

  it('keeps the queries screens actually read', () => {
    expect(focused('/labels/new?tag=5&fbclid=x').params.tag).toBe('5')
    const pushed = pushPath(emptyNav(), '/labels/new?tag=5')
    expect(pushed.root[0].params.tag).toBe('5')
    expect(pathOf(pushed)).toBe('/labels/new?tag=5')
  })

  it('treats pushes the same way', () => {
    expect(pushPath(emptyNav(), '/search?fbclid=x').tab).toBe('search')
    expect(pushPath(emptyNav(), '/tag/9?fbclid=x').root[0]).toMatchObject({
      name: 'tag',
      path: '/tag/9',
      params: { id: '9' },
    })
  })

  it('still reports paths that really do not exist', () => {
    expect(focused('/nope').name).toBe('notFound')
    expect(focused('/nope?fbclid=x').name).toBe('notFound')
    expect(focused('/tag/abc').name).toBe('notFound')
  })
})
