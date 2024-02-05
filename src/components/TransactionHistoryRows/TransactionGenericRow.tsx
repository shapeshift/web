import { ArrowDownIcon, ArrowUpIcon, CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import type { CenterProps } from '@chakra-ui/react'
import { Box, Button, Center, Flex, SimpleGrid, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import { TradeType, TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import React, { useMemo } from 'react'
import { FaArrowRight, FaStickyNote } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { RawText, Text } from 'components/Text'
import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'
import type { Fee, Transfer } from 'hooks/useTxDetails/useTxDetails'
import { Method } from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { breakpoints } from 'theme/theme'

import { AssetsTransfers } from './components/AssetsTransfers'
import { AssetTransfer } from './components/AssetTransfer'
import { FALLBACK_PRECISION } from './constants'
import { ApprovalAmount } from './TransactionDetails/ApprovalAmount'
import { getTxMetadataWithAssetId } from './utils'

const buttonPadding = { base: 2, md: 4 }
const stackDivider = (
  <Box border={0} color='text.subtle' fontSize='sm'>
    <FaArrowRight />
  </Box>
)
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

const IconWrapper: React.FC<CenterProps> = props => (
  <Center borderRadius='full' boxSize='100%' {...props} />
)

const TransactionIcon = ({
  type,
  status,
  assetId,
  value,
  compactMode,
}: {
  type: string
  status: TxStatus
  assetId: AssetId | undefined
  value: string | undefined
  compactMode: boolean
}) => {
  if (status === TxStatus.Failed)
    return (
      <IconWrapper bg='red.500'>
        <WarningTwoIcon />
      </IconWrapper>
    )

  switch (type) {
    case TransferType.Send:
      return (
        <IconWrapper bg='blue.500'>
          <ArrowUpIcon />
        </IconWrapper>
      )
    case TransferType.Receive:
      return (
        <IconWrapper bg='green.500'>
          <ArrowDownIcon />
        </IconWrapper>
      )
    case TradeType.Trade:
    case TradeType.Swap:
    case Method.WithdrawNative:
    case Method.DepositRefundNative:
    case Method.LoanRepaymentRefundNative:
      return (
        <IconWrapper bg='purple.500'>
          <SwapIcon />
        </IconWrapper>
      )
    case Method.Approve:
      return (
        <IconWrapper bg='green.500'>
          <CheckCircleIcon />
        </IconWrapper>
      )
    default:
      return (
        <IconWrapper bg='gray.700'>
          <FaStickyNote />
        </IconWrapper>
      )
  }
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
  fee,
  txid,
  txData,
  blockTime,
  explorerTxLink,
  compactMode = false,
  toggleOpen,
  parentWidth,
}: TransactionGenericRowProps) => {
  const {
    columns,
    dateFormat,
    breakPoints: [isLargerThanLg],
  } = GetTxLayoutFormats({ parentWidth })

  const txMetadataWithAssetId = useMemo(() => getTxMetadataWithAssetId(txData), [txData])

  const transfers = useMemo(() => {
    return Object.values(transfersByType).map((transfersOfType, index) => {
      const hasManyTypeTransfers = transfersOfType.length > 1

      return (
        <React.Fragment key={index}>
          {hasManyTypeTransfers ? (
            <AssetsTransfers index={index} compactMode={compactMode} transfers={transfersOfType} />
          ) : (
            <AssetTransfer index={index} compactMode={compactMode} transfer={transfersOfType[0]} />
          )}
        </React.Fragment>
      )
    })
  }, [compactMode, transfersByType])

  const isNft = useMemo(() => {
    return Object.values(transfersByType)
      .flat()
      .some(transfer => !!transfer.id)
  }, [transfersByType])

  const cryptoValue = useMemo(() => {
    if (!fee) return '0'
    return fromBaseUnit(fee.value, fee.asset.precision)
  }, [fee])

  const fiatValue = useMemo(() => {
    return bnOrZero(fee?.marketData?.price)
      .times(cryptoValue)
      .toString()
  }, [fee?.marketData?.price, cryptoValue])

  const gridTemplateColumns = useMemo(() => ({ base: '1fr', md: columns }), [columns])

  const renderSendInfo = useMemo(() => {
    if (transfersByType.Send && transfersByType.Receive) {
      const precision = transfersByType.Send[0].asset.precision ?? FALLBACK_PRECISION
      const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
      return (
        <Amount.Crypto
          color='text.subtle'
          value={amount}
          symbol={transfersByType.Send[0].asset.symbol}
        />
      )
    }
  }, [transfersByType.Receive, transfersByType.Send])

  const renderBody = useMemo(() => {
    if (
      (transfersByType.Send && transfersByType.Receive) ||
      (!transfersByType.Send && transfersByType.Receive)
    ) {
      const precision = transfersByType.Receive[0].asset.precision ?? FALLBACK_PRECISION
      const amount = fromBaseUnit(transfersByType.Receive[0].value, precision)
      const symbol = transfersByType.Receive[0].asset.symbol
      return (
        <Flex justifyContent='space-between'>
          <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
            {symbol}
          </RawText>
          <Amount.Crypto value={amount} symbol={symbol} />
        </Flex>
      )
    }
    if (transfersByType.Send && !transfersByType.Receive) {
      const precision = transfersByType.Send[0].asset.precision ?? FALLBACK_PRECISION
      const amount = fromBaseUnit(transfersByType.Send[0].value, precision)
      const symbol = transfersByType.Send[0].asset.symbol
      return (
        <Flex justifyContent='space-between'>
          <RawText maxWidth='80px' textOverflow='ellipsis' overflow='hidden'>
            {symbol}
          </RawText>
          <Amount.Crypto value={amount} symbol={symbol} />
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
      p={buttonPadding}
      onClick={toggleOpen}
    >
      <SimpleGrid
        gridTemplateColumns={gridTemplateColumns}
        textAlign='left'
        justifyContent='flex-start'
        alignItems='center'
        columnGap={4}
      >
        <Flex alignItems='flex-start' flex={1} flexDir='column' width='full'>
          <Flex alignItems='center' width='full' gap={2}>
            {/* <AssetIconWithBadge
              assetId={txMetadataWithAssetId?.assetId}
              transfersByType={transfersByType}
              type={type}
              isLoading={status === TxStatus.Pending}
              size='md'
            >
              <TransactionIcon
                type={type}
                status={status}
                assetId={txMetadataWithAssetId?.assetId}
                value={txMetadataWithAssetId?.value}
                compactMode={compactMode}
              />
            </AssetIconWithBadge> */}
            <Stack flex={1} spacing={0}>
              <Flex
                alignItems='center'
                gap={2}
                flex={1}
                width='full'
                justifyContent='space-between'
              >
                <Text
                  fontWeight='bold'
                  translation={title ? title : `transactionRow.${type.toLowerCase()}`}
                />
                {renderSendInfo}
              </Flex>
              {/* <TransactionTime blockTime={blockTime} format={dateFormat} /> */}
              {renderBody}
              {type === Method.Approve && (
                <Flex>
                  <ApprovalAmount
                    assetId={txMetadataWithAssetId?.assetId ?? ''}
                    value={txMetadataWithAssetId?.value ?? ''}
                    parser={txMetadataWithAssetId?.parser}
                    variant='tag'
                  />
                </Flex>
              )}
            </Stack>
          </Flex>
        </Flex>
        {/* <Flex flex={2} flexDir='column' width='full'>
          <Stack
            direction='row'
            width='full'
            alignItems='center'
            spacing={stackSpacing}
            justifyContent={stackJustifyContent}
            fontSize={stackFontSize}
            divider={stackDivider}
          >
            {transfers}
          </Stack>
        </Flex> */}
        {isLargerThanLg && (
          <Flex alignItems='flex-start' flex={1} flexDir='column' textAlign='right'>
            {fee && bnOrZero(fee.value).gt(0) && (
              <Flex alignItems='flex-end' width='full'>
                <Box flex={1}>
                  <Amount.Crypto
                    color='inherit'
                    fontWeight='bold'
                    value={cryptoValue}
                    symbol={fee.asset.symbol}
                    maximumFractionDigits={6}
                  />
                  <Amount.Fiat color='text.subtle' fontSize='sm' lineHeight='1' value={fiatValue} />
                </Box>
              </Flex>
            )}
          </Flex>
        )}
        {isLargerThanLg && (
          <Flex flex={0} flexDir='column'>
            <Flex justifyContent='flex-end' alignItems='center'>
              <TransactionLink txid={txid} explorerTxLink={explorerTxLink} />
            </Flex>
          </Flex>
        )}
      </SimpleGrid>
    </Button>
  )
}
