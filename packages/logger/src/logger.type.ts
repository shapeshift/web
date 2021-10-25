export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NONE = 'none'
}

export interface LoggerOptions {
  name?: string
  namespace?: string | string[]
  level?: LogLevel | string
  defaultFields?: Record<string, unknown>
}

export type Arg1 = Error | Arg2
export type Arg2 = Record<string, unknown> | Arg3
export type Arg3 = string

export type LoggerMethod =
  | ((arg1: Arg1, arg2?: Arg2, arg3?: Arg3) => void)
  | ((message: string) => void)
  | ((fields: Record<string, unknown>, message: string) => void)
  | ((e: Error, fields: Record<string, unknown>, message: string) => void)
  | ((e: Error, message: string) => void)

// return values are any instead of void because
// if they return the value provided then the
// logger is composable
export interface LoggerMethods {
  error: LoggerMethod
  warn: LoggerMethod
  info: LoggerMethod
  debug: LoggerMethod
  trace: LoggerMethod
}

export interface LoggerExtended {
  isLogger: true
  child(...x: unknown[]): LoggerT
}

export type LoggerT = LoggerMethods & LoggerExtended

export interface FormattedError {
  message: string
  stack?: string
  kind: string
}

export interface FormattedObject {
  message?: string
  error?: FormattedError
  [k: string]: unknown
}
