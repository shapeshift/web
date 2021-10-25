import format from './format'

class RuntimeError extends Error {}

describe('format(x: any)', () => {
  const err = new RuntimeError('Some error')
  it.each([
    ['asdf', { message: 'asdf' }],
    [{ name: 'zan' }, { name: 'zan' }],
    [
      err,
      {
        error: {
          message: err.message,
          stack: err.stack,
          kind: 'RuntimeError'
        }
      }
    ]
  ])('should format %p', (x, expected) => {
    expect(format(x)).toMatchObject(expected)
  })

  it('should throw if provided an array', () => {
    expect(() => format([])).toThrowError(Error)
  })

  it.each([[undefined], [null], [0], [true], [new Date()], [/abc/]])(
    'should return undefined for any other value',
    (x) => {
      expect(format(x)).toBeUndefined()
    }
  )
})
