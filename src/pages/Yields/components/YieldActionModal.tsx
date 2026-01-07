import {
  Avatar,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useState } from 'react'
import { FaCheck, FaExternalLinkAlt, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { toBaseUnit } from '@/lib/math'
import { assertGetChainAdapter } from '@/lib/utils'
import type { CosmosStakeArgs } from '@/lib/yieldxyz/executeTransaction'
import { executeTransaction } from '@/lib/yieldxyz/executeTransaction'
import type { AugmentedYieldDto, TransactionDto } from '@/lib/yieldxyz/types'
import { TransactionStatus } from '@/lib/yieldxyz/types'
import { useEnterYield } from '@/react-queries/queries/yieldxyz/useEnterYield'
import { useExitYield } from '@/react-queries/queries/yieldxyz/useExitYield'
import { useSubmitYieldTransactionHash } from '@/react-queries/queries/yieldxyz/useSubmitYieldTransactionHash'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { selectFeeAssetByChainId, selectFirstAccountIdByChainId } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

// https://docs.yield.xyz/docs/cosmos-atom-native-staking
const FIGMENT_COSMOS_VALIDATOR_ADDRESS = 'cosmosvaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpfdn6m9d'
const FIGMENT_SOLANA_VALIDATOR_ADDRESS = 'CcaHc2L43ZWjwCHART3oZoJvHLAe9hzT2DJNUpBzoTN1'
const FIGMENT_SUI_VALIDATOR_ADDRESS =
  '0x8ecaf4b95b3c82c712d3ddb22e7da88d2286c4653f3753a86b6f7a216a3ca518'


const waitForTransactionConfirmation = async (
  adapter: ChainAdapter<ChainId>,
  txHash: string,
): Promise<void> => {
  const pollInterval = 5000
  const maxAttempts = 120 // 10 minutes

  for (let i = 0; i < maxAttempts; i++) {
    try {
      if ('getTransactionStatus' in adapter) {
        // cast to any allows access to the method we just checked exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = await (adapter as any).getTransactionStatus(txHash)
        if (status === TxStatus.Confirmed) return
        if (status === TxStatus.Failed) throw new Error('Transaction failed on-chain')
      } else {
        // Fallback or warning? For now return to avoid infinite loop on unsupported chains
        return
      }
    } catch (e) {
      // ignore fetching errors
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }
  throw new Error('Transaction confirmation timed out')
}

type YieldActionModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  action: 'enter' | 'exit'
  amount: string
  assetSymbol: string
}

enum ModalStep {
  InProgress = 'in_progress',
  Success = 'success',
}

const formatTxTitle = (title: string, assetSymbol: string) => {
  const t = title.replace(/ transaction$/i, '').toLowerCase()
  if (t.includes('approval') || t.includes('approve') || t.includes('approved'))
    return `Approve ${assetSymbol}`
  if (t.includes('supply') || t.includes('deposit') || t.includes('enter'))
    return `Deposit ${assetSymbol}`
  if (t.includes('withdraw') || t.includes('withdrawal') || t.includes('exit'))
    return `Withdraw ${assetSymbol}`
  if (t.includes('claim')) return `Claim ${assetSymbol}`
  if (t.includes('unstake')) return `Unstake ${assetSymbol}`
  if (t.includes('stake')) return `Stake ${assetSymbol}`
  // Fallback: Sentence case
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const YieldActionModal = ({
  isOpen,
  onClose,
  yieldItem,
  action,
  amount,
  assetSymbol,
}: YieldActionModalProps) => {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useToast()
  const translate = useTranslate()
  const {
    state: { wallet },
  } = useWallet()

  // State
  const [step, setStep] = useState<ModalStep>(ModalStep.InProgress)
  const [rawTransactions, setRawTransactions] = useState<TransactionDto[]>([])
  const [transactionSteps, setTransactionSteps] = useState<
    {
      title: string
      status: 'pending' | 'success' | 'loading'
      originalTitle: string
      txHash?: string
      txUrl?: string
      loadingMessage?: string
    }[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)

  // Mutations
  const enterMutation = useEnterYield()
  const exitMutation = useExitYield()
  const submitHashMutation = useSubmitYieldTransactionHash()

  const { chainId: yieldChainId } = yieldItem
  const accountId = useAppSelector(state =>
    yieldChainId ? selectFirstAccountIdByChainId(state, yieldChainId) : undefined,
  )
  const feeAsset = useAppSelector(state =>
    yieldChainId ? selectFeeAssetByChainId(state, yieldChainId) : undefined,
  )
  const accountMetadata = useAppSelector(state =>
    accountId ? selectPortfolioAccountMetadataByAccountId(state, { accountId }) : undefined,
  )

  const userAddress = accountId ? fromAccountId(accountId).account : ''
  const walletAvatarUrl = userAddress ? makeBlockiesUrl(userAddress) : ''

  const canSubmit = Boolean(wallet && accountId && yieldChainId && bnOrZero(amount).gt(0))

  const handleClose = () => {
    if (isSubmitting) return
    setStep(ModalStep.InProgress)
    setTransactionSteps([])
    setRawTransactions([])
    setActiveStepIndex(-1)
    onClose()
  }

  const filterExecutableTransactions = (transactions: TransactionDto[]): TransactionDto[] =>
    transactions.filter(tx => tx.status === TransactionStatus.Created)

  const executeSingleTransaction = async (
    tx: TransactionDto,
    index: number,
    allTransactions: TransactionDto[],
  ) => {
    if (!wallet || !accountId) {
      throw new Error(translate('yieldXYZ.errors.walletNotConnected'))
    }
    if (!yieldChainId) {
      throw new Error(translate('yieldXYZ.errors.unsupportedYieldNetwork'))
    }

    const adapter = assertGetChainAdapter(yieldChainId as KnownChainIds)

    // Update step status to loading
    setTransactionSteps(prev =>
      prev.map((s, idx) =>
        idx === index
          ? { ...s, status: 'loading', loadingMessage: translate('yieldXYZ.loading.signInWallet') }
          : s,
      ),
    )
    setIsSubmitting(true)

    const cosmosStakeArgs: CosmosStakeArgs | undefined =
      yieldChainId === cosmosChainId
        ? {
          validator: FIGMENT_COSMOS_VALIDATOR_ADDRESS,
          amountCryptoBaseUnit: bnOrZero(amount)
            .times(bnOrZero(10).pow(yieldItem.token.decimals))
            .toFixed(0),
          action: action === 'enter' ? 'stake' : 'unstake',
        }
        : undefined

    try {
      const txHash = await executeTransaction({
        tx,
        chainId: yieldChainId,
        wallet,
        accountId,
        userAddress,
        bip44Params: accountMetadata?.bip44Params,
        cosmosStakeArgs,
      })

      if (!txHash) throw new Error(translate('yieldXYZ.errors.broadcastFailed'))

      // Get Explorer URL
      const txUrl = feeAsset ? `${feeAsset.explorerTxLink}${txHash}` : ''

      // Show "Confirming..." state
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index ? { ...s, txHash, txUrl, loadingMessage: 'Confirming...' } : s,
        ),
      )

      // Wait for confirmation
      await waitForTransactionConfirmation(adapter, txHash)

      // 4. Submit Hash
      await submitHashMutation.mutateAsync({
        transactionId: tx.id,
        hash: txHash,
      })

      // Invalidate queries to refresh balances and yields immediately
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'allBalances'] })
      queryClient.invalidateQueries({ queryKey: ['yieldxyz', 'yields'] })

      // Dispatch Action for Notification Center
      const isApproval = tx.title && tx.title.toLowerCase().includes('approv')
      const actionType = isApproval
        ? ActionType.Approve
        : action === 'enter'
          ? ActionType.Deposit
          : ActionType.Withdraw
      const displayType = isApproval
        ? GenericTransactionDisplayType.Approve
        : GenericTransactionDisplayType.Yield

      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          type: actionType,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType,
            txHash,
            chainId: yieldChainId,
            assetId: (yieldItem.token.assetId || '') as AssetId,
            accountId,
            message: formatTxTitle(tx.title || 'Transaction', assetSymbol),
            amountCryptoPrecision: amount,
          },
        }),
      )

      // Update step status to success
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index ? { ...s, status: 'success', txHash, txUrl, loadingMessage: undefined } : s,
        ),
      )

      // Check if next step exists
      if (index + 1 < allTransactions.length) {
        setActiveStepIndex(index + 1)
        setIsSubmitting(false) // Stop submitting to allow user to click next button
      } else {
        setStep(ModalStep.Success)
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Transaction execution failed:', error)
      toast({
        title: translate('yieldXYZ.errors.transactionFailedTitle'),
        description: translate('yieldXYZ.errors.transactionFailedDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setIsSubmitting(false)
      // Reset step status to pending or error state if we had one?
      // For now keep as loading (stuck) or revert to pending?
      // Let's revert to pending so user can retry
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index ? { ...s, status: 'pending', loadingMessage: undefined } : s,
        ),
      )
    }
  }

  const handleConfirm = async () => {
    // Continue existing sequence
    if (activeStepIndex >= 0 && rawTransactions[activeStepIndex]) {
      await executeSingleTransaction(
        rawTransactions[activeStepIndex],
        activeStepIndex,
        rawTransactions,
      )
      return
    }

    // Initial Start
    if (!yieldChainId) {
      toast({
        title: translate('yieldXYZ.errors.unsupportedNetworkTitle'),
        description: translate('yieldXYZ.errors.unsupportedNetworkDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    if (!wallet || !accountId) {
      toast({
        title: translate('yieldXYZ.errors.walletNotConnectedTitle'),
        description: translate('yieldXYZ.errors.walletNotConnectedDescription'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    if (!bnOrZero(amount).gt(0)) {
      toast({
        title: translate('yieldXYZ.errors.enterAmountTitle'),
        description: translate('yieldXYZ.errors.enterAmountDescription'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      return
    }
    setIsSubmitting(true)

    // Show generic loading state immediately
    setTransactionSteps([
      {
        title: translate('yieldXYZ.loading.preparingTransaction'),
        status: 'loading',
        originalTitle: '',
      },
    ])

    const mutation = action === 'enter' ? enterMutation : exitMutation

    const fields =
      action === 'enter'
        ? yieldItem.mechanics.arguments.enter.fields
        : yieldItem.mechanics.arguments.exit.fields
    const fieldNames = new Set(fields.map(field => field.name))
    const isSolana = yieldItem.network === 'solana'
    const yieldAmount = isSolana ? amount : toBaseUnit(amount, yieldItem.token.decimals)
    const args: Record<string, unknown> = { amount: yieldAmount }
    if (fieldNames.has('receiverAddress')) {
      args.receiverAddress = userAddress
    }
    if (fieldNames.has('validatorAddress')) {
      if (yieldChainId === cosmosChainId) {
        args.validatorAddress = FIGMENT_COSMOS_VALIDATOR_ADDRESS
      }
      if (yieldItem.id === 'solana-sol-native-multivalidator-staking') {
        args.validatorAddress = FIGMENT_SOLANA_VALIDATOR_ADDRESS
      }
      if (yieldItem.network === 'sui') {
        args.validatorAddress = FIGMENT_SUI_VALIDATOR_ADDRESS
      }
    }
    if (fieldNames.has('cosmosPubKey') && yieldChainId === cosmosChainId) {
      args.cosmosPubKey = userAddress
    }

    try {
      const actionDto = await mutation.mutateAsync({
        yieldId: yieldItem.id,
        address: userAddress,
        arguments: args,
      })

      const transactions = filterExecutableTransactions(actionDto.transactions)

      if (transactions.length === 0) {
        setStep(ModalStep.Success)
        setIsSubmitting(false)
        return
      }

      setRawTransactions(transactions)
      setTransactionSteps(
        transactions.map((tx, i) => ({
          title: formatTxTitle(tx.title || `Transaction ${i + 1}`, assetSymbol),
          originalTitle: tx.title || '',
          status: 'pending',
        })),
      )

      setActiveStepIndex(0)
      // Execute the first transaction immediately
      await executeSingleTransaction(transactions[0], 0, transactions)
    } catch (error) {
      console.error('Failed to initiate action:', error)
      toast({
        title: translate('yieldXYZ.errors.initiateFailedTitle'),
        description: translate('yieldXYZ.errors.initiateFailedDescription'),
        status: 'error',
      })
      setIsSubmitting(false)
      setTransactionSteps([])
    }
  }


  const horizontalScroll = keyframes`
        0% { background-position: 0 0; }
        100% { background-position: 28px 0; }
        `

  const renderStatusCard = () => (
    <Box
      p={8}
      bg='gray.800'
      borderRadius='2xl'
      borderWidth='1px'
      borderColor='whiteAlpha.100'
      position='relative'
      overflow='hidden'
      boxShadow='xl'
    >
      <Box
        position='absolute'
        top='0'
        left='20%'
        right='20%'
        h='1px'
        bgGradient='linear(to-r, transparent, blue.500, transparent)'
        boxShadow='0 0 20px 2px rgba(66, 153, 225, 0.5)'
      />

      <Flex justify='space-between' align='center' mb={6}>
        <Flex align='center' gap={3}>
          <Heading size='lg'>{amount}</Heading>
          <Text fontWeight='bold' color='gray.400' fontSize='lg'>
            {assetSymbol}
          </Text>
        </Flex>
        <Box
          px={3}
          py={1}
          bg='green.900'
          borderRadius='full'
          border='1px solid'
          borderColor='green.800'
        >
          <Text color='green.200' fontWeight='bold' fontSize='sm'>
            {bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)}% APY
          </Text>
        </Box>
      </Flex>

      <Flex alignItems='center' justify='center' mb={6} position='relative' gap={6} flexDirection={action === 'exit' ? 'row-reverse' : 'row'}>
        <VStack spacing={3} zIndex={2}>
          <Box
            p={1}
            bg='gray.900'
            borderRadius='full'
            boxShadow='0 0 25px rgba(66, 153, 225, 0.4)'
            position='relative'
            border='2px solid'
            borderColor='blue.500'
          >
            <Avatar size='md' src={yieldItem.token.logoURI} icon={<FaWallet color='white' />} />
          </Box>
          <Text fontSize='sm' color='gray.300' fontWeight='bold'>
            {assetSymbol}
          </Text>
        </VStack>

        <Box
          position='relative'
          flex={1}
          h='50px'
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          <Box
            position='absolute'
            left={0}
            right={0}
            h='2px'
            bg='whiteAlpha.100'
            borderRadius='full'
          />

          <Box
            position='absolute'
            left={0}
            right={0}
            h='6px'
            opacity={0.8}
            backgroundImage='radial-gradient(circle, #4299E1 2px, transparent 2.5px)'
            backgroundSize='14px 100%'
            animation={`${horizontalScroll} 3s infinite linear`}
            style={{
              maskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
            }}
          />
        </Box>

        <VStack spacing={3} zIndex={2}>
          <Box
            position='relative'
            p={1}
            bg='gray.900'
            borderRadius='full'
            border='2px solid'
            borderColor='blue.500'
            boxShadow='0 0 25px rgba(66, 153, 225, 0.2)'
          >
            <Avatar
              src={yieldItem.metadata.logoURI}
              size='md'
              name={yieldItem.metadata.name}
              icon={
                <Box p={2}>
                  <Icon as={FaCheck} color='white' />
                </Box>
              }
            />
          </Box>
          <Text fontSize='sm' color='gray.300' fontWeight='bold'>
            Vault
          </Text>
        </VStack>
      </Flex>

      <VStack align='stretch' spacing={0} bg='blackAlpha.300' borderRadius='xl' overflow='hidden'>
        {transactionSteps.map((s, idx) => (
          <Flex
            key={idx}
            justify='space-between'
            align='center'
            p={4}
            borderBottomWidth={idx !== transactionSteps.length - 1 ? '1px' : '0'}
            borderColor='whiteAlpha.50'
            bg={s.status === 'loading' ? 'whiteAlpha.50' : 'transparent'}
            transition='all 0.2s'
          >
            <Flex align='center' gap={3}>
              {s.status === 'success' ? (
                <Icon as={FaCheck} color='green.400' boxSize={4} />
              ) : s.status === 'loading' ? (
                <Spinner size='xs' color='blue.400' />
              ) : (
                <Box w={2} h={2} bg='gray.600' borderRadius='full' ml={1} />
              )}
              <Text
                color={s.status === 'pending' ? 'gray.500' : 'white'}
                fontSize='sm'
                fontWeight={s.status === 'loading' ? 'bold' : 'medium'}
              >
                {s.title}
              </Text>
            </Flex>

            {s.status === 'success' && s.txHash ? (
              <Link
                href={s.txUrl}
                isExternal
                color='blue.400'
                fontSize='xs'
                display='flex'
                alignItems='center'
                gap={1}
                _hover={{ textDecoration: 'underline' }}
              >
                <MiddleEllipsis value={s.txHash} /> <Icon as={FaExternalLinkAlt} boxSize={3} />
              </Link>
            ) : (
              <Text
                fontSize='xs'
                color={s.status === 'loading' ? 'blue.300' : 'gray.600'}
                fontWeight='medium'
              >
                {s.status === 'success'
                  ? translate('yieldXYZ.loading.done')
                  : s.status === 'loading'
                    ? ''
                    : translate('yieldXYZ.loading.waiting')}
              </Text>
            )}
          </Flex>
        ))}
      </VStack>
    </Box>
  )

  const renderAction = () => (
    <VStack spacing={6} align='stretch'>
      {renderStatusCard()}

      <Button
        size='lg'
        height='64px'
        fontSize='lg'
        colorScheme='blue'
        onClick={handleConfirm}
        width='full'
        borderRadius='xl'
        isDisabled={!canSubmit || isSubmitting}
        isLoading={isSubmitting}
        loadingText={
          transactionSteps[activeStepIndex]?.loadingMessage ??
          (transactionSteps[activeStepIndex]?.status === 'loading'
            ? translate('yieldXYZ.loading.signInWallet')
            : translate('yieldXYZ.loading.preparing'))
        }
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
        transition='all 0.2s'
      >
        {isSubmitting
          ? 'Processing...'
          : activeStepIndex >= 0 && transactionSteps[activeStepIndex]
            ? transactionSteps[activeStepIndex].title
            : `Confirm ${action === 'enter' ? 'Deposit' : 'Withdrawal'}`}
      </Button>
    </VStack>
  )

  const renderSuccess = () => (
    <VStack spacing={8} py={8} textAlign='center' align='center'>
      <Box
        position='relative'
        w={24}
        h={24}
        borderRadius='full'
        bgGradient='linear(to-br, green.400, green.600)'
        color='white'
        display='flex'
        alignItems='center'
        justifyContent='center'
        boxShadow='0 0 30px rgba(72, 187, 120, 0.5)'
        mb={4}
      >
        <Icon as={FaCheck} boxSize={10} />
      </Box>

      <Box>
        <Heading size='xl' mb={3}>
          Success!
        </Heading>
        <Text color='gray.400' fontSize='lg'>
          You successfully {action === 'enter' ? 'supplied' : 'withdrew'} {amount} {assetSymbol}
        </Text>
      </Box>

      <Box width='full'>
        <VStack spacing={2} align='stretch' mt={4}>
          <Text fontSize='sm' color='gray.400' textAlign='left' px={1}>
            Transactions
          </Text>
          {transactionSteps.map((s, idx) => (
            <Flex
              key={idx}
              justify='space-between'
              align='center'
              p={4}
              bg='whiteAlpha.50'
              borderRadius='lg'
              border='1px solid'
              borderColor='whiteAlpha.100'
            >
              <Flex align='center' gap={2}>
                <Icon as={FaCheck} color='green.400' boxSize={3} />
                <Text fontSize='sm' fontWeight='medium'>
                  {s.title}
                </Text>
              </Flex>
              {s.txHash && (
                <Link
                  href={s.txUrl}
                  isExternal
                  color='blue.400'
                  fontSize='sm'
                  display='flex'
                  alignItems='center'
                  gap={2}
                  _hover={{ textDecor: 'underline' }}
                >
                  View <Icon as={FaExternalLinkAlt} boxSize={3} />
                </Link>
              )}
            </Flex>
          ))}
        </VStack>
      </Box>

      <Button
        size='lg'
        colorScheme='gray'
        width='full'
        onClick={handleClose}
        borderRadius='xl'
        height='64px'
      >
        Close
      </Button>
    </VStack>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      isCentered
      size='md'
      closeOnOverlayClick={!isSubmitting}
    >
      <ModalOverlay backdropFilter='blur(12px)' bg='blackAlpha.600' />
      <ModalContent
        bg='gray.900'
        borderColor='gray.700'
        borderWidth='1px'
        borderRadius='3xl'
        boxShadow='2xl'
      >
        <ModalCloseButton top={5} right={5} isDisabled={isSubmitting} />
        <ModalBody p={8}>
          {step !== ModalStep.Success && (
            <Flex alignItems='center' gap={3} mb={8}>
              <Heading size='md'>
                {action === 'enter' ? `Supply ${assetSymbol}` : `Withdraw ${assetSymbol}`}
              </Heading>
            </Flex>
          )}

          {step === ModalStep.InProgress && renderAction()}
          {step === ModalStep.Success && renderSuccess()}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
