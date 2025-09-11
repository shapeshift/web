import { Box, Button, HStack, Image, VStack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
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

type WalletConnectSigningWithSectionProps = {
  accountId: AccountId
}

const WalletConnectSigningWithSection: React.FC<WalletConnectSigningWithSectionProps> = ({
  accountId,
}) => {
  const translate = useTranslate()
  const userAddress = useMemo(() => fromAccountId(accountId).account, [accountId])
  const chainId = useMemo(() => fromAccountId(accountId).chainId, [accountId])
  const feeAssetId = useAppSelector(state => selectFeeAssetByChainId(state, chainId)?.assetId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  const feeAssetBalanceCryptoPrecision = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, { assetId: feeAssetId, accountId }),
  )

  const feeAssetBalanceUserCurrency = useAppSelector(state =>
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
            {translate('plugins.walletConnectToDapps.modal.signingWith')}
          </RawText>
          <MiddleEllipsis value={userAddress} fontSize='sm' />
        </VStack>
      </HStack>
      <VStack align='flex-end' spacing={0}>
        <Amount.Fiat value={feeAssetBalanceUserCurrency} fontSize='lg' fontWeight='medium' />
        <Amount.Crypto
          value={feeAssetBalanceCryptoPrecision}
          symbol={feeAsset.symbol}
          fontSize='sm'
          color='text.subtle'
        />
      </VStack>
    </HStack>
  )
}

type WalletConnectSigningFooterProps = {
  accountId: AccountId
  transaction?: TransactionParams
  onConfirm: (customTransactionData?: CustomTransactionData) => void
  onReject: () => void
  isSubmitting: boolean
}

export const WalletConnectModalSigningFooter: FC<WalletConnectSigningFooterProps> = ({
  accountId,
  transaction,
  onConfirm,
  onReject,
  isSubmitting,
}) => {
  const chainId = useMemo(() => fromAccountId(accountId).chainId, [accountId])
  const translate = useTranslate()
  const formContext = useFormContext<CustomTransactionData>()

  const handleSubmit = useCallback(() => {
    formContext.handleSubmit(onConfirm)()
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
      mt={4}
    >
      <VStack spacing={4}>
        <WalletConnectSigningWithSection accountId={accountId} />
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
