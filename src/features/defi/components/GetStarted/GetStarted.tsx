import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton, VStack } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useHistory, useLocation } from 'react-router-dom'
import osmosis from 'assets/osmosis.svg'
import { Text } from 'components/Text'

import { DefiModalHeader } from '../DefiModalHeader/DefiModalHeader'

type GetStartedProps = {
  assetId: string
}

// TODO: Abstract me in a service when I start to get too big
const ASSET_ID_TO_MAX_APR = {
  'cosmoshub-4/slip44:118': '12'
}

export const GetStarted = ({ assetId }: GetStartedProps) => {
  const history = useHistory()
  const location = useLocation()
  const handleLearnMoreClick = () => {
    history.push({
      pathname: `/defi/modal/learn-more`,
      state: { background: location }
    })
  }
  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmo'
  }))(assetId)
  const maxApr = ASSET_ID_TO_MAX_APR['cosmoshub-4/slip44:118']
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box pt='51px' pb='20px' px='24px'>
        <ModalCloseButton borderRadius='full' />
        <Flex
          direction='column'
          maxWidth='395px'
          alignItems='center'
          justifyContent='space-between'
        >
          <DefiModalHeader
            headerImageSrc={osmosis}
            headerImageWidth={68}
            headerText={['defi.getStarted.header', { assetName: asset.name, maxApr }]}
          />
          <Box textAlign='center'>
            <Text translation='defi.getStarted.body' color='gray.500' fontWeight='semibold' />
          </Box>

          <Box width='100%'>
            <Box textAlign='center' pb='16px'>
              <Text
                translation='defi.getStarted.userProtectionInfo'
                color='gray.500'
                fontSize='12px'
              />
            </Box>
            <VStack spacing={4} align='center' width='100%'>
              <Button
                size='lg'
                zIndex={1}
                width='100%'
                colorScheme='blue'
                onClick={() => 'Start Staking'}
              >
                <Text translation='defi.getStarted.cta.startStaking' />
              </Button>
              <Button
                size='lg'
                zIndex={1}
                variant='ghost'
                colorScheme='white'
                onClick={handleLearnMoreClick}
              >
                <Text translation='defi.getStarted.cta.learnMore' />
              </Button>
            </VStack>
          </Box>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
