import { ChevronRightIcon } from '@chakra-ui/icons'
import { Center, Flex, HStack, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText } from 'components/Text'
import type { Fee, Transfer, TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { Method } from 'hooks/useTxDetails/useTxDetails'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

import { Amount as CryptoAmount } from './TransactionDetails/Amount'
import { ApprovalAmount } from './TransactionDetails/ApprovalAmount'
import { TransactionTag } from './TransactionTag'
import { TransactionTeaser } from './TransactionTeaser'
import { getTxMetadataWithAssetId } from './utils'

const dividerStyle = { borderWidth: 0 }

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
  txDetails: TxDetails
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
  txDetails,
  toggleOpen,
}: TransactionGenericRowProps) => {
  const translate = useTranslate()
  const txMetadataWithAssetId = useMemo(() => getTxMetadataWithAssetId(txData), [txData])

  const numSendAssets = useMemo(() => {
    if (!transfersByType.Send?.length) return 0
    const uniqueAssets = new Set()
    for (const transfer of transfersByType.Send) {
      uniqueAssets.add(transfer.assetId)
    }
    return uniqueAssets.size
  }, [transfersByType.Send])

  const numReceiveAssets = useMemo(() => {
    if (!transfersByType.Receive?.length) return 0
    const uniqueAssets = new Set()
    for (const transfer of transfersByType.Receive) {
      uniqueAssets.add(transfer.assetId)
    }
    return uniqueAssets.size
  }, [transfersByType.Receive])

  const uniqueAssets = useMemo(() => {
    const uniqueAssets: Record<AssetId, Asset> = {}
    for (const transfer of txDetails.transfers) {
      if (uniqueAssets[transfer.assetId]) continue
      uniqueAssets[transfer.assetId] = transfer.asset
    }
    return Object.values(uniqueAssets)
  }, [txDetails.transfers])

  const hasNoSendAssets = useMemo(() => numSendAssets === 0, [numSendAssets])
  const hasSingleSendAsset = useMemo(() => numSendAssets === 1, [numSendAssets])
  const hasManySendAssets = useMemo(() => numSendAssets > 1, [numSendAssets])

  const hasNoReceiveAssets = useMemo(() => numReceiveAssets === 0, [numReceiveAssets])
  const hasSingleReceiveAsset = useMemo(() => numReceiveAssets === 1, [numReceiveAssets])
  const hasManyReceiveAssets = useMemo(() => numReceiveAssets > 1, [numReceiveAssets])

  const hasNoTransfers = useMemo(
    () => hasNoSendAssets && hasNoReceiveAssets,
    [hasNoSendAssets, hasNoReceiveAssets],
  )

  const isNft = useMemo(() => {
    return Object.values(transfersByType)
      .flat()
      .some(transfer => !!transfer.id)
  }, [transfersByType])

  const divider = useMemo(
    () => (
      <Center
        bg='background.surface.raised.pressed'
        borderRadius='full'
        fontSize='md'
        color='text.subtle'
        style={dividerStyle}
      >
        <ChevronRightIcon />
      </Center>
    ),
    [],
  )

  const sendAmount = useMemo(() => {
    if (hasSingleSendAsset) {
      const symbol = transfersByType.Send[0].asset.symbol
      const precision = transfersByType.Send[0].asset.precision ?? 0
      const amount = fromBaseUnit(
        transfersByType.Send.reduce((prev, transfer) => prev.plus(transfer.value), bn(0)).toFixed(),
        precision,
      )

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

    if (hasManySendAssets) {
      const symbols = transfersByType.Send.map(transfer => transfer.asset.symbol)
      return <RawText color='text.subtle'>{symbols.join(' + ')}</RawText>
    }
  }, [hasSingleSendAsset, hasManySendAssets, transfersByType.Send])

  // title text
  const topLeft = useMemo(() => {
    const text = (() => {
      if (title) return translate(title)

      if (type === TransferType.Send) {
        const address = middleEllipsis(txDetails.transfers[0].to[0])
        return translate('transactionHistory.sentTo', { address })
      }

      if (type === TransferType.Receive) {
        const address = middleEllipsis(txDetails.transfers[0].from[0])
        return translate('transactionHistory.receivedFrom', { address })
      }

      return translate(`transactionRow.${type.toLowerCase()}`)
    })()

    return (
      <Flex gap={2}>
        <RawText>{text}</RawText>
        <TransactionTag txDetails={txDetails} transfersByType={transfersByType} />
      </Flex>
    )
  }, [title, transfersByType, txDetails, type, translate])

  // send value if there is also a receive value
  const topRight = useMemo(() => {
    if (hasNoReceiveAssets) return
    return sendAmount
  }, [hasNoReceiveAssets, sendAmount])

  // asset(s) label
  const bottomLeft = useMemo(() => {
    if (type === Method.Approve || txData?.method === Method.UnstakeRequest) {
      return <AssetSymbol fontWeight='bold' assetId={txMetadataWithAssetId?.assetId ?? ''} />
    }

    if (txData?.parser === 'rfox' && txData?.method === Method.SetRuneAddress) {
      return <RawText>{txData.runeAddress ?? ''}</RawText>
    }

    if (hasNoTransfers) return

    // send only
    if (hasNoReceiveAssets) {
      if (hasSingleSendAsset) {
        const transfer = transfersByType.Send[0]
        const symbol = !isNft
          ? transfer.asset.symbol
          : transfer.token?.name || transfer.token?.symbol || 'N/A'
        return <RawText>{symbol}</RawText>
      }

      if (hasManySendAssets) {
        return (
          <RawText>
            {transfersByType.Send.map(transfer => transfer.asset.symbol).join(' + ')}
          </RawText>
        )
      }
    }

    // receive only
    if (hasNoSendAssets) {
      if (hasSingleReceiveAsset) {
        const transfer = transfersByType.Receive[0]
        const symbol = !isNft
          ? transfer.asset.symbol
          : transfer.token?.name || transfer.token?.symbol || 'N/A'
        return <RawText>{symbol}</RawText>
      }

      if (hasManyReceiveAssets) {
        return (
          <RawText>
            {transfersByType.Receive.map(transfer => transfer.asset.symbol).join(' + ')}
          </RawText>
        )
      }
    }

    // send & receive same asset
    if (uniqueAssets.length === 1) {
      return (
        <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
          {uniqueAssets[0].symbol}
        </RawText>
      )
    }

    // send & receive different assets
    return (
      <HStack divider={divider}>
        {hasSingleSendAsset ? (
          <RawText>{transfersByType.Send[0].asset.symbol}</RawText>
        ) : hasManySendAssets ? (
          <Flex gap={1} alignItems='center' fontWeight='bold'>
            <RawText>
              {transfersByType.Send.map(transfer => transfer.asset.symbol).join(' + ')}
            </RawText>
          </Flex>
        ) : null}
        {hasSingleReceiveAsset ? (
          <RawText>{transfersByType.Receive[0].asset.symbol}</RawText>
        ) : hasManyReceiveAssets ? (
          <Flex gap={1} alignItems='center' fontWeight='bold'>
            <RawText>
              {transfersByType.Receive.map(transfer => transfer.asset.symbol).join(' + ')}
            </RawText>
          </Flex>
        ) : null}
      </HStack>
    )
  }, [
    hasNoTransfers,
    hasNoSendAssets,
    hasSingleSendAsset,
    hasManySendAssets,
    hasNoReceiveAssets,
    hasSingleReceiveAsset,
    hasManyReceiveAssets,
    isNft,
    uniqueAssets,
    transfersByType.Receive,
    transfersByType.Send,
    txData,
    txMetadataWithAssetId?.assetId,
    type,
    divider,
  ])

  // approval amount or receive value or send value if there is no receive value
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

    if (txData?.parser === 'rfox' && txData?.method === Method.UnstakeRequest) {
      return (
        <Tag>
          <CryptoAmount value={txData.value ?? '0'} assetId={txData.assetId} />
        </Tag>
      )
    }

    if (hasNoReceiveAssets) return sendAmount

    if (hasSingleReceiveAsset) {
      const precision = transfersByType.Receive[0].asset.precision ?? 0
      const symbol = transfersByType.Receive[0].asset.symbol
      const amount = fromBaseUnit(
        transfersByType.Receive.reduce(
          (prev, transfer) => prev.plus(transfer.value),
          bn(0),
        ).toFixed(),
        precision,
      )
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

    if (hasManyReceiveAssets) {
      const symbols = transfersByType.Receive.map(transfer => transfer.asset.symbol)
      return <RawText color='text.subtle'>{symbols.join(' + ')}</RawText>
    }
  }, [
    hasNoReceiveAssets,
    hasSingleReceiveAsset,
    hasManyReceiveAssets,
    transfersByType.Receive,
    txData,
    txMetadataWithAssetId?.assetId,
    txMetadataWithAssetId?.parser,
    txMetadataWithAssetId?.value,
    type,
    sendAmount,
  ])

  return (
    <TransactionTeaser
      assetId={
        txMetadataWithAssetId?.assetId ?? (hasNoTransfers ? txDetails.fee?.assetId : undefined)
      }
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
