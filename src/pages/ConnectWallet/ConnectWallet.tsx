import { DarkMode } from '@chakra-ui/color-mode'
import { Button, Center, Circle, Flex, Link, Stack } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useHistory } from 'react-router-dom'
import AuroraBg from 'assets/aurorabg.jpg'
import { AuroraBackground } from 'components/AuroraBackground'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { LanguageSelector } from 'components/LanguageSelector'
import { Page } from 'components/Layout/Page'
import { SEO } from 'components/Layout/Seo'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'

export const ConnectWallet = () => {
  const { state, dispatch, connectDemo } = useWallet()
  const hasWallet = Boolean(state.walletInfo?.deviceId)

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
    hasWallet && history.push(path ?? '/dashboard')
  }, [history, hasWallet, query, state, dispatch])
  return (
    <Page>
      <SEO title={translate('common.connectWallet')} />
      <Flex
        backgroundImage={AuroraBg}
        backgroundSize='cover'
        backgroundPosition='bottom center'
        width='100vw'
        alignItems='center'
        justifyContent='center'
        position={'relative'}
      >
        <Flex flexDir='column' zIndex={4} width='full'>
          <Center
            flexDir='column'
            // Full height with "-webkit-fill-available" polyfill, see https://chakra-ui.com/changelog/v2.3.1#styled-system-231
            height='$100vh'
            px={6}
          >
            <Flex
              position={'absolute'}
              // Account for iOS UI elements such as the Notch or Dynamic Island for top positioning
              top={'calc(var(--chakra-space-6) + env(safe-area-inset-top))'}
              right={6}
            >
              <LanguageSelector size={'sm'} />
            </Flex>
            <Circle size='100px' mb={6}>
              <FoxIcon boxSize='100%' color='white' />
            </Circle>
            <Flex
              flexDir='row'
              textAlign='center'
              letterSpacing='-4px'
              fontSize={{ base: '6xl', lg: '8xl' }}
              mb={6}
            >
              <RawText color='white' fontWeight='light' lineHeight='1' userSelect={'none'}>
                {translate('connectWalletPage.exploreThe')}{' '}
                <RawText color='white' fontWeight='bold' as='span'>
                  {translate('connectWalletPage.defiUniverse')}
                </RawText>
              </RawText>
            </Flex>
            <Text
              userSelect={'none'}
              color='white'
              fontSize='lg'
              mb={12}
              textAlign='center'
              translation={'connectWalletPage.body2'}
            />
            <Stack
              alignItems='center'
              spacing={{ base: 2, md: 8 }}
              mx='auto'
              direction={{ base: 'column', md: 'row' }}
            >
              <Button
                size='lg'
                zIndex={1}
                colorScheme='blue'
                onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
                data-test='connect-wallet-button'
              >
                <Text translation='connectWalletPage.cta' />
              </Button>
              <Flex alignItems='center' justifyContent='center'>
                <Text
                  color='whiteAlpha.500'
                  fontSize='lg'
                  fontWeight='bold'
                  textAlign='center'
                  translation='common.or'
                />
              </Flex>
              <DarkMode>
                <Button
                  size='lg'
                  zIndex={1}
                  variant='outline'
                  onClick={connectDemo}
                  isLoading={state.isLoadingLocalWallet}
                  data-test='connect-demo-wallet-button'
                >
                  <Text translation='connectWalletPage.viewADemo' />
                </Button>
              </DarkMode>
            </Stack>
          </Center>
          <Flex
            direction={'column'}
            gap={4}
            width='full'
            position={{ base: 'static', md: 'fixed' }}
            zIndex={3}
            py={3}
            px={4}
            bottom={0}
            alignItems={'center'}
          >
            <Flex width='full' alignItems='center' justifyContent='center' gap={8}>
              <Link
                href='/#/legal/terms-of-service'
                color='whiteAlpha.500'
                _hover={{ color: 'white' }}
              >
                <Text translation='common.terms' />
              </Link>
              <Link
                href='/#/legal/privacy-policy'
                color='whiteAlpha.500'
                _hover={{ color: 'white' }}
              >
                <Text translation='common.privacy' />
              </Link>
            </Flex>
          </Flex>
        </Flex>
        <AuroraBackground />
      </Flex>
    </Page>
  )
}
