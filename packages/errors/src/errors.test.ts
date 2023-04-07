import { ErrorWithDetails } from './ErrorWithDetails'
import { ForbiddenError } from './ForbiddenError'
import { NotFoundError } from './NotFoundError'
import { RateLimitError } from './RateLimitError'
import { UnauthorizedError } from './UnauthorizedError'
import { ValidationError } from './ValidationError'

describe.each`
  TestError            | code
  ${ErrorWithDetails}  | ${'ERR_UNKNOWN'}
  ${ForbiddenError}    | ${'ERR_FORBIDDEN'}
  ${NotFoundError}     | ${'ERR_NOT_FOUND'}
  ${RateLimitError}    | ${'ERR_RATE_LIMIT'}
  ${UnauthorizedError} | ${'ERR_UNAUTHORIZED'}
  ${ValidationError}   | ${'ERR_VALIDATION'}
`('$TestError.name', ({ TestError, code }) => {
  it('should create an error with no message', () => {
    const e = new TestError()
    expect(e).toBeInstanceOf(TestError)
    expect(e.message).toBe('')
    expect(e.cause).toBeUndefined()
  })

  it('should create an error with a message', () => {
    const e = new TestError('test message')
    expect(e.message).toBe('test message')
    expect(e.cause).toBeUndefined()
  })

  it('should create an error with a message and a cause', () => {
    const cause = new TypeError('cause')
    const e = new TestError('test message', { cause })
    expect(e.message).toBe('test message')
    expect(e.cause).toBe(cause)
  })

  it('should create an error with a message and details', () => {
    const details = { prop: true }
    const e = new TestError('test message', { details })
    expect(e.message).toBe('test message')
    expect(e.cause).toBeUndefined()
    expect(e.details).toStrictEqual(details)
  })

  it('should clone details object', () => {
    const details = { prop: true, deepProp: { prop2: true } }
    const e = new TestError('test message', { details })
    expect(e.message).toBe('test message')
    expect(e.cause).toBeUndefined()
    expect(e.details).not.toBe(details)
    // e.details should be a clone of details to avoid mutation of the original object
    expect(e.details).toStrictEqual(details)
    details.deepProp.prop2 = false
    expect(e.details).not.toStrictEqual(details)
  })

  it('should ignore unknown properties in options object', () => {
    const cause = new TypeError('cause')
    const e = new TestError('test message', { cause, stuff: { arg1: 'foo' } })
    expect(e.message).toBe('test message')
    expect(e.cause).toBe(cause)
    expect(Object.getOwnPropertyNames(e)).toStrictEqual(['stack', 'message', 'name', 'cause'])
  })

  it(`should have a default error code of ${code}`, () => {
    const e = new TestError('test message', { code })
    expect(e.code).toBe(code)
  })

  it(`should support a custom error code`, () => {
    const e = new TestError('test message', { code: 'my error' })
    expect(e.code).toBe('MY_ERROR')

    e.code = 'second-Error'
    expect(e.code).toBe('SECOND_ERROR')
  })
})
