import { Box, Button, HStack, VStack } from '@chakra-ui/react'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { useCallback } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { GasSelectionMenu } from '@/plugins/walletConnectToDapps/components/GasSelectionMenu'
import { WalletConnectSigningWithSection } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningFromSection'
import type { CustomTransactionData } from '@/plugins/walletConnectToDapps/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

type WalletConnectSigningFooterProps = {
  address: string | null
  chainId: string | null
  gasSelection?: {
    fees: Record<FeeDataKey, { txFee?: string; fiatFee: string }>
    feeAsset: Asset
    formMethods: UseFormReturn<CustomTransactionData>
  }
  onConfirm: (customTransactionData?: CustomTransactionData) => void
  onReject: () => void
  isSubmitting: boolean
}

export const WalletConnectSigningFooter: FC<WalletConnectSigningFooterProps> = ({
  address,
  chainId,
  gasSelection,
  onConfirm,
  onReject,
  isSubmitting,
}) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId ?? ''))

  const handleSubmit = useCallback(() => {
    if (gasSelection?.formMethods) {
      gasSelection.formMethods.handleSubmit(onConfirm)()
    } else {
      onConfirm(undefined)
    }
  }, [gasSelection?.formMethods, onConfirm])

  return (
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
        {/* Signing With Section */}
        {feeAsset && (
          <WalletConnectSigningWithSection feeAssetId={feeAsset.assetId} address={address ?? ''} />
        )}

        {/* Gas Selection (only if provided) */}
        {gasSelection && (
          <GasSelectionMenu
            fees={gasSelection.fees}
            feeAsset={gasSelection.feeAsset}
            formMethods={gasSelection.formMethods}
          />
        )}

        {/* Action Buttons */}
        <HStack spacing={4} w='full'>
          <Button
            size='lg'
            flex={1}
            onClick={onReject}
            isDisabled={isSubmitting}
            _disabled={disabledProp}
          >
            {translate('common.cancel')}
          </Button>
          <Button
            size='lg'
            flex={1}
            colorScheme='blue'
            type='submit'
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={gasSelection ? !gasSelection.fees : false}
            _disabled={disabledProp}
          >
            {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
