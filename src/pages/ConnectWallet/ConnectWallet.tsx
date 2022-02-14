import { Button } from '@chakra-ui/button'
import { DarkMode } from '@chakra-ui/color-mode'
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Badge, Center, Circle, Flex } from '@chakra-ui/layout'
import { Keyring } from '@shapeshiftoss/hdwallet-core'
import * as native from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { Dispatch, useEffect } from 'react'
import { isFirefox } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import Orbs from 'assets/orbs.svg'
import OrbsStatic from 'assets/orbs-static.png'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Page } from 'components/Layout/Page'
import { RawText, Text } from 'components/Text'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { ActionTypes, InitialState, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useQuery } from 'hooks/useQuery/useQuery'
import { colors } from 'theme/colors'

type WalletProps = {
  state: InitialState
  dispatch: Dispatch<ActionTypes>
}

async function connectCypressWallet(
  keyring: Keyring,
  dispatch: Dispatch<ActionTypes>,
  walletSeed: string,
  walletPassword: string
) {
  // Import wallet
  const vault = await Vault.create()
  vault.meta.set('createdAt', Date.now())
  vault.set('#mnemonic', walletSeed)
  vault.seal()
  await vault.setPassword(walletPassword)
  vault.meta.set('name', 'CypressWallet')
  await Promise.all([navigator.storage?.persist?.(), vault.save()])
  // Load wallet
  const deviceId = vault.id
  const adapter = SUPPORTED_WALLETS[KeyManager.Native].adapter.useKeyring(keyring)
  const wallet = (await adapter.pairDevice(deviceId)) as NativeHDWallet
  const mnemonic = (await vault.get('#mnemonic')) as native.crypto.Isolation.Core.BIP39.Mnemonic
  mnemonic.addRevoker?.(() => vault.revoke())
  await wallet.loadDevice({ mnemonic, deviceId })
  const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
  dispatch({
    type: WalletActions.SET_WALLET,
    payload: {
      wallet,
      name,
      icon,
      deviceId,
      meta: { label: vault.meta.get('name') as string }
    }
  })
  dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
}

export const ConnectWallet = ({ state, dispatch }: WalletProps) => {
  const isCypressTest =
    localStorage.hasOwnProperty('cypressWalletSeed') &&
    localStorage.hasOwnProperty('cypressWalletPassword')
  const hasWallet = Boolean(state.walletInfo?.deviceId)

  const history = useHistory()
  const translate = useTranslate()
  const query = useQuery<{ returnUrl: string }>()
  useEffect(() => {
    hasWallet && history.push(query?.returnUrl ? query.returnUrl : '/dashboard')
    // Programmatic login for Cypress tests
    if (isCypressTest) {
      const walletId = localStorage.getItem('walletIdCypress') || ''
      const walletPwd = localStorage.getItem('walletPwdCypress') || ''
      connectCypressWallet(state.keyring, dispatch, walletId, walletPwd)
        .then(() => {
          // The second `!state.isConnected` filters any intent to redirect if the redirecting had already happened.
          if (!state.isConnected) {
            dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
            history.push(query?.returnUrl ? query.returnUrl : '/dashboard')
          }
        })
        .catch(e => console.error(e))
    }
  }, [history, hasWallet, query, state, dispatch, isCypressTest])
  return (
    <Page>
      <Flex
        width='full'
        bg='gray.900'
        position='fixed'
        py={3}
        px={4}
        alignItems='center'
        bottom={0}
        justifyContent='center'
      >
        <DarkMode>
          <Text color='white' fontWeight='bold' translation='connectWalletPage.shapeshift' />
          <Badge colorScheme='blue' ml={2}>
            {translate('connectWalletPage.alpha')}
          </Badge>
        </DarkMode>
      </Flex>
      <Center
        flexDir='column'
        height='100vh'
        backgroundImage={colors.altBg}
        px={6}
        _after={{
          position: 'absolute',
          content: '""',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: `url(${isFirefox ? OrbsStatic : Orbs})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center'
        }}
      >
        <Circle size='100px' mb={6}>
          <FoxIcon boxSize='100%' color='white' />
        </Circle>
        <Flex flexDir='row' textAlign='center' fontSize={{ base: '6xl', lg: '8xl' }} mb={6}>
          <RawText color='white' fontWeight='medium' lineHeight='1'>
            {translate('connectWalletPage.exploreThe')}{' '}
            <RawText color='blue.500' fontWeight='bold' as='span'>
              {translate('connectWalletPage.defiUniverse')}
            </RawText>
          </RawText>
        </Flex>
        <Text
          color='gray.500'
          fontSize='lg'
          mb={12}
          textAlign='center'
          translation='connectWalletPage.body'
        />
        <Button
          size='lg'
          zIndex={1}
          colorScheme='blue'
          rightIcon={<ArrowForwardIcon />}
          onClick={() => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })}
          data-test='connect-wallet-button'
        >
          <Text translation='connectWalletPage.cta' />
        </Button>
      </Center>
    </Page>
  )
}
