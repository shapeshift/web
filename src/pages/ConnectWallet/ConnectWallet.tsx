import { Button } from '@chakra-ui/button'
import { DarkMode } from '@chakra-ui/color-mode'
import { Center, Circle, Flex, Link, Stack } from '@chakra-ui/layout'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useHistory } from 'react-router-dom'
import AuroraBg from 'assets/aurorabg.jpg'
import { AuroraBackground } from 'components/AuroraBackground'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Page } from 'components/Layout/Page'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'

export const ConnectWallet = () => {
  const isMigrationMessageEnabled = useFeatureFlag('MigrationMessage')
  const { state, dispatch, doStartBridge, doSetupKeyring } = useWallet()
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
      <DarkMode>
        <Flex
          backgroundImage={AuroraBg}
          backgroundSize='cover'
          backgroundPosition='bottom center'
          width='100vw'
          alignItems='center'
          justifyContent='center'
        >
          <Flex flexDir='column' zIndex={4} width='full'>
            <Center flexDir='column' height='100vh' px={6}>
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
                translation={
                  isMigrationMessageEnabled ? 'connectWalletPage.body2' : 'connectWalletPage.body'
                }
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
                  // onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
                  onClick={() => doStartBridge()}
                  data-test='connect-wallet-button'
                >
                  Start Bridge (Do this first)
                </Button>
                <Button
                  size='lg'
                  zIndex={1}
                  colorScheme='blue'
                  // onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
                  onClick={() => {
                    doSetupKeyring()
                    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
                  }}
                  data-test='connect-wallet-button'
                >
                  Setup keyring (Do this next)
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
                {isMigrationMessageEnabled && (
                  <Link
                    href='https://shapeshift.zendesk.com/hc/en-us/articles/9172454414861'
                    isExternal
                    color='whiteAlpha.500'
                    _hover={{ color: 'white' }}
                  >
                    <Text translation='connectWalletPage.betaSunset' />
                  </Link>
                )}
              </Flex>
            </Flex>
          </Flex>
          <AuroraBackground />
        </Flex>
      </DarkMode>
    </Page>
  )
}
