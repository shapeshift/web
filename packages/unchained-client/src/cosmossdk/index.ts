import * as cosmos from './cosmos'
import * as thorchain from './thorchain'

export * as types from './types'
export * from './parser'

export type Api = cosmos.V1Api | thorchain.V1Api

export { cosmos, thorchain }
