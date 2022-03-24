import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, SimpleGrid, Stack, useMediaQuery } from '@chakra-ui/react'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
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
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { breakpoints } from 'theme/theme'

const TransactionIcon = ({ type }: { type: string }) => {
  switch (type) {
    case TxType.Send:
    case Direction.Outbound:
      return <ArrowUpIcon />
    case TxType.Receive:
    case Direction.Inbound:
      return <ArrowDownIcon color='green.500' />
    case TradeType.Trade:
      return <FaExchangeAlt />
    case Direction.InPlace:
      return <FaThumbsUp />
    default:
      return <FaStickyNote />
  }
}

type TransactionRowAsset = {
  symbol: string
  amount: string
  precision: number
  currentPrice?: string
}

type TransactionGenericRowProps = {
  type: string
  symbol: string
  title?: string
  showDateAndGuide?: boolean
  compactMode?: boolean
  assets: TransactionRowAsset[]
  fee: TransactionRowAsset
  txid: TxId
  blockTime: number
  explorerTxLink: string
  toggleOpen: Function
  parentWidth: number
}

export const TransactionGenericRow = ({
  type,
  title,
  showDateAndGuide,
  assets,
  fee,
  txid,
  blockTime,
  explorerTxLink,
  compactMode = false,
  toggleOpen,
  parentWidth
}: TransactionGenericRowProps) => {
  const isLargerThanLg = parentWidth > parseInt(breakpoints['lg'])
  const isLargerThanXl = parentWidth > parseInt(breakpoints['xl'])
  return (
    <Button height='auto' variant='unstyled' w='full' py={4} onClick={() => toggleOpen()}>
      <Stack
        direction={compactMode ? 'column' : 'row'}
        textAlign='left'
        justifyContent='flex-start'
        alignItems='flex-start'
      >
        <Flex alignItems='flex-start' flex={1} flexDir='column' width='full'>
          <Flex alignItems='center' width='full'>
            <IconCircle mr={2} boxSize={{ base: '24px', lg: compactMode ? '24px' : '40px' }}>
              <TransactionIcon type={type} />
            </IconCircle>
            <Stack
              direction={{ base: 'row', lg: compactMode ? 'row' : 'column' }}
              flex={1}
              spacing={0}
              fontSize={{ base: 'sm', lg: compactMode ? 'sm' : 'md' }}
              alignItems={{ base: 'center', lg: compactMode ? 'center' : 'flex-start' }}
            >
              <Text
                fontWeight='bold'
                flex={1}
                translation={
                  title ? title : [`transactionRow.${type.toLowerCase()}`, { symbol: '' }]
                }
              />
              <TransactionTime blockTime={blockTime} />
            </Stack>
          </Flex>
        </Flex>
        <Flex flex={2} flexDir='column' width='full'>
          <Stack
            direction='row'
            width='full'
            alignItems='center'
            spacing={{ base: 0, lg: compactMode ? 0 : 4 }}
            justifyContent={{
              base: 'space-between',
              lg: compactMode ? 'space-between' : 'flex-start'
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
                mt={{ base: 2, lg: compactMode ? 2 : 0 }}
                direction={{
                  base: index === 0 ? 'row' : 'row-reverse',
                  lg: compactMode ? (index === 0 ? 'row' : 'row-reverse') : 'row'
                }}
                textAlign={{
                  base: index === 0 ? 'left' : 'right',
                  lg: compactMode ? (index === 0 ? 'left' : 'right') : 'left'
                }}
              >
                <AssetIcon
                  symbol={asset.symbol.toLowerCase()}
                  boxSize={{ base: '24px', lg: compactMode ? '24px' : '40px' }}
                />
                <Box flex={1}>
                  <Amount.Crypto
                    color='inherit'
                    fontWeight='medium'
                    value={fromBaseUnit(asset.amount ?? '0', asset.precision)}
                    symbol={asset.symbol}
                    maximumFractionDigits={4}
                  />
                  {asset.currentPrice && (
                    <Amount.Fiat
                      color='gray.500'
                      fontSize='sm'
                      lineHeight='1'
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
        {!compactMode && isLargerThanXl && (
          <Flex alignItems='flex-start' flex={1} flexDir='column'>
            <Flex alignItems='center' width='full'>
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
          </Flex>
        )}
        {!compactMode && isLargerThanLg && (
          <Flex flex={0} flexDir='column'>
            <Flex justifyContent='flex-end' alignItems='center'>
              <TransactionLink txid={txid} explorerTxLink={explorerTxLink} />
            </Flex>
          </Flex>
        )}
      </Stack>
    </Button>
  )
}
