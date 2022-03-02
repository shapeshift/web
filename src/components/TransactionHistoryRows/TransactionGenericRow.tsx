import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Link, useColorModeValue } from '@chakra-ui/react'
import { TradeType, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { FaExchangeAlt } from 'react-icons/fa'
import { IoIosArrowRoundForward } from 'react-icons/io'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { TransactionTime } from 'components/TransactionHistoryRows/TransactionTime'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

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
  symbol,
  explorerTxLink
}: TransactionGenericRowType) => {
  return (
    <>
      <Flex width='full' justifyContent='space-between' textAlign='left'>
        <Flex alignItems='flex-start' flex={1} flexDir='column'>
          {showDateAndGuide && <TransactionDate blockTime={blockTime} />}
          <Flex alignItems='center' width='full'>
            <IconCircle mr={3}>
              <TransactionIcon type={type} />
            </IconCircle>
            <Box flex={1}>
              <Text
                fontWeight='bold'
                overflow='hidden'
                flex={1}
                textOverflow='ellipsis'
                maxWidth='60%'
                lineHeight='1'
                whiteSpace='nowrap'
                mb={1}
                translation={[`transactionRow.${type.toLowerCase()}`, { symbol: '' }]}
              />
              <TransactionTime blockTime={blockTime} />
            </Box>
          </Flex>
        </Flex>
        <Flex alignItems='flex-start' flex={2} flexDir='column'>
          {showDateAndGuide && (
            <Text
              mb={6}
              lineHeight={1}
              color='gray.600'
              translation={'transactionHistory.assets'}
            />
          )}
          <Flex alignItems='center' width='full'>
            {assets.map((asset, index) => (
              <>
                <Flex alignItems='center'>
                  <AssetIcon mr={3} symbol={asset.symbol.toLowerCase()} boxSize='40px' />
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
                </Flex>
                {index !== assets.length - 1 && (
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
        <Flex flex={0.5} />
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
            <Link
              isExternal
              color={useColorModeValue('blue.400', 'blue.200')}
              _hover={{ textDecoration: 'none' }}
              href={`${explorerTxLink}${txid}`}
              onClick={e => {
                // don't trigger parent onClick
                e.stopPropagation()
              }}
            >
              <Button
                bg={useColorModeValue('gray.200', 'gray.900')}
                fontWeight='normal'
                _hover={{ bg: useColorModeValue('gray.300', 'gray.800') }}
              >
                <MiddleEllipsis address={txid} />
              </Button>
            </Link>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
