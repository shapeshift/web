import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { StakeRoutes } from 'plugins/cosmos/components/modals/Staking/Staking'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'

type CosmosActionButtonsProps = {
  activeRoute: StakeRoutes
  asset: Asset
}
export const CosmosActionButtons = ({
  activeRoute,
  asset,
  ...styleProps
}: CosmosActionButtonsProps & FlexProps) => {
  const history = useHistory()

  const handleClick = (route: StakeRoutes) => {
    history.push(route)
  }

  const isStakeAction = () => {
    return (
      activeRoute !== StakeRoutes.Stake &&
      activeRoute !== StakeRoutes.StakeConfirm &&
      activeRoute !== StakeRoutes.StakeBroadcast
    )
  }

  const isUnstakeAction = () => {
    return (
      activeRoute !== StakeRoutes.Unstake &&
      activeRoute !== StakeRoutes.UnstakeConfirm &&
      activeRoute !== StakeRoutes.UnstakeBroadcast
    )
  }

  return (
    <Flex width='100%' borderRadius='12px' my='12px' justifyContent='center' {...styleProps}>
      <Button
        colorScheme='blue'
        variant={activeRoute !== StakeRoutes.Overview ? 'ghost' : 'ghost-filled'}
        onClick={() => handleClick(StakeRoutes.Overview)}
        mx='2px'
        isDisabled={false}
      >
        <Text translation='defi.overview' fontWeight='normal' />
      </Button>
      <Button
        colorScheme='blue'
        variant={isStakeAction() ? 'ghost' : 'ghost-filled'}
        onClick={() => handleClick(StakeRoutes.Stake)}
        isDisabled={false}
        mx='2px'
      >
        <Text translation='defi.stake' fontWeight='normal' />
      </Button>
      <Button
        colorScheme='blue'
        onClick={() => handleClick(StakeRoutes.Unstake)}
        variant={isUnstakeAction() ? 'ghost' : 'ghost-filled'}
        mx='2px'
      >
        <Text translation='defi.unstake' fontWeight='normal' />
      </Button>
    </Flex>
  )
}
