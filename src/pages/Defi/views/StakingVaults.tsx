import {
  Box,
  Flex,
  Heading,
  Link,
  Skeleton,
  Stack,
  Text as CText,
  useColorModeValue,
} from '@chakra-ui/react'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { AllEarnOpportunities } from 'components/StakingVaults/AllEarnOpportunities'
import { RawText } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const DefiHeader = () => {
  const translate = useTranslate()
  return (
    <Box>
      <Heading>{translate('defi.defi')}</Heading>
    </Box>
  )
}

const FoxFarmCTA = () => {
  const translate = useTranslate()
  const { farmingApr, loaded: isFarmingAprLoaded } = useFarmingApr()
  const ethAsset = useAppSelector(state => selectAssetById(state, 'eip155:1/slip44:60'))
  const foxAsset = useAppSelector(state =>
    selectAssetById(state, 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'),
  )
  const { icon: ethAssetIcon } = ethAsset
  const { icon: foxAssetIcon } = foxAsset
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
          <AssetIcon ml={-3} p={0.5} boxSize='40px' src={ethAssetIcon} />
          <AssetIcon ml={-2} boxSize='40px' src={foxAssetIcon} />
          <CText ml='5' fontWeight='normal' fontSize={{ base: 'md', md: 'lg' }}>
            {translate('defi.clickHereToEarn')}
            <Skeleton display='inline-block' isLoaded={isFarmingAprLoaded}>
              <Amount.Percent as='span' value={farmingApr ?? ''} />
            </Skeleton>
            {translate('defi.byFarming')}
          </CText>
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
