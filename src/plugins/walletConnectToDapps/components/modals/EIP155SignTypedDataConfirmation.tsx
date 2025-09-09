import { Button, HStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { FoxIcon } from '@/components/Icons/FoxIcon'
import { Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertIsDefined } from '@/lib/utils'
import { EIP712MessageDisplay } from '@/plugins/walletConnectToDapps/components/modals/EIP712MessageDisplay'
import { WalletConnectPeerHeader } from '@/plugins/walletConnectToDapps/components/modals/WalletConnectPeerHeader'
import { WalletConnectSigningFromSection } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningFromSection'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type { EthSignTypedDataCallRequest } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

export const EIP155SignTypedDataConfirmation: FC<
  WalletConnectRequestModalProps<EthSignTypedDataCallRequest>
> = ({ onConfirm, onReject, state, topic }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { address, message, chainId } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata
  assertIsDefined(message)

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const walletIcon = useMemo(
    () => (typeof WalletIcon === 'string' ? null : <WalletIcon w='full' h='full' />),
    [WalletIcon],
  )

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    await onConfirm()
    setIsLoading(false)
  }, [onConfirm])

  const handleReject = useCallback(async () => {
    setIsLoading(true)
    await onReject()
    setIsLoading(false)
  }, [onReject])

  if (!peerMetadata) return null

  return (
    <>
      <WalletConnectPeerHeader peerMetadata={peerMetadata} />
      <WalletConnectSigningFromSection
        address={address ?? ''}
        walletIcon={walletIcon}
        explorerAddressLink={connectedAccountFeeAsset?.explorerAddressLink}
      />
      <EIP712MessageDisplay typedData={message} chainId={chainId} />
      <Text
        fontWeight='medium'
        color='text.subtle'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <HStack spacing={4}>
        <Button
          size='lg'
          flex={1}
          onClick={handleReject}
          isDisabled={isLoading}
          _disabled={disabledProp}
        >
          {translate('common.cancel')}
        </Button>
        <Button
          size='lg'
          flex={1}
          colorScheme='blue'
          type='submit'
          onClick={handleConfirm}
          _disabled={disabledProp}
          isLoading={isLoading}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
      </HStack>
    </>
  )
}
