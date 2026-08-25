import { queryClient } from '@/context/QueryClientProvider/queryClient'

// All keyed on the device id, which a passphrase does not change, and all kept indefinitely -
// so none of them survive a wallet whose seed may have
const SEED_DEPENDENT_QUERY_KEYS = [
  ['useDiscoverAccounts'],
  ['accountIdWithActivityAndMetadata'],
  ['evm-address'],
  ['batch-evm-addresses'],
  ['batch-solana-addresses'],
  ['batch-utxo-pubkeys'],
]

// Only what has settled: a pass already running is deriving against the seed we are clearing
// for, and removing it would orphan it and start a second one against the device
export const clearAccountCaches = () =>
  SEED_DEPENDENT_QUERY_KEYS.forEach(queryKey =>
    queryClient.removeQueries({ queryKey, fetchStatus: 'idle' }),
  )
