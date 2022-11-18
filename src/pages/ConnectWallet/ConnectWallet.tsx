import { DarkMode } from '@chakra-ui/color-mode'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Flex, Link } from '@chakra-ui/layout'
import { Button, Image } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useHistory } from 'react-router-dom'
import logo from 'assets/kk-icon-gold.png'
import heroBgImage from 'assets/splash-bg.png'
import { Page } from 'components/Layout/Page'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import {ipcRenderer} from "electron";

export const ConnectWallet = () => {
  const isMigrationMessageEnabled = useFeatureFlag('MigrationMessage')
  const { state, dispatch } = useWallet()
  const hasWallet = Boolean(state.walletInfo?.deviceId) && state.isConnected
  const history = useHistory()
  const translate = useTranslate()
  const query = useQuery<{ returnUrl: string }>()

  const debugDevice = async function(){
    try{
      ipcRenderer.send('@app/restart', { })
    }catch(e){
      console.error(e)
    }
  }

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
    hasWallet && history.push(path ?? '/dapps')
  }, [history, hasWallet, query, state, dispatch])

  return (
    <Page>
      <DarkMode>
        <Flex
          backgroundImage={heroBgImage}
          backgroundSize='cover'
          backgroundPosition='bottom center'
          width='100%'
          height='100%'
          alignItems='center'
          justifyContent='center'
        >
          <Flex
            flexDir='column'
            alignItems='center'
            justifyContent='center'
            zIndex={4}
            width='100vw'
            height='100vh'
          >
            <Flex
              flex={1}
              flexDir='column'
              justifyContent='center'
              height='100vh'
              width='60%'
              px={6}
            >
              <Image objectFit='cover' width='70px' src={logo} />
              <Flex flexDir='row' letterSpacing='-2px' my={6}>
                <RawText
                  textAlign='left'
                  color='white'
                  width='80%'
                  fontWeight='light'
                  lineHeight={1}
                  fontSize='6xl'
                  userSelect={'none'}
                >
                  {translate('connectWalletPage.nextFrontier')}
                </RawText>
              </Flex>
              <Text
                userSelect={'none'}
                color='white'
                fontSize='lg'
                mb={12}
                textAlign='left'
                translation='connectWalletPage.protectYourCrypto'
              />
              <Button
                as={Link}
                isExternal
                width='160px'
                href='https://keepkey.myshopify.com/'
                rightIcon={<ExternalLinkIcon />}
                colorScheme='blue'
              >
                {translate('connectWalletPage.buyKeepKey')}
              </Button>
            </Flex>
            <Flex
                direction={'column'}
                gap={4}
                width='full'
                position={{ base: 'static', md: 'fixed' }}
                zIndex={3}
                py={3}
                px={4}
                bottom={20}
                alignItems={'center'}
            >
              <Button
                  width='360px'
                  rightIcon={<ExternalLinkIcon />}
                  colorScheme='green'
                  onClick={debugDevice}
              >
                {translate('connectWalletPage.troubleshoot')}
              </Button>
            </Flex>
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
                <small>debug: {JSON.stringify(state.deviceState)}</small>
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
                    href='https://github.com/shapeshift'
                    isExternal
                    color='whiteAlpha.500'
                    _hover={{ color: 'white' }}
                  >
                    <Text translation='connectWalletPage.poweredBy' />
                  </Link>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </DarkMode>
    </Page>
  )
}
