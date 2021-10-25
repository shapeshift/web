/* eslint-disable @typescript-eslint/ban-ts-comment */
import Logger from './logger'
import { LogLevel } from './logger.type'

describe('Logger', () => {
  let dateSpy: jest.SpyInstance
  beforeAll(
    () =>
      (dateSpy = jest
        .spyOn(Date.prototype, 'toISOString')
        // We need to mock toISOString so the logs will be the same every run
        .mockImplementation(() => '2020-01-01T00:00:00Z'))
  )
  afterAll(() => dateSpy.mockRestore())

  describe('constructor', () => {
    it('should set logger name and level', () => {
      let logger
      expect(() => {
        logger = new Logger({
          name: 'testLogger',
          level: LogLevel.TRACE
        })
      }).not.toThrow()
      const expected = expect.objectContaining({
        info: expect.any(Function),
        trace: expect.any(Function),
        debug: expect.any(Function)
      })
      expect(logger).toEqual(expected)
    })

    it('should accept "namespace" as a string', () => {
      const spy = jest.spyOn(console, 'info')
      const logger = new Logger({ namespace: 'testLogger' })
      logger.info('test')
      expect(spy).toHaveBeenCalledWith(expect.stringMatching('namespace":"testLogger"'))
      spy.mockRestore()
    })

    it('should accept "namespace" as an array', () => {
      const spy = jest.spyOn(console, 'info')
      const logger = new Logger({ namespace: ['testLogger', 'child'] })
      logger.info('test')
      expect(spy).toHaveBeenCalledWith(expect.stringMatching('namespace":"testLogger:child"'))
      spy.mockRestore()
    })

    it('should accept "namespace" and "name" at the same time', () => {
      const spy = jest.spyOn(console, 'info')
      const logger = new Logger({ namespace: ['testLogger', 'child'], name: 'child2' })
      logger.info('test')
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching('namespace":"testLogger:child:child2"')
      )
      spy.mockRestore()
    })

    it('should accept default log level as an enum', () => {
      const spy = jest.spyOn(console, 'debug')
      const logger = new Logger({ level: LogLevel.DEBUG })
      logger.debug('test')
      expect(spy).toHaveBeenCalled()
      // @ts-ignore
      expect(logger.level).toBe(1)
      spy.mockRestore()
    })

    it('should accept default log level as a string', () => {
      const spy = jest.spyOn(console, 'debug')
      const logger = new Logger({ level: 'debug' })
      logger.debug('test')
      expect(spy).toHaveBeenCalled()
      // @ts-ignore
      expect(logger.level).toBe(1)
      spy.mockRestore()
    })

    it('should throw an error if log level is invalid', () => {
      expect(() => new Logger({ level: 'silly' })).toThrowError('logging level')
    })

    it('should disable logging if LogLevel is NONE', () => {
      const spy = jest.spyOn(console, 'debug')
      const logger = new Logger({ level: LogLevel.NONE })
      logger.trace('test')
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('should allow for an empty namespace', () => {
      const spy = jest.spyOn(console, 'info')
      // No constructor arguments
      const logger = new Logger()
      logger.info('test')
      expect(spy).toHaveBeenCalledWith(
        '{"message":"test","timestamp":"2020-01-01T00:00:00Z","status":"info"}'
      )
      spy.mockRestore()
    })
  })

  describe('Logger functions', () => {
    const name = 'testLogger'
    const message = 'app listening on port 3000'
    const data = { id: 3 }
    const error = new Error('Oh no! Something went wrong.')
    let logger: Logger
    beforeEach(() => {
      logger = new Logger({ name, level: LogLevel.TRACE, defaultFields: { default: true } })
    })

    it('should have isLogger property', () => {
      expect(logger.isLogger).toBe(true)
    })

    describe('.info(...x: any[])', () => {
      it.each([
        [
          [message],
          '{"default":true,"message":"app listening on port 3000","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info"}'
        ],
        [
          [data, message],
          '{"default":true,"id":3,"message":"app listening on port 3000","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info"}'
        ],
        [
          [error, data, message],
          /"default":true,"error":{"message":"Oh no! Something went wrong.","stack":"Error: Oh no! Something went wrong\..*"timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info"}/
        ]
      ])('should print the formatted log', (x, expected) => {
        const spy = jest.spyOn(console, 'info').mockReturnValue(undefined)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        logger.info(x[0], x[1], x[2])

        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(expect.stringMatching(expected))
        spy.mockRestore()
      })
    })

    describe('.child(...x: any[])', () => {
      let spy: jest.SpyInstance
      beforeAll(() => (spy = jest.spyOn(console, 'info').mockReturnValue(undefined)))
      beforeEach(() => spy.mockClear())
      afterAll(() => spy.mockRestore())

      it('should pass through the log level of the parent', () => {
        const traceSpy = jest.spyOn(console, 'debug').mockReturnValue(undefined)
        logger.child({ name: 'info' }).trace('child')
        expect(traceSpy).toHaveBeenCalledWith(expect.stringMatching(/"status":"trace"/))
        traceSpy.mockRestore()
      })

      it('should override the log level of the parent', () => {
        const traceSpy = jest.spyOn(console, 'debug').mockReturnValue(undefined)
        logger.child({ name: 'info', level: LogLevel.WARN }).trace('child')
        expect(traceSpy).not.toHaveBeenCalled()
        expect(spy).not.toHaveBeenCalled()
        logger.trace('parent')
        expect(traceSpy).toHaveBeenCalledWith(expect.stringMatching(/parent/))
        traceSpy.mockRestore()
      })

      it('should include child keys', () => {
        logger.child({ foo: 'bar' }).info('something')
        const expected =
          '{"default":true,"foo":"bar","message":"something","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info"}'
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(expected)
      })

      it('should include grandchild keys', () => {
        logger
          .child({ foo: 'bar' })
          .child({ zan: ':)' })
          .info('something')
        const expected =
          '{"default":true,"foo":"bar","zan":":)","message":"something","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info"}'
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(expected)
      })

      it('should add to the namespace from "name" and "namespace"', () => {
        logger
          .child({ name: 'foo' })
          .child({ namespace: 'bar' })
          .child({ namespace: ['deep', 'deeper'], name: 'last' })
          .info('something')
        const expected =
          '{"default":true,"message":"something","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger:foo:bar:deep:deeper:last","status":"info"}'
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(expected)
      })

      it("should use parent namespace if new namespace isn't provided", () => {
        logger.child().info('something')
        const expected =
          '{"default":true,"message":"something","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info"}'
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(expected)
      })
    })

    describe('.trace(x: object, msg: string)', () => {
      it('should log an object and message', () => {
        // console.trace outputs stack traces, so we use debug instead
        const spy = jest.spyOn(console, 'debug').mockReturnValue(undefined)
        logger.trace({ foo: 'bar' }, 'message')
        expect(spy).toHaveBeenCalledWith(
          '{"default":true,"foo":"bar","message":"message","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"trace"}'
        )
        spy.mockRestore()
      })

      it('should throw a validation error', () => {
        // @ts-ignore
        expect(() => logger.trace([])).toThrowError(Error)
      })
    })

    describe.each([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR])(
      '.%s(x: object, msg: string)',
      (level) => {
        it('should log an object and message', () => {
          // @ts-ignore
          const spy = jest.spyOn(console, level).mockReturnValue(undefined)
          // @ts-ignore
          logger[level]({ foo: 'bar' }, 'message')
          expect(spy).toHaveBeenCalledWith(
            `{"default":true,"foo":"bar","message":"message","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"${level}"}`
          )
          spy.mockRestore()
        })

        it('should throw a validation error', () => {
          // @ts-ignore
          expect(() => logger[level]([])).toThrowError(Error)
        })
      }
    )

    it('should allow for multiple string arguments', () => {
      const spy = jest.spyOn(console, 'info').mockReturnValue(undefined)
      // @ts-ignore - this test is for when we expect an Error but get a string, maybe in a JS project
      logger.info('some unexpected error as a string', 'another', 'message')
      expect(spy).toHaveBeenCalledWith(
        '{"default":true,"message":"message","timestamp":"2020-01-01T00:00:00Z","namespace":"testLogger","status":"info","_messages":["some unexpected error as a string","another","message"]}'
      )
      spy.mockRestore()
    })
  })
})
