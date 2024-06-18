import { Box, Flex, SimpleGrid, Skeleton, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { useStakingBalanceOfQuery } from 'pages/RFOX/hooks/useStakingBalanceOfQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StatItem } from './StatItem'

const gridColumns = { base: 1, md: 2 }

type StatsProps = {
  stakingAssetId: AssetId
}

export const Stats: React.FC<StatsProps> = ({ stakingAssetId }) => {
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )
  const { data: contractBalanceOfUserCurrency, isSuccess: isContractBalanceOfUserCurrencySuccess } =
    useStakingBalanceOfQuery<string>({
      stakingAssetAccountAddress: RFOX_PROXY_CONTRACT_ADDRESS,
      stakingAssetId,
      select: data =>
        bn(fromBaseUnit(data.toString(), stakingAsset?.precision ?? 0))
          .times(stakingAssetMarketData.price)
          .toFixed(2),
      enabled: Boolean(stakingAssetMarketData),
    })

  if (!stakingAsset) return null

  return (
    <Box>
      <Flex alignItems='center' gap={2} mb={6} mt={2}>
        <Text translation='RFOX.totals' />
        <Skeleton isLoaded={true} display='flex' alignItems='center'>
          <Tag colorScheme='green' size='sm' alignItems='center'>
            ~
            <Amount.Percent value={1.67} fontWeight='medium' />
          </Tag>
        </Skeleton>
      </Flex>

      <SimpleGrid spacing={6} columns={gridColumns}>
        <StatItem
          description='RFOX.totalStaked'
          percentChangeDecimal={'0.0209'}
          amountUserCurrency={contractBalanceOfUserCurrency}
          isLoading={!isContractBalanceOfUserCurrencySuccess}
        />
        <StatItem
          description='RFOX.totalFeesCollected'
          amountUserCurrency='30600000'
          isLoading={false}
        />
        <StatItem
          description='RFOX.emissionsPool'
          helperTranslation='RFOX.emissionsPoolHelper'
          percentChangeDecimal={'0.3445'}
          amountUserCurrency='42890000'
          isLoading={false}
        />
        <StatItem
          description='RFOX.foxBurnAmount'
          percentChangeDecimal={'0.3445'}
          amountUserCurrency='15820310'
          isLoading={false}
        />
      </SimpleGrid>
    </Box>
  )
}
