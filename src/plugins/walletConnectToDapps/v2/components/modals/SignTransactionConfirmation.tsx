import { Box, Button, Center, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { AmountCard } from 'plugins/walletConnectToDapps/components/modals/AmountCard'
import { ContractInteractionBreakdown } from 'plugins/walletConnectToDapps/components/modals/ContractInteractionBreakdown'
import { GasFeeEstimateLabel } from 'plugins/walletConnectToDapps/components/modals/GasFeeEstimateLabel'
import { GasInput } from 'plugins/walletConnectToDapps/components/modals/GasInput'
import { ModalCollapsableSection } from 'plugins/walletConnectToDapps/components/modals/ModalCollapsableSection'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { TransactionAdvancedParameters } from 'plugins/walletConnectToDapps/components/modals/TransactionAdvancedParameters'
import { useIsInteractingWithContract } from 'plugins/walletConnectToDapps/hooks/useIsInteractingWithContract'
import {
  convertHexToNumber,
  extractConnectedAccounts,
  getWalletAddressFromParams,
} from 'plugins/walletConnectToDapps/utils'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import { useCallRequestFees } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/methods/hooks/useCallRequestFees'
import type { EthSignTransactionCallRequest } from 'plugins/walletConnectToDapps/v2/types'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import type { FC } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertIsDefined } from 'lib/utils'

export const SignTransactionConfirmation: FC<
  WalletConnectRequestModalProps<EthSignTransactionCallRequest>
> = ({
  onConfirm: handleConfirm,
  onReject: handleReject,
  state: {
    modalData: { requestEvent },
    session,
  },
}) => {
  assertIsDefined(requestEvent)

  console.log('xxx requestEvent', { requestEvent, session })

  const { params } = requestEvent
  const { request, chainId } = params
  const { params: transactionParams } = request
  const tx = transactionParams[0]

  const connectedAccounts = extractConnectedAccounts(session)
  const address = getWalletAddressFromParams(connectedAccounts, params)
  const { feeAsset, fees } = useCallRequestFees(tx)
  const { isInteractingWithContract } = useIsInteractingWithContract({
    evmChainId: chainId,
    address: tx.to,
  })
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')
  const {
    state: { walletInfo },
  } = useWallet()
  const WalletIcon = walletInfo?.icon ?? FoxIcon

  const form = useForm<ConfirmData>({
    defaultValues: {
      nonce: tx.nonce ? convertHexToNumber(tx.nonce).toString() : undefined,
      gasLimit: tx.gas ? convertHexToNumber(tx.gas).toString() : undefined,
      speed: FeeDataKey.Average,
      customFee: {
        baseFee: '0',
        priorityFee: '0',
      },
    },
  })

  if (isInteractingWithContract === null)
    return (
      <Center p={8}>
        <CircularProgress />
      </Center>
    )

  return (
    <FormProvider {...form}>
      <VStack p={6} spacing={6} alignItems='stretch'>
        <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.sendingFrom'>
          <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
        </ModalSection>
        <ModalSection
          title={`plugins.walletConnectToDapps.modal.sendTransaction.${
            isInteractingWithContract ? 'interactingWith' : 'sendingTo'
          }`}
        >
          <AddressSummaryCard
            address={tx.to}
            showWalletProviderName={false}
            icon={<Image borderRadius='full' w='full' h='full' src={feeAsset?.icon} />}
          />
        </ModalSection>
        {isInteractingWithContract ? (
          <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.title'>
            <Card bg={cardBg} borderRadius='md' px={4} py={2}>
              <ContractInteractionBreakdown request={tx} />
            </Card>
          </ModalSection>
        ) : (
          <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.amount'>
            {feeAsset && <AmountCard value={tx.value ?? '0'} assetId={feeAsset.assetId} />}
          </ModalSection>
        )}
        <ModalCollapsableSection
          title={
            <HStack flex={1} justify='space-between'>
              <Text translation='plugins.walletConnectToDapps.modal.sendTransaction.estGasCost' />
              <GasFeeEstimateLabel request={tx} />
            </HStack>
          }
          icon={<FaGasPump />}
          defaultOpen={false}
        >
          <Box pt={2}>
            <GasInput request={tx} />
          </Box>
        </ModalCollapsableSection>
        <ModalCollapsableSection
          title={translate(
            'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
          )}
          icon={<FaWrench />}
          defaultOpen={false}
        >
          <TransactionAdvancedParameters />
        </ModalCollapsableSection>
        <Text
          fontWeight='medium'
          color='gray.500'
          translation='plugins.walletConnectToDapps.modal.signTransaction.description'
        />
        <VStack spacing={4}>
          <Button
            size='lg'
            width='full'
            colorScheme='blue'
            type='submit'
            onClick={form.handleSubmit(handleConfirm)}
            isLoading={form.formState.isSubmitting}
            disabled={!fees}
          >
            {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
          </Button>
          <Button size='lg' width='full' onClick={handleReject}>
            {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
          </Button>
        </VStack>
      </VStack>
    </FormProvider>
  )
}
