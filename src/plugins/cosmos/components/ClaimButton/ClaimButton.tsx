import { FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { StakeRoutes } from 'plugins/cosmos/components/modals/Staking/Staking'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'

type ClaimButtonProps = {
  assetId: CAIP19
}

export const ClaimButton = ({ assetId }: ClaimButtonProps & FlexProps) => {
  const history = useHistory()

  const handleClaimClick = () => {
    history.push(StakeRoutes.ClaimConfirm, {
      assetId
    })
  }

  return (
    <Button
      onClick={handleClaimClick}
      py='12px'
      px='20px'
      colorScheme='green'
      variant='ghost-filled'
    >
      <Text translation={'defi.claim'} fontWeight='bold' fontSize='16' />
    </Button>
  )
}
