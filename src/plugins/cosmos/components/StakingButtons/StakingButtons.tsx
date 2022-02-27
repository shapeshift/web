import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

type StakingButtonsProps = {
  assetId: string
}

export const StakingButtons = ({ assetId, ...styleProps }: StakingButtonsProps & FlexProps) => {
  const { cosmosStaking } = useModal()

  const handleStakingClick = () => {
    cosmosStaking.open({ assetId, action: StakingAction.Stake })
  }

  const handleUnstakingClick = () => {
    cosmosStaking.open({ assetId, action: StakingAction.Unstake })
  }
  return (
    <Flex justifyContent='space-between' flexWrap='wrap' width='100%' {...styleProps}>
      <Button onClick={handleStakingClick} width={{ base: '100%', sm: '48%' }}>
        <Text translation={'defi.stake'} fontWeight='bold' color='white' />
      </Button>
      <Button onClick={handleUnstakingClick} width={{ base: '100%', sm: '48%' }}>
        <Text translation={'defi.unstake'} fontWeight='bold' color='white' />
      </Button>
    </Flex>
  )
}
