import { Link } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useChainflipSwapIdQuery } from '@/hooks/queries/useChainflipSwapIdQuery'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { getTxLink } from '@/lib/getTxLink'

export const TxLabel = ({
  txHash,
  explorerBaseUrl,
  accountId,
  stepSource,
  quoteSwapperName,
  isBuyTxHash,
  isBridge,
}: {
  txHash: string
  explorerBaseUrl: string
  accountId: AccountId
  stepSource: SwapSource | undefined
  quoteSwapperName: SwapperName | undefined
  isBuyTxHash?: boolean
  isBridge?: boolean
}) => {
  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId,
  })

  const { data: maybeChainflipSwapId } = useChainflipSwapIdQuery({
    txHash,
    swapperName: quoteSwapperName,
  })

  const txLink = getTxLink({
    defaultExplorerBaseUrl: explorerBaseUrl,
    maybeSafeTx,
    address: fromAccountId(accountId).account,
    chainId: fromAccountId(accountId).chainId,
    stepSource,
    ...(isBuyTxHash ? { txId: txHash } : { tradeId: txHash }),
    maybeChainflipSwapId,
    isBridge,
  })

  return txLink ? (
    <Link isExternal href={txLink} color='text.link'>
      <MiddleEllipsis value={maybeSafeTx?.transaction?.transactionHash ?? txHash} />
    </Link>
  ) : null
}
