import { Box, Button, HStack, Image, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, toAccountId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { GasSelectionMenu } from './GasSelectionMenu'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

type WalletConnectSigningFooterProps = {
  address: string | null
  chainId: ChainId | null
  transaction?: TransactionParams
  onConfirm: (customTransactionData?: CustomTransactionData) => void
  onReject: () => void
  isSubmitting: boolean
}

type WalletConnectSigningWithSectionProps = {
  feeAssetId: string
  address: string
}

const WalletConnectSigningWithSection: React.FC<WalletConnectSigningWithSectionProps> = ({
  feeAssetId,
  address,
}) => {
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))

  const { chainId } = fromAssetId(feeAssetId)
  const accountId = toAccountId({ chainId, account: address.toLowerCase() })

  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, { assetId: feeAssetId, accountId }),
  )

  const fiatBalance = useAppSelector(state =>
    selectPortfolioUserCurrencyBalanceByFilter(state, { assetId: feeAssetId, accountId }),
  )

  const networkIcon = useMemo(() => {
    return feeAsset?.networkIcon ?? feeAsset?.icon
  }, [feeAsset?.networkIcon, feeAsset?.icon])

  if (!feeAsset) return null

  return (
    <HStack justify='space-between' align='center' w='full'>
      <HStack spacing={3} align='center'>
        <Image boxSize='24px' src={networkIcon} borderRadius='full' />
        <VStack align='flex-start' spacing={0}>
          <RawText fontSize='sm' color='text.subtle'>
            Signing with
          </RawText>
          <MiddleEllipsis value={address} fontSize='sm' />
        </VStack>
      </HStack>
      <VStack align='flex-end' spacing={0}>
        <Amount.Fiat value={fiatBalance} fontSize='lg' fontWeight='medium' />
        <Amount.Crypto
          value={cryptoBalance}
          symbol={feeAsset.symbol}
          fontSize='sm'
          color='text.subtle'
        />
      </VStack>
    </HStack>
  )
}

export const WalletConnectModalSigningFooter: FC<WalletConnectSigningFooterProps> = ({
  address,
  chainId,
  transaction,
  onConfirm,
  onReject,
  isSubmitting,
}) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId ?? ''))

  // Try to get form context - will be null if no FormProvider exists
  let formContext: ReturnType<typeof useFormContext<CustomTransactionData>> | null = null
  try {
    formContext = useFormContext<CustomTransactionData>()
  } catch {
    // No FormProvider available, this is expected for message signing
    formContext = null
  }

  const handleSubmit = useCallback(() => {
    if (formContext) {
      formContext.handleSubmit(onConfirm)()
    } else {
      onConfirm(undefined)
    }
  }, [formContext, onConfirm])

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
        {feeAsset && (
          <WalletConnectSigningWithSection feeAssetId={feeAsset.assetId} address={address ?? ''} />
        )}

        {transaction && chainId && <GasSelectionMenu transaction={transaction} chainId={chainId} />}
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
            isDisabled={isSubmitting}
            _disabled={disabledProp}
          >
            {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
