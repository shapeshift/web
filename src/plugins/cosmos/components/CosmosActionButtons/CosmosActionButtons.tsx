import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import {
  StakeRoutes,
  StakingPath,
  UnstakingPath,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { matchPath, useHistory } from 'react-router-dom'
import { Text } from 'components/Text'

type CosmosActionButtonsProps = {
  asset: Asset
}
export const CosmosActionButtons = ({
  asset,
  ...styleProps
}: CosmosActionButtonsProps & FlexProps) => {
  const history = useHistory()

  const handleOverviewClick = () => {
    history.push(StakeRoutes.Overview)
  }

  const handleStakeClick = () => {
    history.push(StakeRoutes.Stake)
  }

  const handleUnstakeClick = () => {
    history.push(StakeRoutes.Unstake)
  }

  const isOverview = matchPath(history.location.pathname, {
    path: [StakeRoutes.Overview],
    exact: true,
  })

  const isStake = matchPath(history.location.pathname, {
    path: [StakeRoutes.Stake, StakingPath.Confirm, StakingPath.Broadcast],
    exact: true,
  })

  const isUnstake = matchPath(history.location.pathname, {
    path: [StakeRoutes.Unstake, UnstakingPath.Confirm, UnstakingPath.Broadcast],
    exact: true,
  })

  return (
    <Flex width='100%' borderRadius='12px' justifyContent='center' {...styleProps}>
      <Button
        colorScheme='blue'
        variant={!isOverview ? 'ghost' : 'ghost-filled'}
        onClick={handleOverviewClick}
        mx='2px'
        isDisabled={false}
      >
        <Text translation='defi.overview' fontWeight='normal' />
      </Button>
      <Button
        colorScheme='blue'
        variant={!isStake ? 'ghost' : 'ghost-filled'}
        onClick={handleStakeClick}
        isDisabled={false}
        mx='2px'
      >
        <Text translation='defi.stake' fontWeight='normal' />
      </Button>
      <Button
        colorScheme='blue'
        onClick={handleUnstakeClick}
        variant={!isUnstake ? 'ghost' : 'ghost-filled'}
        mx='2px'
      >
        <Text translation='defi.unstake' fontWeight='normal' />
      </Button>
    </Flex>
  )
}
