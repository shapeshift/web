import { Logger } from './logger';
import type { LoggerOptions } from './logger.type';
export { Logger } from './logger';
export { LogLevel } from './logger.type';
export type { LogData, LoggerFunction, LoggerOptions, FormattedError } from './logger.type';
export declare const loggerFactory: (options?: LoggerOptions) => Logger;
