import { TxStatus } from '@shapeshiftoss/unchained-client'
import { poll } from 'lib/poll/poll'
import { getThorchainTransactionStatus } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

export const waitForThorchainUpdate = (txHash: string) =>
  poll({
    fn: () => getThorchainTransactionStatus(txHash),
    validate: status => Boolean(status && status === TxStatus.Confirmed),
    interval: 60000,
    maxAttempts: 10,
  })
