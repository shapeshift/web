import { Box, Button, Center, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { WalletConnectEthSendTransactionCallRequest } from 'plugins/walletConnectToDapps/bridge/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { FormProvider, useForm } from 'react-hook-form'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { ConfirmData } from '../CallRequestCommon'
import { AddressSummaryCard } from './components/AddressSummaryCard'
import { AmountCard } from './components/AmountCard'
import { ContractInteractionBreakdown } from './components/ContractInteractionBreakdown'
import { GasFeeEstimateLabel } from './components/GasFeeEstimateLabel'
import { GasInput } from './components/GasInput'
import { ModalCollapsableSection } from './components/ModalCollapsableSection'
import { ModalSection } from './components/ModalSection'
import { TransactionAdvancedParameters } from './components/TransactionAdvancedParameters'
import { useCallRequestFees } from './hooks/useCallRequestFees'
import { useIsInteractingWithContract } from './hooks/useIsInteractingWithContract'

type CallRequest = WalletConnectEthSendTransactionCallRequest

type Props = {
  request: CallRequest['params'][number]
  onConfirm(data: ConfirmData): void
  onReject(): void
}

export const SendTransactionConfirmation = ({ request, onConfirm, onReject }: Props) => {
  const walletConnect = useWalletConnect()
  const { feeAsset } = useCallRequestFees(request)
  const { isInteractingWithContract } = useIsInteractingWithContract({
    evmChainId: walletConnect.evmChainId,
    address: request.to,
  })
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')
  const {
    state: { walletInfo },
  } = useWallet()
  const WalletIcon = walletInfo?.icon ?? FoxIcon

  const form = useForm<ConfirmData>({
    defaultValues: {
      nonce: request.nonce,
      gasLimit: request.gas,
      speed: FeeDataKey.Average,
    },
  })

  if (!walletConnect.connector || !walletConnect.dapp) return null
  const address = walletConnect.connector.accounts[0]

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
            address={request.to}
            showWalletProviderName={false}
            icon={<Image borderRadius='full' w='full' h='full' src={feeAsset?.icon} />}
          />
        </ModalSection>
        {isInteractingWithContract ? (
          <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.title'>
            <Card bg={cardBg} borderRadius='md' px={4} py={2}>
              <ContractInteractionBreakdown request={request} />
            </Card>
          </ModalSection>
        ) : (
          <ModalSection title='plugins.walletConnectToDapps.modal.sendTransaction.amount'>
            {feeAsset && <AmountCard value={request.value} assetId={feeAsset.assetId} />}
          </ModalSection>
        )}
        <ModalCollapsableSection
          title={
            <HStack flex={1} justify='space-between'>
              <Text translation='plugins.walletConnectToDapps.modal.sendTransaction.estGasCost' />
              <GasFeeEstimateLabel request={request} />
            </HStack>
          }
          icon={<FaGasPump />}
          defaultOpen={false}
        >
          <Box pt={2}>
            <GasInput request={request} />
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
          translation='plugins.walletConnectToDapps.modal.sendTransaction.description'
        />
        <VStack spacing={4}>
          <Button
            size='lg'
            width='full'
            colorScheme='blue'
            type='submit'
            onClick={form.handleSubmit(onConfirm)}
          >
            {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
          </Button>
          <Button size='lg' width='full' onClick={onReject}>
            {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
          </Button>
        </VStack>
      </VStack>
    </FormProvider>
  )
}
