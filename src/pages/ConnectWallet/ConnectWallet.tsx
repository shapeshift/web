import '@rainbow-me/rainbowkit/styles.css'

import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  Stack,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { KnownChainIds } from '@shapeshiftoss/types'
import { knownChainIds } from 'constants/chains'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useHistory } from 'react-router-dom'
import { useWalletClient } from 'wagmi'
import SplashSidebar from 'assets/splash-sidebar.jpg'
import { AssetIcon } from 'components/AssetIcon'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import { LanguageSelector } from 'components/LanguageSelector'
import { Page } from 'components/Layout/Page'
import { SEO } from 'components/Layout/Seo'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile } from 'lib/globals'
import { isSome } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import { MobileConnect } from './MobileConnect'

const IncludeChains = [
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.LitecoinMainnet,
  KnownChainIds.CosmosMainnet,
  KnownChainIds.ThorchainMainnet,
]

const containerPt = { base: 8, lg: 0 }
const flexRightAlign = { base: 'center', lg: 'flex-end' }
const margin = { base: 0, lg: 'auto' }
const spacing = { base: 6, lg: 8 }
const display = { base: 'none', lg: 'flex' }
const width = { base: '100%', lg: 'auto' }
const maxWidth = { base: '100%', lg: '500px' }
const hover = { color: 'white' }
const langSelectorMarginTop = {
  base: -3,
  md: 6,
}

const metamaskIcon = <MetaMaskIcon />

export const ConnectWallet = () => {
  const { data: walletClient } = useWalletClient()

  console.log({ walletClient })

  const { state, dispatch, connectDemo, connect } = useWallet()
  const hasWallet = Boolean(state.walletInfo?.deviceId)
  const isSnapEnabled = useFeatureFlag('Snaps')
  const snapInfoBgColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const allNativeAssets = useMemo(() => {
    return knownChainIds
      .filter(chainId => IncludeChains.includes(chainId))
      .map(knownChainId => {
        const assetId = getChainAdapterManager().get(knownChainId)?.getFeeAssetId()!
        const asset = selectAssetById(store.getState(), assetId)
        return asset
      })
      .filter(isSome)
  }, [])

  const history = useHistory()
  const translate = useTranslate()
  const query = useQuery<{ returnUrl: string }>()
  useEffect(() => {
    // This handles reloading an asset's account page on Native/KeepKey. Without this, routing will break.
    // /:accountId/:assetId really is /:accountId/:chainId/:assetSubId e.g /accounts/eip155:1:0xmyPubKey/eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    // The (/:chainId/:assetSubId) part is URI encoded as one entity in the regular app flow in <AssetAccountRow />, using generatePath()
    // This applies a similar logic here, that works with history.push()
    const match = matchPath<{ accountId?: string; chainId?: string; assetSubId?: string }>(
      query.returnUrl,
      {
        path: '/accounts/:accountId/:chainId/:assetSubId',
      },
    )
    const path = match
      ? generatePath('/accounts/:accountId/:assetId', {
          accountId: match?.params?.accountId ?? '',
          assetId: `${match?.params?.chainId ?? ''}/${match?.params?.assetSubId ?? ''}`,
        })
      : query?.returnUrl
    hasWallet && history.push(path ?? '/trade')
  }, [history, hasWallet, query, state, dispatch])

  const handleMetaMaskConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    connect(KeyManager.MetaMask)
  }, [connect, dispatch])

  const renderChains = useMemo(() => {
    return allNativeAssets.map(asset => (
      <Tooltip key={asset.assetId} label={asset.networkName}>
        <span>
          <AssetIcon src={asset.networkIcon ?? asset.icon} size='sm' />
        </span>
      </Tooltip>
    ))
  }, [allNativeAssets])

  const handleConnectClick = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )

  if (isMobile) {
    return <MobileConnect />
  }

  return (
    <Page>
      <SEO title={translate('common.connectWallet')} />
      <Flex
        backgroundSize='cover'
        bg='blackAlpha.300'
        backgroundPosition='bottom center'
        width='100vw'
        alignItems='center'
        justifyContent='center'
        position={'relative'}
        flexDir='row-reverse'
      >
        <Flex
          flexDir='column'
          zIndex={4}
          width='full'
          bg='background.surface.base'
          minHeight='100vh'
          alignItems='flex-start'
          justifyContent='flex-start'
          p={6}
          pt={containerPt}
        >
          <Flex justifyContent='flex-end' marginTop={langSelectorMarginTop} width='100%' mb={3}>
            <LanguageSelector width='auto' size='sm' />
          </Flex>
          <Stack
            alignItems='center'
            spacing={spacing}
            my='auto'
            mx={margin}
            zIndex={4}
            maxWidth={maxWidth}
            width={width}
          >
            <Stack spacing={6}>
              <Stack textAlign='center' alignItems='center' fontWeight='bold'>
                <Stack spacing={2}>
                  <RawText color='blue.300' fontSize='xs' textTransform='uppercase'>
                    {translate('connectWalletPage.secondaryTitle')}
                  </RawText>
                  <Heading as='h1' fontSize='4xl'>
                    {translate('connectWalletPage.primaryTitle')}
                  </Heading>
                  <RawText color='text.subtle' fontSize='md' fontWeight='medium'>
                    {translate('connectWalletPage.primaryDescription')}
                  </RawText>
                </Stack>
                <Button
                  size='lg-multiline'
                  zIndex={1}
                  colorScheme='blue'
                  width='fit-content'
                  onClick={handleConnectClick}
                  data-test='connect-wallet-button'
                  my={4}
                >
                  <Text translation='connectWalletPage.cta' />
                </Button>
                <ConnectButton />
                {isSnapEnabled && (
                  <>
                    <Flex alignItems='center' justifyContent='center' width='full' gap={4}>
                      <Divider flex={1} borderColor='border.bold' opacity='1' />
                      <Text
                        color='text.subtle'
                        fontWeight='medium'
                        textAlign='center'
                        translation='common.or'
                        textTransform='uppercase'
                      />
                      <Divider flex={1} borderColor='border.bold' opacity='1' />
                    </Flex>
                    <Box bg={snapInfoBgColor} p={8} borderRadius='lg' mt={4}>
                      <HStack spacing={2} justify='center' wrap='wrap' mb={4}>
                        {renderChains}
                      </HStack>
                      <RawText fontWeight='medium' fontSize='md'>
                        {translate('connectWalletPage.snapDescription')}
                      </RawText>
                      <Button
                        width='fit-content'
                        size='lg-multiline'
                        onClick={handleMetaMaskConnect}
                        leftIcon={metamaskIcon}
                        mt={6}
                      >
                        {translate('walletProvider.metaMaskSnap.connectMetaMask')}
                      </Button>
                    </Box>
                  </>
                )}
              </Stack>
            </Stack>
            <Flex gap={1}>
              <RawText color='text.subtle'>{translate('connectWalletPage.dontHaveWallet')}</RawText>
              <Button
                onClick={connectDemo}
                isLoading={state.isLoadingLocalWallet}
                variant='link'
                colorScheme='blue'
                fontWeight='medium'
                textDecoration='underline'
              >
                {translate('connectWalletPage.viewADemo')}
              </Button>
            </Flex>
          </Stack>
          <Flex width='full' alignItems='center' justifyContent={flexRightAlign} gap={8} mt={4}>
            <Link href='/#/legal/terms-of-service' color='whiteAlpha.500' _hover={hover}>
              <Text translation='common.terms' />
            </Link>
            <Link href='/#/legal/privacy-policy' color='whiteAlpha.500' _hover={hover}>
              <Text translation='common.privacy' />
            </Link>
          </Flex>
        </Flex>
        <Flex
          flexDir='column'
          zIndex={1}
          width='full'
          maxWidth='400px'
          bgImage={SplashSidebar}
          backgroundSize='cover'
          display={display}
        >
          <Center
            flexDir='column'
            p={6}
            justifyContent='flex-start'
            // Full height with "-webkit-fill-available" polyfill, see https://chakra-ui.com/changelog/v2.3.1#styled-system-231
            height='$100vh'
          >
            <FoxIcon boxSize='4rem' />
          </Center>
        </Flex>
      </Flex>
    </Page>
  )
}
