import { Box, Button, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

import { AddressSummaryCard } from './AddressSummaryCard'
import { AmountCard } from './AmountCard'
import { ContractInteractionBreakdown } from './ContractInteractionBreakdown'
import { GasFeeEstimateLabel } from './GasFeeEstimateLabel'
import { GasInput } from './GasInput'
import { ModalSection } from './ModalSection'
import { TransactionAdvancedParameters } from './TransactionAdvancedParameters'
import { useCallRequestFees } from './useCallRequestFees'

type CallRequest = WalletConnectEthSendTransactionCallRequest
export type ConfirmData = {
  nonce?: string
  gasLimit?: string
  speed: FeeDataKey | 'custom'
  customFee?: {
    fiatFee: string
    txFee: string
  }
}

type Props = {
  request: CallRequest['params'][number]
  onConfirm(data: ConfirmData): void
  onReject(): void
}

export const SendTransactionConfirmation = ({ request, onConfirm, onReject }: Props) => {
  const walletConnect = useWalletConnect()
  const { feeAsset } = useCallRequestFees(request)
  const [isInteractingWithContract, setIsInteractingWithContract] = useState<boolean | null>(null)
  useEffect(() => {
    ;(async () => {
      const result = await getWeb3InstanceByChainId(walletConnect.ethChainId).eth.getCode(
        request.to,
      )
      // this util function returns '0x' if the recipient address is not a contract address
      setIsInteractingWithContract(result !== '0x')
    })()
  }, [request.to, walletConnect.ethChainId])
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

  if (!walletConnect.bridge || !walletConnect.dapp) return null
  const address = walletConnect.bridge?.connector.accounts[0]

  if (isInteractingWithContract === null) return <CircularProgress />

  return (
    <FormProvider {...form}>
      <VStack p={6} spacing={6} alignItems='stretch'>
        <Box>
          <Text
            fontWeight='medium'
            translation='plugins.walletConnectToDapps.modal.sendTransaction.sendingFrom'
            mb={4}
          />
          <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
        </Box>
        <Box>
          <Text
            fontWeight='medium'
            translation={`plugins.walletConnectToDapps.modal.sendTransaction.${
              isInteractingWithContract ? 'interactingWith' : 'sendingTo'
            }`}
            mb={4}
          />
          <AddressSummaryCard
            address={request.to}
            showWalletProviderName={false}
            icon={<Image borderRadius='full' w='full' h='full' src={feeAsset?.icon} />}
          />
        </Box>
        {isInteractingWithContract ? (
          <Box>
            <Text
              fontWeight='medium'
              translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.title'
              mb={4}
            />
            <Card bg={cardBg} borderRadius='md' px={4} py={2}>
              <ContractInteractionBreakdown request={request} />
            </Card>
          </Box>
        ) : (
          <Box>
            <Text
              fontWeight='medium'
              translation='plugins.walletConnectToDapps.modal.sendTransaction.amount'
              mb={4}
            />
            {feeAsset && <AmountCard value={request.value} assetId={feeAsset.assetId} />}
          </Box>
        )}
        <ModalSection
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
        </ModalSection>

        <ModalSection
          title={translate(
            'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
          )}
          icon={<FaWrench />}
          defaultOpen={false}
        >
          <TransactionAdvancedParameters />
        </ModalSection>

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
