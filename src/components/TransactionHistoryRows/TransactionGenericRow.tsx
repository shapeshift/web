import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Flex, useMediaQuery } from '@chakra-ui/react'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { FaExchangeAlt } from 'react-icons/fa'
import { IoIosArrowRoundForward } from 'react-icons/io'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { TransactionLink } from 'components/TransactionHistoryRows/TransactionLink'
import { TransactionTime } from 'components/TransactionHistoryRows/TransactionTime'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { breakpoints } from 'theme/theme'

const TransactionIcon = ({ type }: { type: string }) => {
  switch (type) {
    case TxType.Send:
      return <ArrowUpIcon />
    case TxType.Receive:
      return <ArrowDownIcon color='green.500' />
    case TradeType.Trade:
      return <FaExchangeAlt />
    default:
      return null
  }
}

type TransactionRowAsset = {
  symbol: string
  amount: string
  precision: number
  currentPrice?: string
}

type TransactionGenericRowType = {
  type: string
  symbol: string
  showDateAndGuide?: boolean
  assets: TransactionRowAsset[]
  fee: TransactionRowAsset
  txid: TxId
  blockTime: number
  explorerTxLink: string
}

export const TransactionGenericRow = ({
  type,
  showDateAndGuide,
  assets,
  fee,
  txid,
  blockTime,
  explorerTxLink
}: TransactionGenericRowType) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const [isLargerThanLg] = useMediaQuery(`(min-width: ${breakpoints['lg']})`)
  const [isLargerThanXl] = useMediaQuery(`(min-width: ${breakpoints['xl']})`)
  return (
    <>
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
                translation={[`transactionRow.${type.toLowerCase()}`, { symbol: '' }]}
              />
              <TransactionTime blockTime={blockTime} />
            </Box>
          </Flex>
        </Flex>
        <Flex
          alignItems={isLargerThanLg ? 'flex-start' : 'flex-end'}
          flex={isLargerThanLg ? 2 : 1}
          flexDir='column'
        >
          {showDateAndGuide && isLargerThanXl && (
            <Text
              mb={6}
              lineHeight={1}
              color='gray.600'
              translation={'transactionHistory.assets'}
            />
          )}
          <Flex
            alignItems={isLargerThanMd ? 'center' : 'flex-start'}
            width='full'
            flexDir='row'
            flexWrap='wrap'
          >
            {assets.map((asset, index) => (
              <>
                <Flex alignItems='center'>
                  {isLargerThanLg && (
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
                    <Flex
                      flex={0}
                      justifyContent='center'
                      alignItems='center'
                      mb={isLargerThanMd ? 0 : 2}
                    >
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
              </>
            ))}
          </Flex>
        </Flex>
        {isLargerThanXl && <Flex flex={0.2} />}
        {isLargerThanXl && (
          <Flex alignItems='flex-start' flex={1} flexDir='column'>
            {showDateAndGuide && (
              <Text mb={6} lineHeight={1} color='gray.600' translation={'transactionRow.fee'} />
            )}
            <Flex alignItems='center' width='full'>
              <Box flex={1}>
                <Amount.Crypto
                  color='inherit'
                  fontWeight='bold'
                  value={fee.amount}
                  symbol={fee.symbol}
                  maximumFractionDigits={6}
                />
                {fee.currentPrice && (
                  <Amount.Fiat
                    color='gray.500'
                    fontSize='sm'
                    lineHeight='1'
                    value={bnOrZero(fee.amount).times(fee.currentPrice).toString()}
                  />
                )}
              </Box>
            </Flex>
          </Flex>
        )}
        {isLargerThanXl && (
          <Flex flex={0} flexDir='column'>
            {showDateAndGuide && (
              <Text
                mb={6}
                lineHeight={1}
                color='gray.600'
                translation={'transactionHistory.viewOnChain'}
              />
            )}
            <Flex justifyContent='flex-start' alignItems='center'>
              <TransactionLink txid={txid} explorerTxLink={explorerTxLink} />
            </Flex>
          </Flex>
        )}
      </Flex>
    </>
  )
}
