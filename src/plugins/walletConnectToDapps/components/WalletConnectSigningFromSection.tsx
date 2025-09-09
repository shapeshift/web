import { Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { fromAssetId, toAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WalletConnectSigningWithSectionProps = {
  feeAssetId: string
  address: string
}

export const WalletConnectSigningWithSection: React.FC<WalletConnectSigningWithSectionProps> = ({
  feeAssetId,
  address,
}) => {
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))

  const { chainId } = fromAssetId(feeAssetId)
  const accountId = toAccountId({ chainId, account: address.toLowerCase() })

  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, { assetId: feeAssetId, accountId }),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  const fiatBalance = useMemo(() => {
    if (!cryptoBalance || !feeAssetMarketData?.price) return '0'
    return (parseFloat(cryptoBalance) * feeAssetMarketData.price).toString()
  }, [cryptoBalance, feeAssetMarketData?.price])

  const networkIcon = useMemo(() => {
    return feeAsset?.networkIcon ?? feeAsset?.icon
  }, [feeAsset?.networkIcon, feeAsset?.icon])

  if (!feeAsset) return null

  return (
    <Card bg={cardBg} borderRadius='2xl' px={4} py={4}>
      <HStack justify='space-between' align='center'>
        <HStack spacing={3} align='center'>
          <Image boxSize='24px' src={networkIcon} borderRadius='full' />
          <VStack align='flex-start' spacing={0}>
            <RawText fontSize='sm' color='text.subtle'>
              Signing with
            </RawText>
            <MiddleEllipsis value={address} fontSize='sm' />
          </VStack>
        </HStack>
        <VStack align='flex-end' spacing={0}>
          <Amount.Fiat
            value={fiatBalance}
            fontSize='lg'
            fontWeight='medium'
          />
          <Amount.Crypto
            value={cryptoBalance}
            symbol={feeAsset.symbol}
            fontSize='sm'
            color='text.subtle'
          />
        </VStack>
      </HStack>
    </Card>
  )
}
