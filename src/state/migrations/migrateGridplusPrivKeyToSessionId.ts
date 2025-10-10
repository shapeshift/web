import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { GridPlusState } from '@/state/slices/gridplusSlice/types'

type LegacyGridPlusState = {
  connection: {
    physicalDeviceId: string | null
    privKey: string | null
  }
  safecards: {
    byId: Record<string, any>
    ids: string[]
    activeId: string | null
  }
}

export const migrateGridplusPrivKeyToSessionId = (
  state: LegacyGridPlusState & PersistPartial,
): GridPlusState & PersistPartial => {
  const { connection, safecards } = state

  return {
    connection: {
      physicalDeviceId: connection.physicalDeviceId,
      sessionId: (connection as any).privKey ?? null,
    },
    safecards,
    _persist: state._persist,
  }
}
