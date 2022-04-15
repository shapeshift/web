import { default as ErrorWithDetails } from './ErrorWithDetails'
import { default as ForbiddenError } from './ForbiddenError'
import { default as NotFoundError } from './NotFoundError'
import { default as RateLimitError } from './RateLimitError'
import { default as UnauthorizedError } from './UnauthorizedError'
import { default as ValidationError } from './ValidationError'

describe.each`
  TestError
  ${ErrorWithDetails}
  ${ForbiddenError}
  ${NotFoundError}
  ${RateLimitError}
  ${UnauthorizedError}
  ${ValidationError}
`('$TestError.name', ({ TestError }) => {
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
})
