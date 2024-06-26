import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Button,
  Center,
  Circle,
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { knownChainIds } from 'constants/chains'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useHistory } from 'react-router-dom'
import NightSky from 'assets/nightsky.jpg'
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
const flexAlign = { base: 'center', lg: 'flex-start' }
const flexRightAlign = { base: 'center', lg: 'flex-end' }
const textAlign: ResponsiveValue<any> = { base: 'center', lg: 'left' }
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
  const { state, dispatch, connectDemo, connect } = useWallet()
  const hasWallet = Boolean(state.walletInfo?.deviceId)
  const isSnapEnabled = useFeatureFlag('Snaps')

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

  const evmChains = useMemo(() => {
    return knownChainIds
      .filter(isEvmChainId)
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

  const renderEvmChainText = useMemo(() => {
    return evmChains.map(asset => asset.networkName).join(', ')
  }, [evmChains])

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
            {isMobile ? (
              <Stack spacing={4} textAlign={textAlign}>
                <Flex flexDir='row' textAlign='left' fontSize='2xl' letterSpacing='tight'>
                  <RawText color='white' lineHeight='1' userSelect={'none'}>
                    {translate('connectWalletPage.exploreThe')}{' '}
                    <RawText color='white' fontWeight='bold' as='span'>
                      {translate('connectWalletPage.defiUniverse')}
                    </RawText>
                  </RawText>
                </Flex>
                <Text
                  userSelect={'none'}
                  color='text.subtle'
                  fontSize='lg'
                  textAlign='left'
                  translation={'connectWalletPage.body'}
                />
              </Stack>
            ) : isSnapEnabled ? (
              <>
                <Stack spacing={6}>
                  <Stack spacing={4} textAlign={textAlign}>
                    <Heading as='h3' fontSize='2xl'>
                      {translate('walletProvider.metaMaskSnap.secondaryTitle')}
                    </Heading>
                    <RawText color='text.subtle' fontSize='lg'>
                      {translate('walletProvider.metaMaskSnap.secondaryBody')}
                    </RawText>
                    <HStack spacing={4} justify={flexAlign} wrap='wrap' mb={4}>
                      {renderChains}
                      <Tooltip label={renderEvmChainText}>
                        <RawText color='text.subtle'>
                          {translate('walletProvider.metaMaskSnap.andMore')}
                        </RawText>
                      </Tooltip>
                    </HStack>
                  </Stack>
                  <Button
                    width='full'
                    size='lg-multiline'
                    onClick={handleMetaMaskConnect}
                    leftIcon={metamaskIcon}
                  >
                    {translate('walletProvider.metaMaskSnap.connectMetaMask')}
                  </Button>
                </Stack>
                <Flex alignItems='center' justifyContent='center' width='full' gap={4}>
                  <Divider flex={1} borderColor='border.bold' opacity='1' />
                  <Text
                    color='text.subtle'
                    fontWeight='medium'
                    textAlign='center'
                    translation='common.or'
                  />
                  <Divider flex={1} borderColor='border.bold' opacity='1' />
                </Flex>
              </>
            ) : (
              <Stack spacing={6}>
                <Heading as='h3' fontSize='2xl'>
                  {translate('connectWalletPage.welcomeBack')}
                </Heading>
                <RawText fontSize='lg' color='text.subtle'>
                  {translate('connectWalletPage.welcomeBody')}
                </RawText>
              </Stack>
            )}
            <Button
              size='lg-multiline'
              zIndex={1}
              colorScheme='blue'
              width='full'
              onClick={handleConnectClick}
              data-test='connect-wallet-button'
            >
              <Text translation='connectWalletPage.cta' />
            </Button>
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
          bgImage={NightSky}
          backgroundSize='cover'
          display={display}
        >
          <Center
            flexDir='column'
            // Full height with "-webkit-fill-available" polyfill, see https://chakra-ui.com/changelog/v2.3.1#styled-system-231
            height='$100vh'
            px={6}
          >
            <Flex>
              <Circle size='52px' mb='auto' mt={12}>
                <FoxIcon boxSize='100%' color='white' />
              </Circle>
            </Flex>
            <Stack mt='auto' spacing={6}>
              <Flex flexDir='row' textAlign='left' fontSize='2xl' letterSpacing='tight'>
                <RawText color='white' lineHeight='1' userSelect={'none'}>
                  {translate('connectWalletPage.title')}
                </RawText>
              </Flex>
              <Divider borderWidth={2} opacity='1' borderColor='white' maxWidth='80px' />
              <Text
                userSelect={'none'}
                color='text.subtle'
                fontSize='lg'
                mb={12}
                textAlign='left'
                translation={'connectWalletPage.body'}
              />
            </Stack>
          </Center>
        </Flex>
      </Flex>
    </Page>
  )
}
