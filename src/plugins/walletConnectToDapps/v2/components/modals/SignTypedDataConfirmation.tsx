import { Button, VStack } from '@chakra-ui/react'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { TypedMessageInfo } from 'plugins/walletConnectToDapps/components/modals/TypedMessageInfo'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/v2/hooks/useWalletConnectState'
import type { EthSignTypedDataCallRequest } from 'plugins/walletConnectToDapps/v2/types'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertIsDefined } from 'lib/utils'

export const SignTypedDataConfirmation: FC<
  WalletConnectRequestModalProps<EthSignTypedDataCallRequest>
> = ({ onConfirm: handleConfirm, onReject: handleReject, state }) => {
  const { address, message } = useWalletConnectState(state)
  assertIsDefined(message)

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon

  return (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
      </ModalSection>
      <TypedMessageInfo typedData={message} />
      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button
          size='lg'
          width='full'
          colorScheme='blue'
          type='submit'
          onClick={() => handleConfirm()}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={handleReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </>
  )
}
