import { loggerFactory, Logger, LogLevel } from './index'

describe('Logger', () => {
  it('should export loggerFactory', () => {
    expect(loggerFactory).toBeInstanceOf(Function)
    expect(loggerFactory()).toBeInstanceOf(Logger)
  })

  it('should export Logger', () => {
    expect(Logger).toBeInstanceOf(Function)
  })

  it('should export LogLevel', () => {
    expect(LogLevel.NONE).toBe('none')
  })
})
