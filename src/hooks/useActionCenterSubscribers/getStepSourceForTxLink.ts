import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'

export const getStepSourceForTxLink = ({
  status,
  swapperName,
  source,
}: {
  status: TxStatus | undefined
  swapperName: SwapperName
  source: Swap['source'] | undefined
}) => {
  if (status === TxStatus.Unknown) {
    return swapperName === SwapperName.Chainflip ? source ?? SwapperName.Chainflip : undefined
  }

  return source
}
