import { createQueryKeys } from '@lukemorales/query-key-factory'

import {
  cfAccountInfoV2,
  cfFreeBalances,
  cfLendingConfig,
  cfLendingPools,
  cfLendingPoolSupplyBalances,
  cfLoanAccounts,
  cfOraclePrices,
  cfSafeModeStatuses,
  stateGetRuntimeVersion,
} from '@/lib/chainflip/rpc'

export const chainflipLending = createQueryKeys('chainflipLending', {
  lendingPools: () => ({
    queryKey: ['lendingPools'],
    queryFn: () => cfLendingPools(),
  }),
  lendingConfig: () => ({
    queryKey: ['lendingConfig'],
    queryFn: () => cfLendingConfig(),
  }),
  supplyBalances: (scAccountId: string) => ({
    queryKey: ['supplyBalances', scAccountId],
    queryFn: () => cfLendingPoolSupplyBalances(scAccountId),
  }),
  freeBalances: (scAccountId: string) => ({
    queryKey: ['freeBalances', scAccountId],
    queryFn: () => cfFreeBalances(scAccountId),
  }),
  loanAccounts: (scAccountId: string) => ({
    queryKey: ['loanAccounts', scAccountId],
    queryFn: () => cfLoanAccounts(scAccountId),
  }),
  oraclePrices: () => ({
    queryKey: ['oraclePrices'],
    queryFn: () => cfOraclePrices(),
  }),
  safeModeStatuses: () => ({
    queryKey: ['safeModeStatuses'],
    queryFn: () => cfSafeModeStatuses(),
  }),
  runtimeVersion: () => ({
    queryKey: ['runtimeVersion'],
    queryFn: () => stateGetRuntimeVersion(),
  }),
  accountInfo: (scAccountId: string) => ({
    queryKey: ['accountInfo', scAccountId],
    queryFn: () => cfAccountInfoV2(scAccountId),
  }),
})
