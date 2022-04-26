import format from './format'

class RuntimeError extends Error {}

class ErrorWithDetails extends Error {
  cause: unknown
  code?: string
  details?: Record<string, unknown>
}

describe('format(x: any)', () => {
  it('should format a string to a message', () => {
    expect(format('asdf')).toStrictEqual({ message: 'asdf' })
  })

  it('should pass through an object', () => {
    expect(format({ name: 'name' })).toStrictEqual({ name: 'name' })
  })

  it('should format a normal error', () => {
    const err = new RuntimeError('Some error')
    expect(format(err)).toStrictEqual({
      error: {
        message: err.message,
        stack: expect.stringMatching(/_callCircusTest(?!_runTestsForDescribeBlock)/m),
        kind: 'RuntimeError'
      }
    })
  })

  it('should format an error with cause and details', () => {
    const err = new ErrorWithDetails('details')
    err.code = 'ERR_TEST'
    err.details = { foo: 'bar' }
    err.cause = new Error('cause')
    expect(format(err)).toStrictEqual({
      error: {
        code: 'ERR_TEST',
        cause: {
          error: {
            message: 'cause',
            stack: expect.stringMatching(/_callCircusTest(?!_runTestsForDescribeBlock)/m),
            kind: 'Error'
          }
        },
        details: { foo: 'bar' },
        message: err.message,
        stack: expect.stringMatching(/_callCircusTest(?!_runTestsForDescribeBlock)/m),
        kind: 'ErrorWithDetails'
      }
    })
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
