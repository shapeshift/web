import { Button, VStack } from '@chakra-ui/react'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { TypedMessageInfo } from 'plugins/walletConnectToDapps/components/modals/TypedMessageInfo'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type { EthSignTypedDataCallRequest } from 'plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/WalletConnectModalManager'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertIsDefined } from 'lib/utils'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

export const EIP155SignTypedDataConfirmation: FC<
  WalletConnectRequestModalProps<EthSignTypedDataCallRequest>
> = ({ onConfirm, onReject, state }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { address, message, chainId } = useWalletConnectState(state)
  assertIsDefined(message)

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const walletIcon = useMemo(() => <WalletIcon w='full' h='full' />, [WalletIcon])

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

  return (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard
          address={address ?? ''}
          icon={walletIcon}
          explorerAddressLink={connectedAccountFeeAsset?.explorerAddressLink}
        />
      </ModalSection>
      <TypedMessageInfo typedData={message} />
      <Text
        fontWeight='medium'
        color='text.subtle'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button
          size='lg'
          width='full'
          colorScheme='blue'
          type='submit'
          onClick={handleConfirm}
          _disabled={disabledProp}
          isLoading={isLoading}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button
          size='lg'
          width='full'
          onClick={handleReject}
          isDisabled={isLoading}
          _disabled={disabledProp}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </>
  )
}
