import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton, VStack } from '@chakra-ui/react'
import { Image } from '@chakra-ui/react'
import { AprTag } from 'features/defi/components/AprTag/AprTag'
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

export const Staked = ({ assetId }: GetStartedProps) => {
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
      <Box pt='38px' pb='70px' px='24px'>
        <ModalCloseButton borderRadius='full' />
        <Flex
          direction='column'
          maxWidth='595px'
          alignItems='center'
          justifyContent='space-between'
        >
          <Flex width='100%' justifyContent='center' alignItems='center' marginBottom='35px'>
            <Image src={osmosis} width='100%' minWidth='15px' maxWidth='30px' marginRight='13px' />
            <Text translation={'Osmos Staking'} fontSize='18px' fontWeight='bold' />
          </Flex>
          <Flex width='100%'>
            <Flex width='50%' height='20px'>
              <Text translation={'Staked'} marginRight='20px' fontSize='16px' />
              <AprTag percentage='1.25' />
            </Flex>
            <Flex direction='column' width='50%' alignItems='flex-end'>
              <Text translation={'$42,4242,42'} fontWeight='semibold' />
              <Text translation={'708.00 OSMO'} color='gray.500' />
            </Flex>
          </Flex>
          <Flex justifyContent='space-between' width='100%' mb='20px'>
            <Button width='190px'>
              <Text translation={'Stake'} fontWeight='bold' color='white' />
            </Button>
            <Button width='190px'>
              <Text translation={'Unstake'} fontWeight='bold' color='white' />
            </Button>
          </Flex>
          <Flex width='100%'>
            <Flex width='50%' height='20px'>
              <Text translation={'Rewards'} fontSize='16px' />
            </Flex>
            <Flex direction='column' width='50%' alignItems='flex-end' width='100%'>
              <Text translation={'$42,4242,42'} fontWeight='semibold' color='green.500' />
              <Text translation={'708.00 OSMO'} color='gray.500' />
            </Flex>
          </Flex>
          <Button width='100%' backgroundColor='#144241'>
            <Text translation={'Claim'} fontWeight='bold' color='#00cd98' />
          </Button>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
