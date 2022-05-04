// eslint-disable no-console
import { Logger, LoggerFunction, LogLevel } from '@shapeshiftoss/logger'

import { getConfig } from '../config'

const logLevelCSS: Record<Exclude<LogLevel, LogLevel.NONE>, string> = {
  [LogLevel.TRACE]: 'background-color: blue; color: white;',
  [LogLevel.DEBUG]: 'background-color: cyan; color: black;',
  [LogLevel.INFO]: 'background-color: green; color: white;',
  [LogLevel.WARN]: 'background-color: yellow; color: black;',
  [LogLevel.ERROR]: 'background-color: red; color: white;',
}

const logMessageCSS: Record<Exclude<LogLevel, LogLevel.NONE>, string> = {
  [LogLevel.TRACE]: 'background-color: lightblue; color: darkblue;',
  [LogLevel.DEBUG]: 'background-color: lightcyan; color: darkcyan;',
  [LogLevel.INFO]: 'background-color: lightgreen; color: darkgreen;',
  [LogLevel.WARN]: 'background-color: lightyellow; color: darkyellow',
  [LogLevel.ERROR]: 'background-color: lightred; color: red;',
}

const __console = { ...console }

const browserLoggerFn: LoggerFunction = (level, data) => {
  const consoleFn = level === LogLevel.TRACE ? LogLevel.DEBUG : level
  let msg = data._messages?.join(' ') || data.message

  if (data.error) {
    msg = `Error [Kind: ${data.error.kind}]${
      data.error.code ? ` [Code: ${data.error?.code}]` : ''
    } ${data.error.message} `
  }

  __console[consoleFn](
    `%c ${level}: [${data.namespace}] %c ${msg}`,
    logLevelCSS[level],
    logMessageCSS[level],
    data,
  )
}

export const logger = new Logger({
  name: 'App',
  level: getConfig().REACT_APP_LOG_LEVEL,
  logFn: browserLoggerFn,
})

const consoleReplacementLogger = logger.child({ namespace: ['Console'] })

// @ts-expect-error
console.error = (...args) => consoleReplacementLogger.error(...args)
// @ts-expect-error
console.warn = (...args) => consoleReplacementLogger.warn(...args)
// @ts-expect-error
console.info = (...args) => consoleReplacementLogger.info(...args)
