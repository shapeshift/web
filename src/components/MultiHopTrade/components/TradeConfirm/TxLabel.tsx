import { Link } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { SwapSource } from '@shapeshiftoss/swapper'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'

export const TxLabel = ({
  txHash,
  explorerBaseUrl,
  accountId,
  swapperName,
}: {
  txHash: string
  explorerBaseUrl: string
  accountId: AccountId
  swapperName: SwapSource | undefined
}) => {
  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId,
  })

  const txLink = getTxLink({
    defaultExplorerBaseUrl: explorerBaseUrl,
    maybeSafeTx,
    tradeId: txHash,
    accountId,
    name: swapperName,
  })

  return txLink ? (
    <Link isExternal href={txLink} color='text.link'>
      <MiddleEllipsis value={maybeSafeTx?.transaction?.transactionHash ?? txHash} />
    </Link>
  ) : null
}
