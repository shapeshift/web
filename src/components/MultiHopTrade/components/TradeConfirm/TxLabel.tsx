import { Link } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { SwapSource } from '@shapeshiftoss/swapper'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { useChainflipSwapIdQuery } from 'hooks/queries/useChainflipSwapIdQuery'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'

export const TxLabel = ({
  txHash,
  explorerBaseUrl,
  accountId,
  swapperName,
  isBuyTxHash,
}: {
  txHash: string
  explorerBaseUrl: string
  accountId: AccountId
  swapperName: SwapSource | undefined
  isBuyTxHash?: boolean
}) => {
  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId,
  })

  const { data: maybeChainflipSwapId } = useChainflipSwapIdQuery({
    txHash,
    swapperName,
  })

  const txLink = getTxLink({
    defaultExplorerBaseUrl: explorerBaseUrl,
    maybeSafeTx,
    accountId,
    name: swapperName,
    ...(isBuyTxHash ? { txId: txHash } : { tradeId: txHash }),
    maybeChainflipSwapId,
  })

  return txLink ? (
    <Link isExternal href={txLink} color='text.link'>
      <MiddleEllipsis value={maybeSafeTx?.transaction?.transactionHash ?? txHash} />
    </Link>
  ) : null
}
