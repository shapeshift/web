import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Flex, useMediaQuery } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import { Fragment } from 'react'
import { FaExchangeAlt, FaStickyNote, FaThumbsUp } from 'react-icons/fa'
import { IoIosArrowRoundForward } from 'react-icons/io'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'
import { TransactionTime } from 'components/TransactionHistoryRows/TransactionTime'
import { Direction } from 'hooks/useTxDetails/useTxDetails'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { breakpoints } from 'theme/theme'

const TransactionIcon = ({ type }: { type: string }) => {
  switch (type) {
    case chainAdapters.TxType.Send:
    case Direction.Outbound:
      return <ArrowUpIcon />
    case chainAdapters.TxType.Receive:
    case Direction.Inbound:
      return <ArrowDownIcon color='green.500' />
    case chainAdapters.TradeType.Trade:
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
  fee?: TransactionRowAsset
  txid: TxId
  blockTime: number
  explorerTxLink: string
  toggleOpen: Function
}

const Guide = ({ title }: { title: string }) => (
  <Text mb={6} lineHeight={1} color='gray.600' translation={`transactionHistory.${title}`} />
)

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
  toggleOpen
}: TransactionGenericRowProps) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  const [isLargerThanXl] = useMediaQuery(`(min-width: ${breakpoints['xl']})`)
  return (
    <Box as='button' w='full' py={4} onClick={() => toggleOpen()}>
      <Flex width='full' justifyContent='space-between' textAlign='left' alignItems='flex-end'>
        <Flex alignItems='flex-start' flex={1} mr={3} flexDir='column'>
          {showDateAndGuide && <TransactionDate blockTime={blockTime} />}
          <Flex alignItems={{ base: 'flex-end', md: 'center' }} width='full'>
            <IconCircle mr={3}>
              <TransactionIcon type={type} />
            </IconCircle>
            <Box flex={1}>
              <Text
                fontWeight='bold'
                flex={1}
                lineHeight='1'
                mb={1}
                translation={
                  title ? title : [`transactionRow.${type.toLowerCase()}`, { symbol: '' }]
                }
              />
              <TransactionTime blockTime={blockTime} />
            </Box>
          </Flex>
        </Flex>
        <Flex
          alignItems={isLargerThanLg ? 'flex-start' : 'flex-end'}
          flex={!compactMode && isLargerThanLg ? 2 : 1}
          flexDir='column'
        >
          {!compactMode && showDateAndGuide && isLargerThanXl && <Guide title='assets' />}
          <Flex
            alignItems={isLargerThanMd ? 'center' : 'flex-start'}
            width='full'
            flexDir='row'
            flexWrap='wrap'
          >
            {assets.map((asset, index) => (
              <Fragment key={index}>
                <Flex alignItems='center'>
                  {!compactMode && isLargerThanLg && (
                    <AssetIcon mr={3} symbol={asset.symbol.toLowerCase()} boxSize='40px' />
                  )}
                  <Box flex={1}>
                    <Amount.Crypto
                      color='inherit'
                      fontWeight='bold'
                      value={fromBaseUnit(asset.amount ?? '0', asset.precision)}
                      symbol={asset.symbol}
                      maximumFractionDigits={6}
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
                  {!isLargerThanMd && index !== assets.length - 1 && (
                    <Flex flex={0} justifyContent='center' alignItems='center' mb={2}>
                      <Box color='gray.600'>
                        <IoIosArrowRoundForward size='2em' />
                      </Box>
                    </Flex>
                  )}
                </Flex>
                {isLargerThanMd && index !== assets.length - 1 && (
                  <Flex flex={1} justifyContent='center' alignItems='center'>
                    <Box color='gray.600'>
                      <IoIosArrowRoundForward size='2em' />
                    </Box>
                  </Flex>
                )}
              </Fragment>
            ))}
          </Flex>
        </Flex>
        {!compactMode && isLargerThanLg && <Flex flex={0.2} />}
        {!compactMode && isLargerThanXl && (
          <Flex alignItems='flex-start' flex={1} flexDir='column'>
            {showDateAndGuide && <Guide title='fee' />}
            {fee && (
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
            )}
          </Flex>
        )}
        {!compactMode && isLargerThanLg && (
          <Flex flex={0} flexDir='column'>
            {showDateAndGuide && <Guide title='viewOnChain' />}
            <Flex justifyContent='flex-start' alignItems='center'>
              <TransactionLink txid={txid} explorerTxLink={explorerTxLink} />
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  )
}
