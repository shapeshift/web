import { Box, Flex, Heading, Link, Stack, useColorModeValue } from '@chakra-ui/react'
import { getConfig } from 'config'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'
import { RawText } from 'components/Text'
import { Text } from 'components/Text'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

const FoxFarmCTA = () => {
  const apr = getConfig().REACT_APP_ETH_FOX_APR
  const ethLogoSrc = 'https://assets.coincap.io/assets/icons/eth@2x.png'
  const foxLogoSrc = 'https://assets.coincap.io/assets/icons/fox@2x.png'
  const hoverBg = useColorModeValue('gray.100', 'gray.750')
  return (
    <Card variant='outline' my={1}>
      <Stack
        as={Link}
        isExternal
        href='https://fox.shapeshift.com/fox-farming'
        direction={{ base: 'column', xl: 'row' }}
        alignItems='center'
        justifyContent='space-between'
        _hover={{ textDecoration: 'none', bgColor: hoverBg }}
        px={{ base: 3, md: 4 }}
        py={4}
      >
        <Flex alignItems='center' mb={{ base: 2, sm: 0 }}>
          <RawText
            alignSelf='flex-end'
            lineHeight={'1.1'}
            fontSize={{ base: 25, sm: 30 }}
            zIndex={1}
          >
            🚜
          </RawText>
          <AssetIcon ml={-3} boxSize='40px' src={ethLogoSrc} />
          <AssetIcon ml={-2} boxSize='40px' src={foxLogoSrc} />
          <Text
            ml={5}
            fontWeight='normal'
            fontSize={{ base: 'md', md: 'lg' }}
            translation={['defi.earnCopy', { apr }]}
          />
        </Flex>
      </Stack>
    </Card>
  )
}

export const StakingVaults = () => {
  return (
    <Main titleComponent={<DefiHeader />}>
      <FoxFarmCTA />
      <AllEarnOpportunities />
    </Main>
  )
}
