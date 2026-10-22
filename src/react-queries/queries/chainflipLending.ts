import { createQueryKeys } from '@lukemorales/query-key-factory'

import { queryLendingPoolStats } from '@/lib/chainflip/lpServiceApi'
import {
  cfAccountInfo,
  cfEnvironment,
  cfFreeBalances,
  cfLendingConfig,
  cfLendingPools,
  cfLendingPoolSupplyBalances,
  cfLoanAccounts,
  cfOraclePrices,
  cfSafeModeStatuses,
  stateGetRuntimeVersion,
} from '@/lib/chainflip/rpc'
import type { ChainflipAsset, ChainflipAssetSymbol } from '@/lib/chainflip/types'

export const chainflipLending = createQueryKeys('chainflipLending', {
  environment: () => ({
    queryKey: ['environment'],
    queryFn: () => cfEnvironment(),
  }),
  lendingPools: () => ({
    queryKey: ['lendingPools'],
    queryFn: () => cfLendingPools(),
  }),
  lendingConfig: () => ({
    queryKey: ['lendingConfig'],
    queryFn: () => cfLendingConfig(),
  }),
  supplyBalances: (asset: ChainflipAsset) => ({
    queryKey: ['supplyBalances', asset],
    queryFn: () => cfLendingPoolSupplyBalances(asset),
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
    queryFn: () => cfAccountInfo(scAccountId),
  }),
  // sinceIso: ISO 8601 date string computed by the caller from a UI window key
  lendingPoolStats: (asset: ChainflipAssetSymbol, sinceIso: string) => ({
    queryKey: ['lendingPoolStats', asset, sinceIso],
    queryFn: () => queryLendingPoolStats(asset, new Date(sinceIso)),
  }),
})
