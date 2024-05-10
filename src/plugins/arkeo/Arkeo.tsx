import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Button, Flex, Grid, Heading, Image, Link, useColorModeValue } from '@chakra-ui/react'
import { cosmosAssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import ArkeoBg from 'assets/arkeo-bg.jpg'
import NodeImage from 'assets/node.svg'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { foxEthLpAssetId, foxEthStakingAssetIdV9 } from 'state/slices/opportunitiesSlice/constants'
import type { DefiType, OpportunityId } from 'state/slices/opportunitiesSlice/types'

import { FoxTokenHolders } from './FoxTokenHolders'
import { LpCards } from './LpCards'
import { StakingCards } from './StakingCards'

type OpportunityReturn = {
  [k in DefiType]: OpportunityId[]
}

const FOXY_STAKING_CONTRACT = 'eip155:1/erc20:0xee77aa3fd23bbebaf94386dd44b548e9a785ea4b'

const opportunities: OpportunityReturn = {
  staking: [FOXY_STAKING_CONTRACT, foxEthStakingAssetIdV9, cosmosAssetId] as OpportunityId[],
  lp: [foxEthLpAssetId],
}

const arrowForwardIcon = <ArrowForwardIcon />
const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const reverseFlexDir: ResponsiveValue<Property.FlexDirection> = {
  base: 'column-reverse',
  lg: 'row',
}
const gridTemplateColumns = { base: '1fr', lg: '1fr 1fr', xl: '1fr 1fr 1fr' }
const flexBasis = { base: 'auto', lg: '583px' }

export const ArkeoPage = () => {
  const translate = useTranslate()
  const linkColor = useColorModeValue('blue.500', 'blue.200')
  const { create, dispatch } = useWallet()
  const bgImage = useColorModeValue('none', ArkeoBg)

  const handleCreateCtaClick = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    create(isMobileApp ? KeyManager.Mobile : KeyManager.Native)
  }, [create, dispatch])

  return (
    <Main backgroundImage={bgImage} backgroundSize='cover' px={8}>
      <SEO title={translate('navBar.arkeo')} />
      <Flex flexDir={reverseFlexDir} gap={8}>
        <Flex flexDir='column' gap={8} flexBasis={flexBasis}>
          <Flex flexDir='column' gap={4}>
            <Heading fontSize='2xl'>
              <Text translation='arkeo.whatIsArkeo.title' />
            </Heading>
            <Flex>
              <RawText fontSize='lg' color='text.subtle'>
                {`
              ${translate('arkeo.whatIsArkeo.bodyParts.1')} `}
                <Link
                  color={linkColor}
                  isExternal
                  href='https://shapeshift.com/library/foxchain-shapeshift-partners-with-coinbase-cloud'
                >
                  {translate('arkeo.whatIsArkeo.bodyParts.2')}
                </Link>
                {` 
              ${translate('arkeo.whatIsArkeo.bodyParts.3')}
              ${translate('arkeo.whatIsArkeo.bodyParts.4')}
              `}
                <Link
                  isExternal
                  color={linkColor}
                  href='https://learn.bybit.com/blockchain/nakamoto-coefficient-decentralization/'
                >
                  {translate('arkeo.whatIsArkeo.bodyParts.5')}
                </Link>
                {` ${translate('arkeo.whatIsArkeo.bodyParts.6')}`}
              </RawText>
            </Flex>
          </Flex>
          <Flex flexDir='column' gap={4}>
            <Heading fontSize='2xl'>
              <Text translation='arkeo.whoQualifies.title' />
            </Heading>
            <Text fontSize='lg' color='text.subtle' translation='arkeo.whoQualifies.body' />
          </Flex>
        </Flex>
        <Flex flex={1} alignItems='center' justifyContent='center'>
          <Box width='full' maxWidth='400px'>
            <svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='0 0 437 102' fill='none'>
              <g clipPath='url(#a)'>
                <path
                  fill='#3BE0FF'
                  d='M50.32.68C22.53.68 0 23.21 0 51s22.53 50.32 50.32 50.32S100.64 78.79 100.64 51 78.11.68 50.32.68Zm23.97 68.95H64.02c-2.55 0-4.9-1.35-6.19-3.54l-6.35-11.8s-.04-.06-.06-.1l4.56-2.64v-6.54l-5.66-3.27-5.66 3.27v6.54l4.56 2.64s-.04.06-.06.1l-6.35 11.8a7.173 7.173 0 0 1-6.19 3.54H26.35c-2.28 0-3.7-2.48-2.54-4.44l23.97-40.76c1.14-1.94 3.94-1.94 5.08 0l23.97 40.75c1.16 1.96-.26 4.44-2.54 4.44v.01Z'
                />
                <path
                  fill='currentColor'
                  d='M143.06 23.54h16.56l22.14 54.75h-16.39l-2.53-7.1h-22.98l-2.53 7.1h-16.39l22.14-54.75h-.02Zm15.46 35.31-6.51-18.5c-.51-1.35-.59-1.86-.68-2.2 0 0-.17.76-.68 2.2l-6.51 18.5H158.52ZM193.41 23.54h24.16c16.81 0 25.43 9.72 25.43 21.63 0 6.34-2.87 12.84-8.62 16.81l10.22 16.31h-18.33l-6.25-11.75c-1.69.17-2.62.25-3.97.25h-6.59v11.49h-16.05V23.54Zm24.33 29.65c4.98 0 8.28-3.63 8.28-8.03 0-4.4-3.38-8.03-8.2-8.03h-8.36v16.05h8.28v.01ZM256.95 23.54H273v26.28c.93-1.69 1.86-3.63 3.04-5.58l12.59-20.7h18.5l-16.9 23.82 19.69 30.92h-18.76l-10.39-18.33L273 70.17v8.11h-16.05V23.54ZM321.591 23.54h43.51v13.6h-27.46v6.68h26.36v13.43h-26.36v7.44h28.47v13.6h-44.52V23.54ZM377.94 50.92c0-15.63 11.74-28.22 29.32-28.22s29.4 12.59 29.4 28.22c0 15.63-11.83 28.39-29.4 28.39s-29.32-12.59-29.32-28.39Zm41.05-8.59-10.02-5.79c-1.03-.6-2.3-.6-3.33 0l-10.02 5.79c-1.03.6-1.67 1.7-1.67 2.88v11.58c0 1.19.63 2.29 1.67 2.89l10.02 5.79c1.03.59 2.3.59 3.33 0l10.02-5.79c1.03-.6 1.67-1.7 1.67-2.89V45.21c0-1.19-.63-2.29-1.67-2.88Z'
                />
              </g>
              <defs>
                <clipPath id='a'>
                  <path fill='currentColor' d='M0 .68h436.66v100.64H0z' />
                </clipPath>
              </defs>
            </svg>
          </Box>
        </Flex>
      </Flex>
      <Grid gridTemplateColumns={gridTemplateColumns} gap={4} mt={8}>
        <FoxTokenHolders />
        <StakingCards ids={opportunities.staking} />
        <LpCards ids={opportunities.lp} />
      </Grid>
      <Flex gap={4} py={12} flexDir={flexDir}>
        <Image src={NodeImage} boxSize='24' />
        <Flex flexDir='column' gap={4} alignItems='flex-start'>
          <Text translation='arkeo.footer.title' fontSize='2xl' mt={4} />
          <Button
            as={Link}
            variant='link'
            rightIcon={arrowForwardIcon}
            colorScheme='blue'
            size='lg'
            href='https://snapshot.org/#/shapeshiftdao.eth/proposal/0xcc1e83822fc7668a9d9e9136e5bd8973b7dc1ed766c2a0826d3e89d624e8b1c5'
            isExternal
          >
            {translate('arkeo.footer.cta')}
          </Button>
          <Flex
            gap={1}
            fontSize='sm'
            flexDir={flexDir}
            justifyContent='flex-start'
            alignItems='flex-start'
          >
            <Text translation='arkeo.footer.disclaimer.body' color='text.subtle' />
            <Button variant='link' colorScheme='blue' size='sm' onClick={handleCreateCtaClick}>
              {translate('arkeo.footer.disclaimer.cta')}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Main>
  )
}
