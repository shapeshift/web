import { cspMerge, cspToEntries, entriesToCsp, serializeCsp } from './util'

describe('cspToEntries', () => {
  it('works', async () => {
    expect(cspToEntries({})).toMatchObject([])
    expect(
      cspToEntries({
        foo: ['bar', 'baz'],
        bash: ['quux'],
      }),
    ).toMatchObject([
      ['foo', 'bar'],
      ['foo', 'baz'],
      ['bash', 'quux'],
    ])
  })
})

describe('entriesToCsp', () => {
  it('works', async () => {
    expect(entriesToCsp([])).toMatchObject({})
    expect(
      entriesToCsp([
        ['foo', 'bar'],
        ['foo', 'baz'],
        ['bash', 'quux'],
      ]),
    ).toMatchObject({
      foo: ['bar', 'baz'],
      bash: ['quux'],
    })
  })
})

describe('cspMerge', () => {
  it('handles the degenerate case', async () => {
    expect(cspMerge()).toMatchObject({})
    expect(
      cspMerge({
        foo: ['bar'],
      }),
    ).toMatchObject({
      foo: ['bar'],
    })
  })
  it('merges component CSPs with different directives', async () => {
    expect(
      cspMerge(
        {
          foo: ['bar'],
        },
        {
          baz: ['bash'],
        },
      ),
    ).toMatchObject({
      foo: ['bar'],
      baz: ['bash'],
    })
  })
  it('merges identical directives of component CSPs', async () => {
    expect(
      cspMerge(
        {
          foo: ['bar'],
          baz: ['bash'],
        },
        {
          foo: ['baz'],
        },
      ),
    ).toMatchObject({
      foo: ['bar', 'baz'],
      baz: ['bash'],
    })
  })
  it("omits the 'none' source if is directive isn't empty", async () => {
    expect(
      cspMerge(
        {
          foo: ["'none'"],
        },
        {
          foo: ['bar'],
        },
      ),
    ).toMatchObject({
      foo: ['bar'],
    })
    expect(
      cspMerge(
        {
          foo: ['bar'],
        },
        {
          foo: ["'none'"],
        },
      ),
    ).toMatchObject({
      foo: ['bar'],
    })
    expect(
      cspMerge(
        {
          foo: [],
        },
        {
          foo: ["'none'"],
        },
      ),
    ).toMatchObject({
      foo: ["'none'"],
    })
  })
  it('removes empty directives', async () => {
    expect(
      cspMerge(
        {
          foo: [],
        },
        {
          foo: [],
        },
      ),
    ).toMatchObject({})
  })
  it('sorts directives and elements', async () => {
    expect(
      JSON.stringify(
        cspMerge(
          {
            b: ['d', 'f'],
            a: ['c', 'b'],
          },

          {
            a: ['a'],
            b: ['e'],
          },
        ),
      ),
    ).toEqual(`{"a":["a","b","c"],"b":["d","e","f"]}`)
  })
})

describe('serializeCsp', () => {
  it('works', async () => {
    expect(
      serializeCsp({
        foo: ['bar', 'baz'],
        bash: ['quux'],
      }),
    ).toEqual('foo bar baz; bash quux')
  })
})
