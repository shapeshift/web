import { Link } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { getTxLink } from '@/lib/getTxLink'

export const TxLabel = ({
  txHash,
  explorerBaseUrl,
  accountId,
}: {
  txHash: string
  explorerBaseUrl: string
  accountId: AccountId
}) => {
  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId,
  })

  const txLink = getTxLink({
    explorerBaseUrl,
    maybeSafeTx,
    address: fromAccountId(accountId).account,
    chainId: fromAccountId(accountId).chainId,
    txId: txHash,
  })

  return txLink ? (
    <Link isExternal href={txLink} color='text.link'>
      <MiddleEllipsis value={maybeSafeTx?.transaction?.transactionHash ?? txHash} />
    </Link>
  ) : null
}
