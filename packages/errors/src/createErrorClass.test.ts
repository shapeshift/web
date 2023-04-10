import { inspect } from 'util'

import { createErrorClass } from './createErrorClass'

describe('createErrorClass', () => {
  it('should create a new Error based on ErrorWithDetails', () => {
    const TestError = createErrorClass('TestError')
    expect(TestError).toBeInstanceOf(Function)
    expect(inspect(TestError)).toBe('[class TestError extends ErrorWithDetails]')
    expect(new TestError('message')).toBeInstanceOf(TestError)
  })

  it('should create a new Error with typed details', () => {
    const TestError = createErrorClass<{ prop: boolean }>('TestError')
    expect(TestError).toBeInstanceOf(Function)
    expect(new TestError('message', { details: { prop: true } })).toBeInstanceOf(TestError)
  })

  it('should create a new Error with cause', () => {
    const TestError = createErrorClass('TestError')
    const err = new TestError('message', { cause: { prop: true } })
    expect(err).toBeInstanceOf(TestError)
    expect(err.cause).toStrictEqual({ prop: true })
  })

  it('should create a new Error with cause and details', () => {
    const TestError = createErrorClass<{ prop: true }>('TestError')
    const err = new TestError('message', { details: { prop: true }, cause: new Error('test') })
    expect(err).toBeInstanceOf(TestError)
    expect(err.cause).toBeInstanceOf(Error)
    expect(err.cause.message).toBe('test')
    expect(err.details?.prop).toBe(true)
  })

  it('should create a new Error with a default error code based on the error name', () => {
    const E = createErrorClass('TestError')
    const err = new E('test')
    expect(err.code).toBe('ERR_TEST')
  })
})
