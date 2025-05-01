import { Card, CardBody, CardHeader, Flex, Heading, HStack, SimpleGrid } from '@chakra-ui/react'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const gridColumns = { base: 1, md: 2 }

type OverviewProps = {
  activeAccountNumber: number
}
export const Overview = ({ activeAccountNumber }: OverviewProps) => {
  const translate = useTranslate()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
  const accountId = accountNumberAccounts?.[thorchainChainId]

  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, { accountId, assetId: tcyAssetId }),
  )

  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, tcyAssetId),
  )

  const userCurrencyBalance = useMemo(
    () => bnOrZero(cryptoBalance).times(tcyMarketData.price).toFixed(2),
    [cryptoBalance, tcyMarketData.price],
  )

  if (!tcyAsset) return null

  return (
    <Card>
      <CardHeader>
        <HStack>
          <AssetIcon assetId={tcyAssetId} />
          <Amount.Crypto value='0' symbol='TCY' fontSize='2xl' />
        </HStack>
      </CardHeader>
      <CardBody pb={6}>
        <Heading size='sm' mb={6}>
          {translate('TCY.myPosition')}
        </Heading>
        <SimpleGrid spacing={6} columns={gridColumns}>
          <Flex flexDir='column' alignItems='flex-start'>
            <HelperTooltip label={translate('TCY.myStakedBalanceHelper', { symbol: 'TCY' })}>
              <RawText color='text.subtle'>{translate('TCY.myStakedBalance')}</RawText>
            </HelperTooltip>
            <Amount.Crypto value={cryptoBalance} symbol={tcyAsset.symbol} fontSize='2xl' />
            <Amount.Fiat value={userCurrencyBalance} fontSize='sm' color='text.subtle' />
          </Flex>
          <Flex flexDir='column' alignItems='flex-start'>
            <HelperTooltip label={translate('TCY.timeStakedHelper', { symbol: 'TCY' })}>
              <RawText color='text.subtle'>{translate('TCY.timeStaked')}</RawText>
            </HelperTooltip>
            <RawText fontSize='2xl'>0 days</RawText>
          </Flex>
        </SimpleGrid>
      </CardBody>
    </Card>
  )
}
