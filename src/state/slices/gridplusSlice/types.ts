export type SafeCard = {
  id: string
  name: string
  createdAt: number
  lastConnectedAt?: number
  /**
   * The actual wallet UID from the GridPlus device (hex string).
   * This is the unique identifier for the wallet seed stored on the SafeCard or internal storage.
   * Added in migration 27 - will be undefined for legacy SafeCards until re-paired.
   */
  walletUid?: string
  /**
   * Whether this is an external (SafeCard) or internal wallet.
   * true = SafeCard, false = internal device wallet.
   * Added in migration 27 - will be undefined for legacy SafeCards until re-paired.
   */
  isExternal?: boolean
}

export type GridPlusConnection = {
  physicalDeviceId: string | null
  /**
   * Session identifier used to optimize reconnection.
   * When present, GridPlus SDK setup() is called without deviceId/password,
   * loading from localStorage instead. This avoids triggering the pairing
   * screen on the device and enables faster offline reconnection.
   */
  sessionId: string | null
}

export type GridPlusState = {
  connection: GridPlusConnection
  safecards: {
    byId: Record<string, SafeCard>
    ids: string[]
    activeId: string | null
  }
}
