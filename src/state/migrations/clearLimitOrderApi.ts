import type { PersistPartial } from 'redux-persist/es/persistReducer'

import { limitOrderApi } from '@/state/apis/limit-orders/limitOrderApi'

export const clearLimitOrderApi = (_state: unknown) =>
  limitOrderApi.reducer(undefined, { type: 'clearLimitOrderApi' }) as ReturnType<
    typeof limitOrderApi.reducer
  > &
    PersistPartial
