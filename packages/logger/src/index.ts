import Logger from './logger'
import { LoggerOptions } from './logger.type'

export { LogLevel } from './logger.type'

export const loggerFactory = (options?: LoggerOptions) => new Logger(options)
export { default as Logger } from './logger'
