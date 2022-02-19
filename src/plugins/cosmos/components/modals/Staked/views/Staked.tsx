import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton } from '@chakra-ui/react'
import { Image } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { RewardsRow } from 'plugins/cosmos/components/RewardsRow/RewardsRow'
import { StakingButtons } from 'plugins/cosmos/components/StakingButtons/StakingButtons'
import { StakingRow } from 'plugins/cosmos/components/StakingRow/StakingRow'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import osmosis from 'assets/osmosis.svg'
import { Text } from 'components/Text'

type StakedProps = {
  assetId: string
}

// TODO: Wire up the whole component with staked data
export const Staked = ({ assetId }: StakedProps) => {
  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmo'
  }))(assetId)
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box pt='38px' pb='70px' px='24px'>
        <ModalCloseButton borderRadius='full' />
        <Flex
          direction='column'
          maxWidth='595px'
          minHeight='380px'
          alignItems='center'
          justifyContent='space-between'
        >
          <Flex width='100%' justifyContent='center' alignItems='center' marginBottom='35px'>
            <Image src={osmosis} width='100%' minWidth='15px' maxWidth='30px' marginRight='13px' />
            <Text
              translation={['defi.assetStaking', { assetName: asset.name }]}
              fontSize='18px'
              fontWeight='bold'
            />
          </Flex>
          <StakingRow />
          <StakingButtons />
          <UnbondingRow />
          <RewardsRow />
          <Button width='100%' colorScheme='darkTeal'>
            <Text translation={'defi.claim'} fontWeight='bold' color='#00cd98' />
          </Button>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
