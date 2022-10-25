/**
 * This is not an exhaustive list of possible initialization parameters. See
 * the agent code and associated documentation for more details.
 */
export interface PendoInitializeParams {
  visitor?: {
    id?: string
  }
  sanitizeUrl?(url: string): string
  events?: {
    ready?(): void
    deliverablesLoaded?(): void
    guidesFailed?(): void
    guidesLoaded?(): void
    validateGuide?(signatureString: string): Promise<boolean>
    validateLauncher?(signatureString: string): Promise<boolean>
    validateGlobalScript?(data: string): Promise<boolean>
  }
}

/**
 * This is very similar to PendoInitializeParams, but represents the parameter
 * of the agent's embedded IIFE.
 */
export type PendoConfig = Record<string, unknown> & { apiKey: string }

export type PendoStorage = Map<string, unknown>

export type PendoStorageWrapper = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type PendoEnv = {
  PendoConfig: PendoConfig
  pendo: Pendo
  expectedResponseKeys: string[]
  compressMap: Map<string, object>
  transmissionLog: Record<string, unknown>[]
  cookieStorage: PendoStorage
  cookieStorageWrapper: PendoStorageWrapper
  localStorage: PendoStorage
  localStorageWrapper: PendoStorageWrapper
  sessionStorage: PendoStorage
  sessionStorageWrapper: PendoStorageWrapper
  get sealed(): boolean
  unseal(): void
}

export type FixupTable = {
  fixups: Record<number, string>
  makeFixupHelpers(env: PendoEnv): Record<string, unknown>
}

export type AgentParseResult = {
  /** A PendoConfig object containing server-specified configuration values
   * merged with any local overrides. */
  PendoConfig: PendoConfig
  /** The set of fixup helpers which match the fixups applied. */
  makeFixupHelpers: FixupTable['makeFixupHelpers']
  /** A blob URL which resolves to the parsed agent. */
  src: string
  /** The integrity value of the blob URL. */
  integrity: string
}

export interface Pendo {
  VERSION?: string
  _q: unknown[]
  initialize(params: PendoInitializeParams): void
  identify(): void
  updateOptions(): void
  pageLoad(): void
  // https://developers.pendo.io/docs/?bash#track-events
  track(trackType: string, metadata?: Record<string, unknown>): void
}

export interface Window {
  pendo?: Pendo
  pendoEnv?: PendoEnv
  pendoFixupHelpers?: Record<string, unknown>
}
