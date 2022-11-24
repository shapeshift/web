// import { Box, Button, Center, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
// import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { WalletConnectEthSignTypedDataCallRequest } from 'plugins/walletConnectToDapps/bridge/types'
// import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
// import { useEffect, useState } from 'react'
// import { FormProvider, useForm } from 'react-hook-form'
// import { FaGasPump, FaWrench } from 'react-icons/fa'
// import { useTranslate } from 'react-polyglot'
// import { Card } from 'components/Card/Card'
// import { CircularProgress } from 'components/CircularProgress/CircularProgress'
// import { FoxIcon } from 'components/Icons/FoxIcon'
// import { Text } from 'components/Text'
// import { useWallet } from 'hooks/useWallet/useWallet'
// import { getWeb3InstanceByChainId } from 'lib/web3-instance'

// import { AddressSummaryCard } from './components/AddressSummaryCard'
// import { AmountCard } from './components/AmountCard'
// import { ModalSection } from './components/ModalSection'
// import { ContractInteractionBreakdown } from './ContractInteractionBreakdown'
// import { GasFeeEstimateLabel } from './GasFeeEstimateLabel'
// import { GasInput } from './GasInput'
// import { TransactionAdvancedParameters } from './TransactionAdvancedParameters'
// import { useCallRequestFees } from './useCallRequestFees'

type CallRequest = WalletConnectEthSignTypedDataCallRequest

type Props = {
  request: CallRequest
  onConfirm(): void
  onReject(): void
}

export const SignTypedDataConfirmation = ({ request, onConfirm }: Props) => {
  return <Button onClick={onConfirm}>confirm</Button>
}
