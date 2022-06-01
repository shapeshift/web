import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton, VStack } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { History } from 'history'
import { DefiModalHeader } from 'plugins/cosmos/components/DefiModalHeader/DefiModalHeader'
import { StakeRoutes } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { GetStartedManagerRoutes } from './GetStartedCommon'

type GetStartedProps = {
  assetId: AssetId
  stakingRouterHistory: History
}

// TODO: Abstract me in a service when I start to get too big
const ASSET_ID_TO_MAX_APR: Record<AssetId, string> = {
  'cosmos:cosmoshub-4/slip44:118': '12',
  'cosmos:osmosis-1/slip44:118': '60',
}

export const GetStarted = ({ assetId, stakingRouterHistory }: GetStartedProps) => {
  const history = useHistory()
  const location = useLocation()
  const handleLearnMoreClick = () => {
    history.push({
      pathname: GetStartedManagerRoutes.LearnMore,
      state: { background: location },
    })
  }

  const handleStartStakingClick = () => {
    stakingRouterHistory?.push({
      pathname: StakeRoutes.Stake,
      state: { background: location },
    })
  }

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const maxApr = ASSET_ID_TO_MAX_APR[assetId]

  return (
    <Box pt='51px' pb='20px' px='24px'>
      <ModalCloseButton borderRadius='full' />
      <Flex direction='column' maxWidth='395px' alignItems='center' justifyContent='space-between'>
        <DefiModalHeader
          headerImageSrc={asset.icon}
          headerImageMaxWidth={68}
          headerText={['defi.modals.getStarted.header', { assetName: asset.name, maxApr }]}
        />
        <Box textAlign='center'>
          <Text translation='defi.modals.getStarted.body' color='gray.500' fontWeight='semibold' />
        </Box>

        <Box width='100%'>
          <Box textAlign='center' pb='16px'>
            <Text
              translation='defi.modals.getStarted.userProtectionInfo'
              color='gray.500'
              fontSize='13px'
              mt='32px'
            />
          </Box>
          <VStack spacing={4} align='center' width='100%'>
            <Button
              size='lg'
              zIndex={1}
              width='100%'
              colorScheme='blue'
              onClick={handleStartStakingClick}
            >
              <Text translation='defi.modals.getStarted.cta.startStaking' />
            </Button>
            <Button
              size='lg'
              zIndex={1}
              variant='ghost'
              colorScheme='white'
              onClick={handleLearnMoreClick}
            >
              <Text translation='defi.modals.getStarted.cta.learnMore' />
            </Button>
          </VStack>
        </Box>
      </Flex>
    </Box>
  )
}
