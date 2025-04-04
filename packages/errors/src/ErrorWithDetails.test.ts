import { describe, expect, it } from 'vitest'

import { ErrorWithDetails } from './ErrorWithDetails'

describe('ErrorWithDetails', () => {
  it('should create an error with no message', () => {
    const e = new ErrorWithDetails()
    expect(e).toBeInstanceOf(ErrorWithDetails)
    expect(e.message).toBe('')
    expect(e.cause).toBeUndefined()
  })

  it('should create an error with a message', () => {
    const e = new ErrorWithDetails('test message')
    expect(e.message).toBe('test message')
    expect(e.cause).toBeUndefined()
  })

  it('should create an error with a message and a cause', () => {
    const cause = new TypeError('cause')
    const e = new ErrorWithDetails('test message', { cause })
    expect(e.message).toBe('test message')
    expect(e.cause).toBe(cause)
  })

  it('should create an error with a message and details', () => {
    const details = { prop: true }
    const e = new ErrorWithDetails('test message', { details })
    expect(e.message).toBe('test message')
    expect(e.cause).toBeUndefined()
    expect(e.details).toStrictEqual(details)
  })

  it('should clone details object', () => {
    const details = { prop: true, deepProp: { prop2: true } }
    const e = new ErrorWithDetails('test message', { details })
    expect(e.message).toBe('test message')
    expect(e.cause).toBeUndefined()
    expect(e.details).not.toBe(details)
    // e.details should be a clone of details to avoid mutation of the original object
    expect(e.details).toStrictEqual(details)
    details.deepProp.prop2 = false
    expect(e.details).not.toStrictEqual(details)
  })

  it('should support typed cause', () => {
    const cause = 'String Error'
    const e = new ErrorWithDetails<{ cause: string }>('test message', { cause })
    expect(e.message).toBe('test message')
    expect(e.cause).toBe(cause)
    // Check that TypeScript sees e.cause as a string so there's no type error
    expect(e.cause.toLowerCase()).toBe('string error')
  })

  it('should error on mismatched typed cause', () => {
    const cause = 'String Error'
    // @ts-expect-error
    const e = new ErrorWithDetails<{ cause: Error }>('test message', { cause })
    expect(e.message).toBe('test message')
    expect(e.cause).toBe(cause)
    // Check that TypeScript sees e.cause as a string so there's no type error
    // @ts-expect-error
    expect(e.cause.toLowerCase()).toBe('string error')
  })

  it('should ignore unknown properties in options object', () => {
    const e = new ErrorWithDetails('test message')

    expect(e).toHaveProperty('stack')
    expect(e).toHaveProperty('message', 'test message')
    expect(e).toHaveProperty('name', 'ErrorWithDetails')
    expect(e).toHaveProperty('cause', undefined)
    expect(e).toHaveProperty('details', undefined)
    expect(e).toHaveProperty('code', 'ERR_UNKNOWN')
  })

  it('should support an error code', () => {
    const e = new ErrorWithDetails('test message')
    // Default code
    expect(e.code).toBe('ERR_UNKNOWN')
    e.code = 'another_error'
    expect(e.code).toBe('ANOTHER_ERROR')

    const e2 = new ErrorWithDetails('test message', { code: 'ERR_test' })
    expect(e2.code).toBe('ERR_TEST')
  })

  it('should create an error with details', () => {
    const details = { foo: 'bar' }
    const e = new ErrorWithDetails('test message', { details })
    expect(e.message).toBe('test message')
    expect(e.details).toEqual(details)
    expect(e.code).toBe('ERR_UNKNOWN')
  })

  it('should support unknown typed cause', () => {
    const cause = 'string error'
    const e = new ErrorWithDetails('test message', { cause })
    expect(e.message).toBe('test message')
    expect(e.cause).toBe(cause)
  })
})
