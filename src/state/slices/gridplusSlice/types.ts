export type SafeCard = {
  id: string
  name: string
  verificationAddress?: string
  createdAt: number
  lastConnectedAt?: number
}

export type GridPlusConnection = {
  physicalDeviceId: string | null
  privKey: string | null
}

export type GridPlusState = {
  connection: GridPlusConnection
  safecards: {
    byId: Record<string, SafeCard>
    ids: string[]
    activeId: string | null
  }
}
