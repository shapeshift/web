import {
  Box,
  Button,
  Card,
  Center,
  HStack,
  Image,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { AmountCard } from 'plugins/walletConnectToDapps/components/modals/AmountCard'
import { ContractInteractionBreakdown } from 'plugins/walletConnectToDapps/components/modals/ContractInteractionBreakdown'
import { GasFeeEstimateLabel } from 'plugins/walletConnectToDapps/components/modals/GasFeeEstimateLabel'
import { GasInput } from 'plugins/walletConnectToDapps/components/modals/GasInput'
import { ModalCollapsableSection } from 'plugins/walletConnectToDapps/components/modals/ModalCollapsableSection'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { TransactionAdvancedParameters } from 'plugins/walletConnectToDapps/components/modals/TransactionAdvancedParameters'
import { useCallRequestEvmFees } from 'plugins/walletConnectToDapps/hooks/useCallRequestEvmFees'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  EthSendTransactionCallRequest,
  EthSignTransactionCallRequest,
} from 'plugins/walletConnectToDapps/types'
import { EIP155_SigningMethod } from 'plugins/walletConnectToDapps/types'
import { convertHexToNumber } from 'plugins/walletConnectToDapps/utils'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/WalletConnectModalManager'
import type { FC } from 'react'
import { useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { fromHex, isHex } from 'viem'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const faGasPumpIcon = <FaGasPump />
const faWrenchIcon = <FaWrench />

export const EIP155TransactionConfirmation: FC<
  WalletConnectRequestModalProps<EthSendTransactionCallRequest | EthSignTransactionCallRequest>
> = ({ onConfirm: handleConfirm, onReject: handleReject, state }) => {
  const { address, transaction, isInteractingWithContract, method, chainId } =
    useWalletConnectState(state)

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const { isLoading, feeAsset, fees, feeAssetPrice } = useCallRequestEvmFees(state)

  const { showErrorToast } = useErrorToast()
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')
  const {
    state: { walletInfo },
  } = useWallet()
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const walletIcon = useMemo(() => <WalletIcon w='full' h='full' />, [WalletIcon])
  const addressSummaryCardIcon = useMemo(
    () => <Image borderRadius='full' w='full' h='full' src={feeAsset?.icon} />,
    [feeAsset?.icon],
  )

  const form = useForm<CustomTransactionData>({
    defaultValues: {
      nonce: transaction?.nonce ? convertHexToNumber(transaction.nonce).toString() : undefined,
      gasLimit:
        transaction?.gasLimit ?? transaction?.gas
          ? convertHexToNumber((transaction?.gasLimit ?? transaction?.gas)!).toString()
          : undefined,
      speed: FeeDataKey.Average,
      customFee: {
        baseFee: '0',
        priorityFee: '0',
      },
    },
  })

  const estimatedGasTitle = useMemo(
    () => (
      <HStack flex={1} justify='space-between'>
        <Text translation='plugins.walletConnectToDapps.modal.sendTransaction.estGasCost' />
        <GasFeeEstimateLabel fees={fees} feeAsset={feeAsset} feeAssetPrice={feeAssetPrice} />
      </HStack>
    ),
    [fees, feeAsset, feeAssetPrice],
  )

  const value = useMemo(() => {
    if (!feeAsset) return '0'

    const valueCryptoBaseUnit =
      transaction?.value && isHex(transaction.value)
        ? fromHex(transaction.value, 'bigint').toString()
        : transaction?.value
    const valueCryptoPrecision = fromBaseUnit(valueCryptoBaseUnit ?? '0', feeAsset.precision)
    return valueCryptoPrecision
  }, [feeAsset, transaction?.value])

  if (isLoading || isInteractingWithContract === null)
    return (
      <Center p={8}>
        <CircularProgress />
      </Center>
    )

  // if the transaction is missing the dapp sent invalid params
  if (!transaction) {
    showErrorToast({
      message: 'unable to handle tx due to invalid params',
      params: state.modalData.requestEvent?.params,
    })
    handleReject()
    return null
  }

  return (
    <FormProvider {...form}>
      <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.sendingFrom'>
        <AddressSummaryCard
          address={address ?? ''}
          icon={walletIcon}
          explorerAddressLink={connectedAccountFeeAsset?.explorerAddressLink}
        />
      </ModalSection>
      <ModalSection
        title={`plugins.walletConnectToDapps.modal.sendTransaction.${
          isInteractingWithContract ? 'interactingWith' : 'sendingTo'
        }`}
      >
        <AddressSummaryCard
          address={transaction.to}
          showWalletProviderName={false}
          icon={addressSummaryCardIcon}
          explorerAddressLink={connectedAccountFeeAsset?.explorerAddressLink}
        />
      </ModalSection>
      {isInteractingWithContract ? (
        <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.title'>
          <Card bg={cardBg} borderRadius='md' px={4} py={2}>
            <ContractInteractionBreakdown
              request={transaction}
              feeAsset={connectedAccountFeeAsset}
            />
          </Card>
        </ModalSection>
      ) : (
        <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.amount'>
          {feeAsset && <AmountCard value={value} assetId={feeAsset.assetId} />}
        </ModalSection>
      )}
      <ModalCollapsableSection title={estimatedGasTitle} icon={faGasPumpIcon} defaultOpen={false}>
        <Box pt={2}>
          <GasInput fees={fees} />
        </Box>
      </ModalCollapsableSection>
      <ModalCollapsableSection
        title={translate(
          'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
        )}
        icon={faWrenchIcon}
        defaultOpen={false}
      >
        <TransactionAdvancedParameters />
      </ModalCollapsableSection>
      <Text
        fontWeight='medium'
        color='text.subtle'
        translation={
          method === EIP155_SigningMethod.ETH_SEND_TRANSACTION
            ? 'plugins.walletConnectToDapps.modal.sendTransaction.description'
            : 'plugins.walletConnectToDapps.modal.signTransaction.description'
        }
      />
      <VStack spacing={4}>
        <Button
          size='lg'
          width='full'
          colorScheme='blue'
          type='submit'
          onClick={form.handleSubmit(handleConfirm)}
          isLoading={form.formState.isSubmitting}
          isDisabled={!fees}
          _disabled={disabledProp}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button
          size='lg'
          width='full'
          onClick={handleReject}
          isDisabled={form.formState.isSubmitting}
          _disabled={disabledProp}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </FormProvider>
  )
}
