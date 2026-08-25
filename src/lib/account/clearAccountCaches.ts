import { queryClient } from '@/context/QueryClientProvider/queryClient'

// All keyed on the device id, which a passphrase does not change
const SEED_DEPENDENT_QUERY_KEYS = [
  ['useDiscoverAccounts'],
  ['accountIdWithActivityAndMetadata'],
  ['evm-address'],
  ['batch-evm-addresses'],
  ['batch-solana-addresses'],
  ['batch-utxo-pubkeys'],
]

// Settled only - a running pass derives against the new seed, and removing it starts a second one
export const clearAccountCaches = () =>
  SEED_DEPENDENT_QUERY_KEYS.forEach(queryKey =>
    queryClient.removeQueries({ queryKey, fetchStatus: 'idle' }),
  )
