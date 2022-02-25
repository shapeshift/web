import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export const CosmosActionButtons = (styleProps: FlexProps) => {
  const { cosmosStaking } = useModal()

  const handleUnstakeClick = () => {
    cosmosStaking.open({ assetId: 'cosmoshub-4/slip44:118', action: StakingAction.Unstake })
  }
  return (
    <Flex {...styleProps}>
      <Button
        flexGrow={1}
        colorScheme='blue'
        isActive={true}
        onClick={() => 'onClick'}
        isDisabled={false}
      >
        <Text translation={'defi.stake'} fontWeight='bold' color='white' />
      </Button>
      <Button onClick={handleUnstakeClick} flexGrow={1} variant='ghost' isActive={false}>
        <Text translation={'defi.unstake'} fontWeight='bold' color='white' />
      </Button>
    </Flex>
  )
}
