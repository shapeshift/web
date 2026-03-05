import type { Swap } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'

export const getTxLinkStepSource = ({
  status,
  source,
  swapperName,
}: {
  status: TxStatus
  source?: Swap['source']
  swapperName: SwapperName
}): Swap['source'] | SwapperName | undefined => {
  if (status !== TxStatus.Unknown) return source

  if (swapperName === SwapperName.Chainflip) {
    return source ?? swapperName
  }

  return undefined
}
