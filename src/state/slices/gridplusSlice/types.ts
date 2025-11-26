export type SafeCard = {
  id: string
  name: string
  createdAt: number
  lastConnectedAt?: number
  walletUid?: string
  type?: 'external' | 'internal'
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
