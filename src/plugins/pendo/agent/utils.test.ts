import { applyFixups, JSONWithRegex } from './utils'

describe('JSONWithRegex', () => {
  it('works', async () => {
    const regexCookie = 'deadbeef'
    const jsonWithRegex = new JSONWithRegex(regexCookie)
    const serialized = jsonWithRegex.stringify({
      foo: 'bar',
      // eslint-disable-next-line no-useless-escape
      bar: /^\\\/b\az$/gi,
    })
    expect(serialized).toMatchInlineSnapshot(
      `"{\\"foo\\":\\"bar\\",\\"bar\\":\\"deadbeef/^\\\\\\\\\\\\\\\\\\\\\\\\/b\\\\\\\\az$/gi\\"}"`,
    )
    expect(JSON.parse(serialized)).toMatchInlineSnapshot(`
      Object {
        "bar": "deadbeef/^\\\\\\\\\\\\/b\\\\az$/gi",
        "foo": "bar",
      }
    `)
    expect(jsonWithRegex.parse(serialized)).toMatchInlineSnapshot(`
      Object {
        "bar": /\\^\\\\\\\\\\\\/b\\\\az\\$/,
        "foo": "bar",
      }
    `)

    expect(() =>
      new JSONWithRegex('foo').parse('{"bar":"foobar"}'),
    ).toThrowErrorMatchingInlineSnapshot(`"matched regexCookie, but bar is not a regex"`)

    expect(new JSONWithRegex().parse('{"bar":"/baz/"}')).toMatchInlineSnapshot(`
      Object {
        "bar": /baz/,
      }
    `)

    expect(new JSONWithRegex().parse('{"bar":"foobar"}')).toMatchInlineSnapshot(`
      Object {
        "bar": "foobar",
      }
    `)
  })
})

describe('applyFixups', () => {
  it('works with a fixup in the middle', async () => {
    const src = 'foobaz'
    const fixups = { 3: 'bar' }
    expect(applyFixups(src, fixups)).toMatchInlineSnapshot(`"foobarbaz"`)
  })
  it('works with a fixup at the beginning', async () => {
    const src = 'barbaz'
    const fixups = { 0: 'foo' }
    expect(applyFixups(src, fixups)).toMatchInlineSnapshot(`"foobarbaz"`)
  })
  it('works with a fixup at the end', async () => {
    const src = 'foobar'
    const fixups = { 6: 'baz' }
    expect(applyFixups(src, fixups)).toMatchInlineSnapshot(`"foobarbaz"`)
  })
  it('works with multiple fixups', async () => {
    const src = 'bar'
    const fixups = { 0: 'foo', 3: 'baz' }
    expect(applyFixups(src, fixups)).toMatchInlineSnapshot(`"foobarbaz"`)
  })
  it('fails with out-of-range fixups', async () => {
    const src = 'bar'
    const fixups = { 0: 'foo', 4: 'baz' }
    expect(() => applyFixups(src, fixups)).toThrowErrorMatchingInlineSnapshot(
      `"applyFixups: fixup index 4 exceeds length of source string (3)"`,
    )
  })
})
