import { Box, Button, HStack, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { assertIsDefined } from '@/lib/utils'
import { EIP712MessageDisplay } from '@/plugins/walletConnectToDapps/components/modals/EIP712MessageDisplay'
import { WalletConnectPeerHeader } from '@/plugins/walletConnectToDapps/components/modals/WalletConnectPeerHeader'
import { WalletConnectSigningWithSection } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningFromSection'
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
      <EIP712MessageDisplay typedData={message} chainId={chainId} />
      <Box
        bg='transparent'
        borderTopRadius='24px'
        borderTop='1px solid'
        borderLeft='1px solid'
        borderRight='1px solid'
        borderColor='rgba(255, 255, 255, 0.08)'
        px={8}
        py={4}
        mx={-6}
        mb={-6}
      >
        <VStack spacing={4}>
          {connectedAccountFeeAsset && (
            <WalletConnectSigningWithSection
              feeAssetId={connectedAccountFeeAsset.assetId}
              address={address ?? ''}
            />
          )}
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
        </VStack>
      </Box>
    </>
  )
}
