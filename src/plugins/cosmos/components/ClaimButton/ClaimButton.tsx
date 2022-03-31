import { FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

type ClaimButtonProps = {
  assetId: CAIP19
}

export const ClaimButton = ({ assetId }: ClaimButtonProps & FlexProps) => {
  const { cosmosStaking } = useModal()

  const handleClaimClick = () => {
    cosmosStaking.open({ assetId, action: StakingAction.Claim })
  }

  return (
    <Button onClick={handleClaimClick} width='100%' colorScheme='green'>
      <Text translation={'defi.claim'} color='green' fontWeight='bold' />
    </Button>
  )
}
