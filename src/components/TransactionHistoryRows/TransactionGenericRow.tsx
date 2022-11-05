import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, SimpleGrid, Stack } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { TradeType, TransferType } from '@keepkey/unchained-client'
import { FaArrowRight, FaExchangeAlt, FaStickyNote, FaThumbsUp } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'
import { TransactionTime } from 'components/TransactionHistoryRows/TransactionTime'
import { Direction } from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { breakpoints } from 'theme/theme'

import { ApproveIcon } from './components/ApproveIcon'
import type { getTxMetadataWithAssetId } from './utils'

export const GetTxLayoutFormats = ({ parentWidth }: { parentWidth: number }) => {
  const isLargerThanSm = parentWidth > parseInt(breakpoints['sm'], 10)
  const isLargerThanMd = parentWidth > parseInt(breakpoints['md'], 10)
  const isLargerThanLg = parentWidth > parseInt(breakpoints['lg'], 10)
  let columns = '1fr'
  let dateFormat = 'L LT'

  if (isLargerThanSm) {
    columns = '1fr 2fr'
    dateFormat = 'hh:mm A'
  }
  if (isLargerThanMd) {
    columns = '1fr 2fr'
  }
  if (isLargerThanLg) {
    columns = '1fr 2fr 1fr 1fr'
  }
  return { columns, dateFormat, breakPoints: [isLargerThanLg, isLargerThanMd, isLargerThanSm] }
}

const TransactionIcon = ({
  type,
  assetId,
  value,
  compactMode,
}: {
  type: string
  assetId: AssetId | undefined
  value: string | undefined
  compactMode: boolean
}) => {
  switch (type) {
    case TransferType.Send:
    case Direction.Outbound:
      return <ArrowUpIcon />
    case TransferType.Receive:
    case Direction.Inbound:
      return <ArrowDownIcon color='green.500' />
    case TradeType.Trade:
      return <FaExchangeAlt />
    case Direction.InPlace: {
      return assetId && value ? (
        <ApproveIcon assetId={assetId} value={value} compactMode={compactMode} />
      ) : (
        <FaThumbsUp />
      )
    }
    default:
      return <FaStickyNote />
  }
}

type TransactionRowAsset = {
  assetId?: string
  symbol: string
  amount: string
  precision: number
  currentPrice?: string
  icon?: string
}

type TransactionGenericRowProps = {
  type: string
  symbol: string
  title?: string
  showDateAndGuide?: boolean
  compactMode?: boolean
  assets: TransactionRowAsset[]
  fee?: TransactionRowAsset
  txid: TxId
  txData?: ReturnType<typeof getTxMetadataWithAssetId>
  blockTime: number
  explorerTxLink: string
  toggleOpen: Function
  isFirstAssetOutgoing?: boolean
  parentWidth: number
}

export const TransactionGenericRow = ({
  type,
  title,
  assets,
  fee,
  txid,
  txData,
  blockTime,
  explorerTxLink,
  compactMode = false,
  toggleOpen,
  isFirstAssetOutgoing = false,
  parentWidth,
}: TransactionGenericRowProps) => {
  const {
    columns,
    dateFormat,
    breakPoints: [isLargerThanLg],
  } = GetTxLayoutFormats({ parentWidth })

  return (
    <Button
      height='auto'
      fontWeight='inherit'
      variant='unstyled'
      w='full'
      p={{ base: 2, md: 4 }}
      onClick={() => toggleOpen()}
    >
      <SimpleGrid
        gridTemplateColumns={{ base: '1fr', md: columns }}
        textAlign='left'
        justifyContent='flex-start'
        alignItems='center'
        columnGap={4}
      >
        <Flex alignItems='flex-start' flex={1} flexDir='column' width='full'>
          <Flex alignItems='center' width='full'>
            <IconCircle mr={2} boxSize={{ base: '24px', lg: compactMode ? '24px' : '40px' }}>
              <TransactionIcon
                type={type}
                assetId={txData?.assetId}
                value={txData?.value}
                compactMode={compactMode}
              />
            </IconCircle>
            <Stack
              direction={{ base: 'row', md: 'column', xl: compactMode ? 'row' : 'column' }}
              flex={1}
              spacing={0}
              fontSize={{ base: 'sm', lg: compactMode ? 'sm' : 'md' }}
              alignItems={{ base: 'flex-start', xl: compactMode ? 'center' : 'flex-start' }}
            >
              <Text
                fontWeight='bold'
                flex={1}
                translation={title ? title : `transactionRow.${type.toLowerCase()}`}
              />
              <TransactionTime blockTime={blockTime} format={dateFormat} />
            </Stack>
          </Flex>
        </Flex>
        <Flex flex={2} flexDir='column' width='full'>
          <Stack
            direction='row'
            width='full'
            alignItems='center'
            spacing={{ base: 0, md: 4, xl: compactMode ? 0 : 4 }}
            justifyContent={{
              base: 'space-between',
              md: 'flex-start',
              xl: compactMode ? 'space-between' : 'flex-start',
            }}
            fontSize={{ base: 'sm', lg: compactMode ? 'sm' : 'md' }}
            divider={
              <Box border={0} color='gray.500' fontSize='sm'>
                <FaArrowRight />
              </Box>
            }
          >
            {assets.map((asset, index) => (
              <Stack
                alignItems='center'
                key={index}
                flex={1}
                mt={{ base: 2, md: 0, xl: compactMode ? 2 : 0 }}
                direction={index === 0 ? 'row' : 'row-reverse'}
                textAlign={index === 0 ? 'left' : 'right'}
              >
                <AssetIcon
                  assetId={asset.assetId}
                  boxSize={{ base: '24px', lg: compactMode ? '24px' : '40px' }}
                />
                <Box flex={1}>
                  <Amount.Crypto
                    color='inherit'
                    fontWeight='medium'
                    prefix={index === 0 && isFirstAssetOutgoing ? '-' : ''}
                    value={fromBaseUnit(asset.amount ?? '0', asset.precision)}
                    symbol={asset.symbol}
                    maximumFractionDigits={4}
                  />
                  {asset.currentPrice && (
                    <Amount.Fiat
                      color='gray.500'
                      fontSize='sm'
                      lineHeight='1'
                      prefix={index === 0 && isFirstAssetOutgoing ? '-' : ''}
                      value={bnOrZero(fromBaseUnit(asset.amount ?? '0', asset.precision))
                        .times(asset.currentPrice)
                        .toString()}
                    />
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Flex>
        {isLargerThanLg && (
          <Flex alignItems='flex-start' flex={1} flexDir='column' textAlign='right'>
            {fee && bnOrZero(fee?.amount).gt(0) ? (
              <Flex alignItems='flex-end' width='full'>
                <Box flex={1}>
                  <Amount.Crypto
                    color='inherit'
                    fontWeight='bold'
                    value={fromBaseUnit(fee.amount, fee.precision)}
                    symbol={fee.symbol}
                    maximumFractionDigits={6}
                  />
                  <Amount.Fiat
                    color='gray.500'
                    fontSize='sm'
                    lineHeight='1'
                    value={
                      fee.amount
                        ? bnOrZero(fromBaseUnit(fee.amount, fee.precision))
                            .times(fee.currentPrice ?? 0)
                            .toString()
                        : '0'
                    }
                  />
                </Box>
              </Flex>
            ) : null}
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
