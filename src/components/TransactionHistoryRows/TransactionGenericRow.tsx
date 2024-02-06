import { Button, Flex, Stack, Tag } from '@chakra-ui/react'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import type { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { AssetSymbol } from 'components/AssetSymbol'
import { RawText, Text } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import type { Fee, Transfer } from 'hooks/useTxDetails/useTxDetails'
import { Method } from 'hooks/useTxDetails/useTxDetails'
import { fromBaseUnit } from 'lib/math'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { breakpoints } from 'theme/theme'

import { FALLBACK_PRECISION } from './constants'
import { ApprovalAmount } from './TransactionDetails/ApprovalAmount'
import { getTxMetadataWithAssetId } from './utils'

const dateFormat = 'L LT'

export const GetTxLayoutFormats = ({ parentWidth }: { parentWidth: number }) => {
  const isLargerThanSm = parentWidth > parseInt(breakpoints['sm'], 10)
  const isLargerThanMd = parentWidth > parseInt(breakpoints['md'], 10)
  const isLargerThanLg = parentWidth > parseInt(breakpoints['lg'], 10)
  let columns = '1fr'

  if (isLargerThanSm) {
    columns = '1.5fr 2fr'
  }
  if (isLargerThanMd) {
    columns = '1.5fr 2fr'
  }
  if (isLargerThanLg) {
    columns = '1.5fr 2fr 1fr 1fr'
  }
  return { columns, dateFormat, breakPoints: [isLargerThanLg, isLargerThanMd, isLargerThanSm] }
}
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
  explorerTxLink: string
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

  const renderSendInfo = useMemo(() => {
    if (transfersByType.Send && transfersByType.Send.length > 1) {
      const assets = transfersByType.Send.map(transfer => transfer.asset.symbol)
      return <RawText color='text.subtle'>{assets.join('/')}</RawText>
    }
    if (transfersByType.Send && transfersByType.Receive) {
      const precision = transfersByType.Send[0].asset.precision ?? FALLBACK_PRECISION
      const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
      return (
        <Amount.Crypto
          color='text.subtle'
          value={amount}
          symbol={transfersByType.Send[0].asset.symbol}
          maximumFractionDigits={4}
          prefix='-'
        />
      )
    }
  }, [transfersByType])

  const renderBody = useMemo(() => {
    if (transfersByType.Receive && transfersByType.Receive.length > 1) {
      return (
        <Flex gap={1} alignItems='center' fontWeight='bold'>
          <Tag size='sm' fontWeight='bold'>
            {transfersByType.Receive.length}x
          </Tag>
          <Text translation='transactionHistory.assets' />
        </Flex>
      )
    }
    if (
      (transfersByType.Send && transfersByType.Receive) ||
      (!transfersByType.Send && transfersByType.Receive)
    ) {
      const precision = transfersByType.Receive[0].asset.precision ?? FALLBACK_PRECISION
      const amount = fromBaseUnit(transfersByType.Receive[0].value, precision)
      const symbol = transfersByType.Receive[0].asset.symbol
      return (
        <Flex justifyContent='space-between' fontWeight='bold' fontSize='lg'>
          <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
            {symbol}
          </RawText>
          <Amount.Crypto
            value={amount}
            symbol={symbol}
            color='text.success'
            prefix='+'
            maximumFractionDigits={4}
          />
        </Flex>
      )
    }
    if (transfersByType.Send && !transfersByType.Receive) {
      const precision = transfersByType.Send[0].asset.precision ?? FALLBACK_PRECISION
      const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
      const symbol = transfersByType.Send[0].asset.symbol
      return (
        <Flex justifyContent='space-between' fontWeight='bold' fontSize='lg'>
          <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
            {symbol}
          </RawText>
          <Amount.Crypto
            value={amount}
            symbol={symbol}
            color='text.subtle'
            maximumFractionDigits={4}
          />
        </Flex>
      )
    }
  }, [transfersByType.Receive, transfersByType.Send])

  return (
    <Button
      height='auto'
      fontWeight='inherit'
      variant='unstyled'
      w='full'
      p={4}
      onClick={toggleOpen}
    >
      <Flex alignItems='flex-start' flex={1} flexDir='column' width='full'>
        <Flex alignItems='center' width='full' gap={4}>
          <AssetIconWithBadge
            assetId={txMetadataWithAssetId?.assetId}
            transfersByType={transfersByType}
            type={type}
            size='md'
          >
            <TransactionTypeIcon type={type} status={status} />
          </AssetIconWithBadge>
          <Stack flex={1} spacing={0}>
            <Flex alignItems='center' gap={2} flex={1} width='full' justifyContent='space-between'>
              <Text
                color='text.subtle'
                translation={title ? title : `transactionRow.${type.toLowerCase()}`}
              />
              {renderSendInfo}
            </Flex>
            {/* <TransactionTime blockTime={blockTime} format={dateFormat} /> */}
            {renderBody}
            {type === Method.Approve && (
              <Flex justifyContent='space-between' alignItems='center'>
                <AssetSymbol fontWeight='bold' assetId={txMetadataWithAssetId?.assetId ?? ''} />
                <ApprovalAmount
                  assetId={txMetadataWithAssetId?.assetId ?? ''}
                  value={txMetadataWithAssetId?.value ?? ''}
                  parser={txMetadataWithAssetId?.parser}
                  variant='tag'
                />
              </Flex>
            )}
            {isNft && <RawText>NFT</RawText>}
          </Stack>
        </Flex>
      </Flex>
    </Button>
  )
}
