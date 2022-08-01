import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton, VStack } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { History } from 'history'
import { DefiModalHeader } from 'plugins/cosmos/components/DefiModalHeader/DefiModalHeader'
import {
  isCosmosAssetId,
  isOsmosisAssetId,
  StakeRoutes,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectValidatorByAddress } from 'state/slices/selectors'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from 'state/slices/validatorDataSlice/constants'
import { useAppSelector } from 'state/store'

import { GetStartedManagerRoutes } from './GetStartedCommon'

type GetStartedProps = {
  assetId: AssetId
  stakingRouterHistory: History
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
  const defaultValidatorAddress = useMemo(() => {
    if (isCosmosAssetId(assetId)) return SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS
    if (isOsmosisAssetId(assetId)) return SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS

    return ''
  }, [assetId])
  const validatorData = useAppSelector(state =>
    selectValidatorByAddress(state, defaultValidatorAddress),
  )
  const apr = useMemo(
    () => bnOrZero(validatorData?.apr).times(100).toFixed(2).toString(),
    [validatorData],
  )

  return (
    <Box pt='51px' pb='20px' px='24px'>
      <ModalCloseButton borderRadius='full' />
      <Flex direction='column' maxWidth='395px' alignItems='center' justifyContent='space-between'>
        <DefiModalHeader
          headerImageSrc={asset.icon}
          headerImageMaxWidth={68}
          headerText={['defi.modals.getStarted.header', { assetName: asset.name, apr }]}
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
