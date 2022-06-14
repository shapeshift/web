// eslint-disable no-console
import { Logger, LoggerFunction, LogLevel } from '@shapeshiftoss/logger'
import { getConfig } from 'config'

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

export const logger = new Logger({
  name: 'App',
  level: getConfig().REACT_APP_LOG_LEVEL,
  logFn: browserLoggerFn,
})
