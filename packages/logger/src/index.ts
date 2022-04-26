import Logger from './logger'
import { LoggerOptions } from './logger.type'

export { LogData, LogLevel, LoggerFunction, LoggerOptions, FormattedError } from './logger.type'

export const loggerFactory = (options?: LoggerOptions) => new Logger(options)
export { default as Logger } from './logger'
