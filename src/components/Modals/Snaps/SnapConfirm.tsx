import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Checkbox,
  Heading,
  ListItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  UnorderedList,
} from '@chakra-ui/react'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { knownChainIds } from 'constants/chains'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { enableShapeShiftSnap } from 'utils/snaps'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { useAppDispatch } from 'state/store'

import { fetchAccountForChainId } from './helpers'

type SnapConfirmProps = {
  onClose: () => void
}

export const SnapConfirm: React.FC<SnapConfirmProps> = ({ onClose }) => {
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstallationRequestComplete, setIsInstallationRequestComplete] = useState(false)
  const [hasAgreed, setHasAgreed] = useState(false)
  const [hasPinkySworeSeedPhraseIsBackedUp, setHasPinkySworeSeedPhraseIsBackedUp] = useState(false)
  const translate = useTranslate()
  const { state: walletState } = useWallet()
  const dispatch = useAppDispatch()
  const isSnapInstalled = useIsSnapInstalled()

  const discoverNonEvmAccounts = useCallback(async () => {
    const { wallet, deviceId: walletDeviceId } = walletState

    if (!wallet) return

    const nonEvmChainIds = knownChainIds.filter(
      chainId =>
        !isEvmChainId(chainId) &&
        walletSupportsChain({
          isSnapInstalled: true,
          chainId,
          wallet,
          checkConnectedAccountIds: false,
        }),
    )

    // fetch account 0 for each non-evm chain
    await Promise.all(
      nonEvmChainIds.map(async chainId => {
        await fetchAccountForChainId(chainId, wallet, walletDeviceId, dispatch, true, 0)
      }),
    )
  }, [dispatch, walletState])

  // We must wait for the snap installation to complete before we can discover non-evm accounts
  // This resolves a race condition on RPC request permissions to metamask on non-evm chains
  useEffect(() => {
    if (isInstallationRequestComplete && isSnapInstalled) {
      ;(async () => {
        await discoverNonEvmAccounts()
        onClose()
      })()
    }
  }, [discoverNonEvmAccounts, isInstallationRequestComplete, isSnapInstalled, onClose])

  const handleAddSnap = useCallback(async () => {
    setIsInstalling(true)
    await enableShapeShiftSnap()
    getMixPanel()?.track(MixPanelEvent.SnapInstalled)
    setIsInstallationRequestComplete(true)
  }, [])

  const handlePinkySwearSeedPhraseIsBackedUp = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setHasPinkySworeSeedPhraseIsBackedUp(event.target.checked),
    [],
  )

  const handleAgree = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setHasAgreed(event.target.checked),
    [],
  )

  // TODO: ackchually cancel, not use placebo
  const handleCancel = useCallback(() => setIsInstalling(false), [])

  if (isInstalling) {
    return (
      <ModalBody
        display='flex'
        flexDir='column'
        gap={4}
        alignItems='center'
        justifyContent='center'
        py={6}
      >
        <CircularProgress />
        {/* TODO: ackchually cancel, not use placebo - disabled for now */}
        <Button variant='ghost' isDisabled={true} onClick={handleCancel}>
          {translate('common.cancel')}
        </Button>
      </ModalBody>
    )
  }
  return (
    <>
      <ModalHeader textAlign='center'>
        <Heading as='h4'>{translate('walletProvider.metaMaskSnapConfirm.title')}</Heading>
      </ModalHeader>
      <ModalBody>
        <Alert status='warning' borderRadius='lg' mb={4}>
          <AlertIcon />
          <AlertDescription>
            {translate('walletProvider.metaMaskSnapConfirm.warningExperimental')}
          </AlertDescription>
        </Alert>
        <Alert status='error' borderRadius='lg' mb={4}>
          <AlertIcon />
          <AlertDescription>
            {translate('walletProvider.metaMaskSnapConfirm.warningBackup')}
          </AlertDescription>
        </Alert>
        <RawText fontWeight='bold'>
          {translate('walletProvider.metaMaskSnapConfirm.agreeIntro')}
        </RawText>
        <UnorderedList spacing={2} my={4}>
          <ListItem>
            {translate('walletProvider.metaMaskSnapConfirm.agreeItem1Parts.1')}{' '}
            <strong>{translate('walletProvider.metaMaskSnapConfirm.agreeItem1Parts.2')}</strong>{' '}
            {translate('walletProvider.metaMaskSnapConfirm.agreeItem1Parts.3')}
          </ListItem>
          <ListItem>
            {translate('walletProvider.metaMaskSnapConfirm.agreeItem2')}{' '}
            <RawText as='span' color='text.subtle'>
              (Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, THORChain, Cosmos)
            </RawText>
          </ListItem>
          <ListItem>{translate('walletProvider.metaMaskSnapConfirm.agreeItem3')}</ListItem>
          <ListItem>{translate('walletProvider.metaMaskSnapConfirm.agreeItem4')}</ListItem>
        </UnorderedList>
        <Checkbox onChange={handleAgree} fontWeight='bold'>
          {translate('walletProvider.metaMaskSnapConfirm.readAndUnderstood')}
        </Checkbox>
        <Checkbox onChange={handlePinkySwearSeedPhraseIsBackedUp} fontWeight='bold'>
          {translate('walletProvider.metaMaskSnapConfirm.seedBackedUp')}
        </Checkbox>
      </ModalBody>
      <ModalFooter gap={2}>
        <Button onClick={onClose}>{translate('common.cancel')}</Button>
        <Button
          colorScheme='blue'
          isDisabled={!(hasAgreed && hasPinkySworeSeedPhraseIsBackedUp)}
          onClick={handleAddSnap}
        >
          {translate('walletProvider.metaMaskSnapConfirm.acceptInstall')}
        </Button>
      </ModalFooter>
    </>
  )
}
