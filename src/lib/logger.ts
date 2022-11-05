// eslint-disable no-console
import type { LoggerFunction, LoggerOptions } from '@keepkey/logger'
import { Logger, LogLevel } from '@keepkey/logger'
import { getConfig } from 'config'
import { isMobile } from 'lib/globals'

type LogStyle = {
  title: string
  message: string
  icon: string
}

const logStyles: Record<Exclude<LogLevel, LogLevel.NONE>, LogStyle> = {
  [LogLevel.TRACE]: {
    title: 'background-color: #463373; color: #9F7AEA; padding: 4px 8px;',
    message: 'background-color: #29233f; color: white; padding: 4px 8px;',
    icon: '🚜',
  },
  [LogLevel.DEBUG]: {
    title: 'background-color: #295c5d; color: #38b2ac; padding: 4px 8px;',
    message: 'background-color: #1f3034; color: white; padding: 4px 8px;',
    icon: '🐞',
  },
  [LogLevel.INFO]: {
    title: 'background-color: #222f63; color: #6a96ec; padding: 4px 8px;',
    message: 'background-color: #1b2342; color: white; padding: 4px 8px;',
    icon: '💭',
  },
  [LogLevel.WARN]: {
    title: 'background-color: #332b00; color: #ECC94B; padding: 4px 8px;',
    message: 'background-color: #493107; color: white; padding: 4px 8px;',
    icon: '🚸',
  },
  [LogLevel.ERROR]: {
    title: 'background-color: #621616; color: #f5624b; padding: 4px 8px;',
    message: 'background-color: #460c0e; color: white; padding: 4px 8px;',
    icon: '🚫',
  },
}

/**
 * Custom log output function that formats logs for the browser console with CSS
 */
const browserLoggerFn: LoggerFunction = (level, data) => {
  const consoleFn = level === LogLevel.TRACE ? LogLevel.DEBUG : level

  const msg = data.error
    ? `Error [Kind: ${data.error.kind}] ${data.error.message} `
    : data._messages?.join(' ') || data.message

  // eslint-disable-next-line no-console
  console[consoleFn](
    `%c${logStyles[level].icon} ${level}: [${data.namespace}]%c${msg}`,
    logStyles[level].title,
    logStyles[level].message,
    data,
  )
}

/**
 * For use in the mobile app where colorized logging isn't supported
 */
const simpleLoggerFn: LoggerFunction = (level, data) => {
  const consoleFn = level === LogLevel.TRACE ? LogLevel.DEBUG : level

  const msg = data.error
    ? `Error [Kind: ${data.error.kind}] ${data.error.message} `
    : data._messages?.join(' ') || data.message

  // eslint-disable-next-line no-console
  console[consoleFn](
    `${logStyles[level].icon} ${level}: [${data.namespace}] ${msg}\n`,
    // In the webview, objects are rendered as "[object Object]" so we'll format it
    require('util').inspect(data),
  )
}

/**
 * Get the current log level configuration from local storage or from the environment
 *
 * We can't get the log level from the logger instance because it's stored in a private
 * variable that contains a numeric value.
 */
export const getLogLevel = () => {
  try {
    return globalThis.localStorage?.getItem?.('LOG_LEVEL') || getConfig().REACT_APP_LOG_LEVEL
  } catch (e) {
    return 'debug'
  }
}

/**
 * Instantiate a new Logger with some default options
 */
export const createLogger = (opts?: LoggerOptions) => {
  const options = {
    name: 'App',
    logFn: isMobile ? simpleLoggerFn : browserLoggerFn,
    level: getLogLevel(),
    ...opts,
  }
  const l = new Logger(options)
  l.debug({ options }, 'New Logger Created')
  return l
}

const LogLevelStrings = Object.values<string>(LogLevel)
const isValidLogLevel = (level: string): level is LogLevel => {
  return LogLevelStrings.includes(level)
}

/**
 * Save the specified LogLevel to LocalStorage
 */
export const saveLogLevel = (level: LogLevel | string) => {
  if (isValidLogLevel(level)) {
    try {
      globalThis.localStorage?.setItem?.('LOG_LEVEL', level)
      return true
    } catch (e) {
      logger.error(e, { fn: 'saveLogLevel', level }, 'Error persisting LOG_LEVEL to LocalStorage')
    }
  }

  return false
}

export const logger = createLogger()

/*
 DOCUMENTATION

 # Why
 The purpose of this logger is to allow us to log out information in a structured way that
 makes debugging easier by allowing us to more easily filter and search logs.

 # Best Practices
 For consistency, everyone is asked to follow some patterns for logging.

 1. Always `import { logger } from 'lib/logger'`

    - This allows us to leverage the custom logger output function that's in that file

 2. Always create a `moduleLogger` instance (see below)

    - The logger supports namespacing and shows the namespace in the log entry.
      By following this pattern we can make sure logs show which file they are coming from

    ```ts
    // In the file 'src/plugins/cosmos/MyComponent.tsx', outside the component function:
    const moduleLogger = logger.child({ namespace: ['Plugins', 'Cosmos', 'MyComponent'] })

    const MyComponent = () => {
      moduleLogger.trace('Render')

      return <></>
    }
    ```

    - In the file, call `moduleLogger.debug('Test')`

 3. When making multiple logging calls within a single function, consider making a `fnLogger`

    - A child logger inherits the parents properties but also allows you to provide data that
      always gets logged out (default values).

    - This is useful for including the name of the function or function arguments in all logs

    ```
    const myFunction = (arg1: string) => {
      const fnLogger = moduleLogger.child({ namespace: ['myFunction'], arg1 })
      const fnLogger.trace('myFunction Called')

      try {
        throwingFn('test')
      } catch (e) {
        fnLogger.error(e, 'Doing The Thing Failed')
      }
    }
    ```

 4. Always call the logger with arguments in this order:

   1. Error
   2. Object of data to be logged (e.g., { arg1, someLocalValue })
   3. String message

   Examples:
   ```
   logger.error(e, { fn: 'getMarketData', chain }, 'Get Market Data Failed')
   logger.error(e, 'Bad things')
   logger.warn(e, 'Not that bad but bad enough')
   logger.warn({ chain, network }, 'Invalid chain. Using some default value instead.')
   logger.info({ usefulInfo }, 'This is useful information!')
   logger.debug({ param1, param2, param3 }, 'Here is what the parameters look like')
   logger.debug('The thing happened')
   logger.trace('HERE!')
   ```

 5. Log out variables in an object rather than a template string

   Bad:  `logger.info(`Using ${chain} as the ChainAdapter`)
   Good: `logger.info({ chain }, 'Using ChainAdapter')

 6. Use `trace` debugging in complex code

   - Feel free to litter the code with `trace` logging especially in complex code that
     may need to be debugged later. Tracing is off in production by default.

   ```
   const myFunction = (arg1: string, arg2: string) => {
     const fnLogger = moduleLogger.child({ namespace: ['myFunction'] })
     fnLogger.trace({ arg1, arg2 }, 'myFunction called')

     const bn1 = bnOrZero(arg1).times(10)
     const bn2 = bn1.div(arg2).toPrecision(2)
     fnLogger.trace({ bn1, bn2 }, 'Calculate BigNumber values')

     if (bn1.gt(0) && bn2.gt(0)) return bn1.plus(bn2)

     fnLogger.warn({ bn1, bn2 }, 'Invalid values')

     return bn(0)
   }

 7. Available functions:

   Logging:
   ```
   logger.trace()
   logger.debug()
   logger.info()
   logger.warn()
   logger.error()
   ```

   Other:
   ```
   logger.child()
   logger.isLogger (property, not function)
   ```
 */
