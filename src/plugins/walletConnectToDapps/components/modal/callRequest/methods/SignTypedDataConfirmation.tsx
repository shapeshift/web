import { Button, VStack } from '@chakra-ui/react'
import type { WalletConnectEthSignTypedDataCallRequest } from 'plugins/walletConnectToDapps/bridge/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import { AddressSummaryCard } from './components/AddressSummaryCard'
import { ModalSection } from './components/ModalSection'
import { TypedMessageInfo } from './components/TypedMessageInfo'

type CallRequest = WalletConnectEthSignTypedDataCallRequest

type SignTypedDataConfirmationPropsProps = {
  request: CallRequest
  onConfirm(): void
  onReject(): void
}

export const SignTypedDataConfirmation: React.FC<SignTypedDataConfirmationPropsProps> = ({
  request,
  onConfirm,
  onReject,
}) => {
  const walletConnect = useWalletConnect()
  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon

  if (!walletConnect.connector || !walletConnect.dapp) return null
  const address = walletConnect.connector.accounts[0]

  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
      </ModalSection>
      <TypedMessageInfo typedData={request.params[1]} />
      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button size='lg' width='full' colorScheme='blue' type='submit' onClick={onConfirm}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={onReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}
