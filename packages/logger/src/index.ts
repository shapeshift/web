import Logger from './logger'
import type { LoggerOptions } from './logger.type'

export { default as Logger } from './logger'
export { LogLevel } from './logger.type'
export type { LogData, LoggerFunction, LoggerOptions, FormattedError } from './logger.type'

export const loggerFactory = (options?: LoggerOptions) => new Logger(options)
