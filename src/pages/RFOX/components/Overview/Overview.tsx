import { Card, CardBody, CardHeader, Flex, Skeleton } from '@chakra-ui/react'
import { type AccountId, type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { fromBaseUnit } from 'lib/math'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingInfo } from './StakingInfo'
import { Stats } from './Stats'

type OverviewProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
}

export const Overview: React.FC<OverviewProps> = ({ stakingAssetId, stakingAssetAccountId }) => {
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const {
    data: userStakingBalanceCryptoPrecision,
    isSuccess: isUserStakingBalanceCryptoPrecisionSuccess,
    isLoading: isUserStakingBalanceCryptoPrecisionLoading,
  } = useStakingInfoQuery({
    stakingAssetAccountAddress,
    select: ([stakingBalance]) =>
      fromBaseUnit(stakingBalance.toString(), stakingAsset?.precision ?? 0),
  })

  if (!stakingAsset) return null

  return (
    <Card>
      <CardHeader pt={6} borderBottomWidth={1} borderColor='border.base'>
        <Flex alignItems='center' gap={2} mb={6}>
          <AssetIcon size='sm' assetId={stakingAssetId} key={stakingAssetId} showNetworkIcon />
          <Flex flexDir='column'>
            <Skeleton isLoaded={isUserStakingBalanceCryptoPrecisionSuccess}>
              <Amount.Crypto
                fontWeight='bold'
                fontSize='2xl'
                value={userStakingBalanceCryptoPrecision ?? '0'}
                symbol={stakingAsset.symbol}
              />
            </Skeleton>
          </Flex>
        </Flex>
        <StakingInfo
          stakingAssetId={stakingAssetId}
          stakingAssetAccountAddress={stakingAssetAccountAddress}
          userStakingBalanceCryptoPrecision={userStakingBalanceCryptoPrecision}
          isUserStakingBalanceCryptoPrecisionLoading={isUserStakingBalanceCryptoPrecisionLoading}
        />
      </CardHeader>
      <CardBody pb={6}>
        <Stats stakingAssetId={stakingAssetId} />
      </CardBody>
    </Card>
  )
}
