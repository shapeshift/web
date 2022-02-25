import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export const StakingButtons = (styleProps?: FlexProps) => {
  const { cosmosStaking } = useModal()

  const handleStakingClick = () => {
    cosmosStaking.open({ assetId: 'cosmoshub-4/slip44:118', action: StakingAction.Stake })
  }

  const handleUnstakingClick = () => {
    cosmosStaking.open({ assetId: 'cosmoshub-4/slip44:118', action: StakingAction.Unstake })
  }
  return (
    <Flex
      justifyContent='space-between'
      flexWrap='wrap'
      height={{ base: '100px', sm: 'auto' }}
      {...styleProps}
    >
      <Button onClick={handleStakingClick} width={{ base: '100%', sm: '190px' }}>
        <Text translation={'defi.stake'} fontWeight='bold' color='white' />
      </Button>
      <Button onClick={handleUnstakingClick} width={{ base: '100%', sm: '190px' }}>
        <Text translation={'defi.unstake'} fontWeight='bold' color='white' />
      </Button>
    </Flex>
  )
}
