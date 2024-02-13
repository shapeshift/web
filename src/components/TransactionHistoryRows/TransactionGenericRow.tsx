import { Flex, Tag } from '@chakra-ui/react'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import type { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText, Text } from 'components/Text'
import type { Fee, Transfer } from 'hooks/useTxDetails/useTxDetails'
import { Method } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

import { ApprovalAmount } from './TransactionDetails/ApprovalAmount'
import { TransactionTeaser } from './TransactionTeaser'
import { getTxMetadataWithAssetId } from './utils'

type TransactionGenericRowProps = {
  type: string
  status: TxStatus
  title?: string
  showDateAndGuide?: boolean
  compactMode?: boolean
  transfersByType: Record<TransferType, Transfer[]>
  fee?: Fee
  txid: TxId
  txData?: TxMetadata
  blockTime: number
  txLink: string
  toggleOpen: () => void
  parentWidth: number
}

export const TransactionGenericRow = ({
  type,
  status,
  title,
  transfersByType,
  txData,
  toggleOpen,
}: TransactionGenericRowProps) => {
  const txMetadataWithAssetId = useMemo(() => getTxMetadataWithAssetId(txData), [txData])

  const isNft = useMemo(() => {
    return Object.values(transfersByType)
      .flat()
      .some(transfer => !!transfer.id)
  }, [transfersByType])

  const hasManySends = useMemo(() => transfersByType.Send?.length > 1, [transfersByType.Send])
  const hasSendAndRecieve = useMemo(
    () => transfersByType.Send?.length > 0 && transfersByType.Receive?.length > 0,
    [transfersByType.Receive, transfersByType.Send],
  )
  const hasManyReceives = useMemo(
    () => transfersByType.Receive?.length > 1,
    [transfersByType.Receive],
  )
  const hasOnlyRecieve = useMemo(
    () => !transfersByType.Send && transfersByType.Receive?.length > 0,
    [transfersByType.Receive, transfersByType.Send],
  )
  const hasOnlySend = useMemo(
    () => transfersByType.Send?.length > 0 && !transfersByType.Receive,
    [transfersByType.Receive, transfersByType.Send],
  )

  const topLeft = useMemo(() => {
    const renderTag = (() => {
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
    })()
    return (
      <Flex alignItems='center' gap={2} justifyContent='space-between'>
        <Text
          color='text.subtle'
          translation={title ? title : `transactionRow.${type.toLowerCase()}`}
        />
        {renderTag}
      </Flex>
    )
  }, [isNft, title, txData, type])

  const topRight = useMemo(() => {
    if (hasManySends) {
      const assets = transfersByType.Send.map(transfer => transfer.asset.symbol)
      return <RawText color='text.subtle'>{assets.join('/')}</RawText>
    }
    if (hasSendAndRecieve) {
      const precision = transfersByType.Send[0].asset.precision ?? 0
      const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
      const symbol = transfersByType.Send[0].asset.symbol
      return (
        <Amount.Crypto
          color='text.subtle'
          value={amount}
          symbol={symbol}
          maximumFractionDigits={4}
          prefix='-'
          whiteSpace='nowrap'
        />
      )
    }
  }, [hasManySends, hasSendAndRecieve, transfersByType.Send])

  const bottomLeft = useMemo(() => {
    if (type === Method.Approve) {
      return <AssetSymbol fontWeight='bold' assetId={txMetadataWithAssetId?.assetId ?? ''} />
    }
    if (hasManyReceives) {
      return (
        <Flex gap={1} alignItems='center' fontWeight='bold'>
          <Tag size='sm' fontWeight='bold'>
            {transfersByType.Receive.length}x
          </Tag>
          <Text translation='transactionHistory.assets' />
        </Flex>
      )
    }
    if (hasSendAndRecieve || hasOnlyRecieve) {
      const symbol = transfersByType.Receive[0].asset.symbol
      return (
        <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
          {symbol}
        </RawText>
      )
    }
    if (hasOnlySend) {
      const symbol = transfersByType.Send[0].asset.symbol
      return (
        <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
          {symbol}
        </RawText>
      )
    }
  }, [
    hasManyReceives,
    hasOnlyRecieve,
    hasOnlySend,
    hasSendAndRecieve,
    transfersByType.Receive,
    transfersByType.Send,
    txMetadataWithAssetId?.assetId,
    type,
  ])

  const bottomRight = useMemo(() => {
    if (type === Method.Approve) {
      return (
        <ApprovalAmount
          assetId={txMetadataWithAssetId?.assetId ?? ''}
          value={txMetadataWithAssetId?.value ?? ''}
          parser={txMetadataWithAssetId?.parser}
          variant='tag'
        />
      )
    }
    if (hasManyReceives) {
      return undefined
    }
    if (hasSendAndRecieve || hasOnlyRecieve) {
      const precision = transfersByType.Receive[0].asset.precision ?? 0
      const amount = fromBaseUnit(transfersByType.Receive[0].value, precision)
      const symbol = transfersByType.Receive[0].asset.symbol
      return (
        <Amount.Crypto
          value={amount}
          symbol={symbol}
          color='text.success'
          prefix='+'
          maximumFractionDigits={4}
          whiteSpace='nowrap'
        />
      )
    }
    if (hasOnlySend) {
      const precision = transfersByType.Send[0].asset.precision ?? 0
      const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
      const symbol = transfersByType.Send[0].asset.symbol
      return (
        <Amount.Crypto
          value={amount}
          symbol={symbol}
          color='text.subtle'
          maximumFractionDigits={4}
          whiteSpace='nowrap'
        />
      )
    }
  }, [
    hasManyReceives,
    hasOnlyRecieve,
    hasOnlySend,
    hasSendAndRecieve,
    transfersByType.Receive,
    transfersByType.Send,
    txMetadataWithAssetId?.assetId,
    txMetadataWithAssetId?.parser,
    txMetadataWithAssetId?.value,
    type,
  ])

  return (
    <TransactionTeaser
      assetId={txMetadataWithAssetId?.assetId}
      transfersByType={transfersByType}
      type={type}
      topLeftRegion={topLeft}
      topRightRegion={topRight}
      bottomRightRegion={bottomRight}
      bottomLeftRegion={bottomLeft}
      status={status}
      onToggle={toggleOpen}
    />
  )
}
