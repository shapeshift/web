import { Box, Button, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import type { ethereum } from '@keepkey/chain-adapters'
import { FeeDataKey } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import type { WalletConnectEthSendTransactionCallRequest } from 'kkdesktop/walletconnect/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import Web3 from 'web3'
import { Card } from 'components/Card/Card'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import { AddressSummaryCard } from './AddressSummaryCard'
import { ContractInteractionBreakdown } from './ContractInteractionBreakdown'
import { GasFeeEstimateLabel } from './GasFeeEstimateLabel'
import { GasInput } from './GasInput'
import { ModalSection } from './ModalSection'
import { TransactionAdvancedParameters } from './TransactionAdvancedParameters'

type CallRequest = WalletConnectEthSendTransactionCallRequest
export type TxData = {
  nonce: string
  gasLimit: string
  maxPriorityFeePerGas: string
  maxFeePerGas: string
  data: string
  to: string
  value: string
}

type Props = {
  request: CallRequest['params'][number]
  onConfirm(txData: TxData): void
  onReject(): void
}

export const SendTransactionConfirmation: FC<Props> = ({ request, onConfirm, onReject }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const { state: walletState } = useWallet()
  const adapterManager = useMemo(() => getChainAdapterManager(), [])

  const form = useForm<any>({
    defaultValues: {
      nonce: '',
      gasLimit: '',
      maxPriorityFeePerGas: '',
      maxFeePerGas: '',
      currentFeeAmount: '',
    },
  })

  const [gasFeeData, setGasFeeData] = useState(undefined as any)

  // determine which gasLimit to use: user input > from the request > or estimate
  const requestGas = parseInt(request.gas ?? '0x0', 16).toString(10)
  const inputGas = useWatch({ control: form.control, name: 'gasLimit' })
  const estimatedGas = '250000' // TODO a better estimation

  const txInputGas = Web3.utils.toHex(
    !!inputGas ? inputGas : !!requestGas ? requestGas : estimatedGas,
  )
  useEffect(() => {
    const adapterManager = getChainAdapterManager()

    const adapter = adapterManager.get(
      KnownChainIds.EthereumMainnet,
    ) as unknown as ethereum.ChainAdapter
    adapter.getGasFeeData().then(feeData => {
      setGasFeeData(feeData)
      const fastData = gasFeeData[FeeDataKey.Fast]
      const fastAmount = fromBaseUnit(
        bnOrZero(fastData?.maxFeePerGas).times(txInputGas),
        18,
      ).toString()
      form.setValue('currentFeeAmount', fastAmount)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txInputGas])

  // determine which gas fees to use: user input > from the request > Fast
  const requestMaxPriorityFeePerGas = request.maxPriorityFeePerGas
  const requestMaxFeePerGas = request.maxFeePerGas

  const inputMaxPriorityFeePerGas = useWatch({
    control: form.control,
    name: 'maxPriorityFeePerGas',
  })

  const inputMaxFeePerGas = useWatch({
    control: form.control,
    name: 'maxFeePerGas',
  })

  const fastMaxPriorityFeePerGas = gasFeeData?.fast?.maxPriorityFeePerGas
  const fastMaxFeePerGas = gasFeeData?.fast?.maxFeePerGas

  const txMaxFeePerGas = Web3.utils.toHex(
    !!inputMaxFeePerGas
      ? inputMaxFeePerGas
      : !!requestMaxFeePerGas
      ? requestMaxFeePerGas
      : fastMaxFeePerGas,
  )
  const txMaxPriorityFeePerGas = Web3.utils.toHex(
    !!inputMaxPriorityFeePerGas
      ? inputMaxPriorityFeePerGas
      : !!requestMaxPriorityFeePerGas
      ? requestMaxPriorityFeePerGas
      : fastMaxPriorityFeePerGas,
  )

  // Recalculate estimated fee amount if txMaxFeePerGas changes
  useEffect(() => {
    const currentAmount = fromBaseUnit(bnOrZero(txMaxFeePerGas).times(txInputGas), 18)
    form.setValue('currentFeeAmount', currentAmount)
  }, [form, inputMaxFeePerGas, txInputGas, txMaxFeePerGas])

  // determine which nonce to use: user input > from the request > true nonce
  const requestNonce = request.nonce
  const inputNonce = useWatch({ control: form.control, name: 'nonce' })
  const [trueNonce, setTrueNonce] = useState('0')
  useEffect(() => {
    ;(async () => {
      const adapter = adapterManager.get(
        KnownChainIds.EthereumMainnet,
      ) as unknown as ethereum.ChainAdapter

      if (!walletState.wallet) return
      const bip44Params = adapter.getBIP44Params({ accountNumber: 0 })
      const address = await adapter.getAddress({ wallet: walletState.wallet, bip44Params })
      const account = await adapter.getAccount(address)

      setTrueNonce(`${account.chainSpecific.nonce}`)
    })()
  }, [adapterManager, walletState.wallet])
  const txInputNonce = Web3.utils.toHex(
    !!inputNonce ? inputNonce : !!requestNonce ? requestNonce : trueNonce,
  )

  const txInput: TxData = {
    nonce: txInputNonce,
    gasLimit: txInputGas,
    data: request.data,
    to: request.to,
    value: request.value,
    maxFeePerGas: txMaxFeePerGas,
    maxPriorityFeePerGas: txMaxPriorityFeePerGas,
  }
  const walletConnect = useWalletConnect()
  if (!walletConnect.bridge || !walletConnect.dapp) return null
  const address = walletConnect.bridge?.connector.accounts[0]

  return (
    <FormProvider {...form}>
      <VStack p={6} spacing={6} alignItems='stretch'>
        <Box>
          <Text
            fontWeight='medium'
            translation='plugins.walletConnectToDapps.modal.sendTransaction.sendingFrom'
            mb={4}
          />
          <AddressSummaryCard
            address={address}
            name='My Wallet' // TODO: what string do we put here?
            icon={<KeepKeyIcon color='gray.500' w='full' h='full' />}
          />
        </Box>

        <Box>
          <Text
            fontWeight='medium'
            translation='plugins.walletConnectToDapps.modal.sendTransaction.interactingWith'
            mb={4}
          />
          <AddressSummaryCard
            address={request.to}
            icon={
              <Image
                borderRadius='full'
                w='full'
                h='full'
                src='https://assets.coincap.io/assets/icons/256/eth.png'
              />
            }
          />
        </Box>

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

        <ModalSection
          title={
            <HStack justify='space-between'>
              <Text translation='plugins.walletConnectToDapps.modal.sendTransaction.estGasCost' />
              <GasFeeEstimateLabel />
            </HStack>
          }
          icon={<FaGasPump />}
          defaultOpen={false}
        >
          <Box pt={2}>
            <GasInput
              gasLimit={txInputGas}
              recommendedGasPriceData={{
                maxPriorityFeePerGas: request.maxPriorityFeePerGas,
                maxFeePerGas: request.maxFeePerGas,
              }}
            />
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
            onClick={() => onConfirm(txInput)}
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
