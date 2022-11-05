import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton, VStack } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import type { History } from 'history'
import { DefiModalHeader } from 'plugins/cosmos/components/DefiModalHeader/DefiModalHeader'
import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectValidatorByAddress } from 'state/slices/selectors'
import { getDefaultValidatorAddressFromAssetId } from 'state/slices/validatorDataSlice/utils'
import { useAppSelector } from 'state/store'

import { GetStartedManagerRoutes } from './GetStartedCommon'

type GetStartedProps = {
  assetId: AssetId
  stakingRouterHistory: History
}

export const GetStarted = ({ assetId }: GetStartedProps) => {
  const history = useHistory()
  const location = useLocation()

  const handleLearnMoreClick = () => {
    history.push({
      pathname: GetStartedManagerRoutes.LearnMore,
      state: { background: location },
    })
  }

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const defaultValidatorAddress = useMemo(
    () => getDefaultValidatorAddressFromAssetId(assetId),
    [assetId],
  )
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
      <Flex direction='column' alignItems='center' justifyContent='space-between'>
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
            <Button size='lg' zIndex={1} width='100%' colorScheme='blue'>
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
