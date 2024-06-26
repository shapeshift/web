import { Tag } from '@chakra-ui/react'
import type { TransferType } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import type { Transfer, TxDetails } from 'hooks/useTxDetails/useTxDetails'

type TransactionTagProps = {
  txDetails: TxDetails
  transfersByType: Record<TransferType, Transfer[]>
}
export const TransactionTag: React.FC<TransactionTagProps> = ({ txDetails, transfersByType }) => {
  const txData = useMemo(() => txDetails?.tx.data, [txDetails?.tx.data])
  const isNft = useMemo(() => {
    return Object.values(transfersByType)
      .flat()
      .some(transfer => !!transfer.id)
  }, [transfersByType])

  if (txData && txData.parser === 'ibc') {
    return (
      <Tag size='sm' colorScheme='blue' variant='subtle' lineHeight={1}>
        IBC
      </Tag>
    )
  }
  if (isNft) {
    return (
      <Tag size='sm' colorScheme='blue' variant='subtle' lineHeight={1}>
        NFT
      </Tag>
    )
  }
  if (txData && txData.parser === 'rfox') {
    return (
      <Tag size='sm' colorScheme='blue' variant='subtle' lineHeight={1}>
        rFOX
      </Tag>
    )
  }
  if (txData && txData.parser === 'arbitrumBridge') {
    return (
      <Tag size='sm' colorScheme='blue' variant='subtle' lineHeight={1}>
        Arbitrum Bridge
      </Tag>
    )
  }
  if (txData && txData.parser === 'thorchain' && txData.liquidity) {
    return (
      <Tag size='sm' colorScheme='green' variant='subtle' lineHeight={1}>
        {txData.liquidity.type}
      </Tag>
    )
  }
  if (txData && txData.parser === 'thorchain' && txData.swap?.type === 'Streaming') {
    return (
      <Tag size='sm' colorScheme='green' variant='subtle' lineHeight={1}>
        {txData.swap.type}
      </Tag>
    )
  }
  return null
}
