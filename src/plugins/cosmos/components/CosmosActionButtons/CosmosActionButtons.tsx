import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

type CosmosActionButtonsProps = {
  activeAction: StakingAction
  asset: Asset
}
export const CosmosActionButtons = ({
  activeAction,
  asset,
  ...styleProps
}: CosmosActionButtonsProps & FlexProps) => {
  const { cosmosStaking } = useModal()

  const handleUnstakeClick = () => {
    cosmosStaking.open({ assetId: asset.caip19, action: StakingAction.Unstake })
  }

  const handleStakeClick = () => {
    cosmosStaking.open({ assetId: 'cosmoshub-4/slip44:118', action: StakingAction.Stake })
  }

  return (
    <Flex width='100%' bgColor='gray.850' borderRadius='12px' {...styleProps}>
      <Button
        flexGrow={1}
        colorScheme='blue'
        isActive={activeAction === StakingAction.Stake}
        variant={activeAction === StakingAction.Unstake ? 'ghost' : undefined}
        onClick={handleStakeClick}
        isDisabled={false}
      >
        <Text
          translation={['defi.stakeAsset', { assetSymbol: asset.symbol }]}
          fontWeight='bold'
          color='white'
        />
      </Button>
      <Button
        isActive={activeAction === StakingAction.Unstake}
        colorScheme='blue'
        onClick={handleUnstakeClick}
        flexGrow={1}
        variant={activeAction === StakingAction.Stake ? 'ghost' : undefined}
      >
        <Text
          translation={['defi.unstakeAsset', { assetSymbol: asset.symbol }]}
          fontWeight='bold'
          color='white'
        />
      </Button>
    </Flex>
  )
}
