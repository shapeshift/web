import {
  Avatar,
  Box,
  Button,
  Divider,
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
import { fromAccountId } from '@shapeshiftoss/caip'
import type { AssetId } from '@shapeshiftoss/caip'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { useState } from 'react'
import { FaCheck, FaExternalLinkAlt, FaWallet } from 'react-icons/fa'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { assertGetChainAdapter } from '@/lib/utils'
import { signAndBroadcast } from '@/lib/utils/evm'
import { parseUnsignedTransaction, toChainAdapterTx } from '@/lib/yieldxyz/transaction'
import type { AugmentedYieldDto, TransactionDto } from '@/lib/yieldxyz/types'
import { TransactionStatus } from '@/lib/yieldxyz/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEnterYield } from '@/react-queries/queries/yieldxyz/useEnterYield'

const waitForTransactionConfirmation = async (adapter: any, txHash: string): Promise<void> => {
  const pollInterval = 5000
  const maxAttempts = 120 // 10 minutes

  for (let i = 0; i < maxAttempts; i++) {
    try {
      if ('getTransactionStatus' in adapter) {
        const status = await adapter.getTransactionStatus(txHash)
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
import { useExitYield } from '@/react-queries/queries/yieldxyz/useExitYield'
import { useSubmitYieldTransactionHash } from '@/react-queries/queries/yieldxyz/useSubmitYieldTransactionHash'
import { ActionStatus, ActionType, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { selectFeeAssetByChainId, selectFirstAccountIdByChainId } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { uuidv4 } from '@walletconnect/utils'

type YieldActionModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  action: 'enter' | 'exit'
  amount: string
  assetSymbol: string
}

enum ModalStep {
  Review = 'review',
  Success = 'success',
}

const formatTxTitle = (title: string, assetSymbol: string) => {
  const t = title.toLowerCase()
  if (t.includes('approval') || t.includes('approve')) return `Approve ${assetSymbol}`
  if (t.includes('supply') || t.includes('deposit')) return `Deposit ${assetSymbol}`
  if (t.includes('withdraw')) return `Withdraw ${assetSymbol}`
  // Fallback: Sentence case
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
}

export const YieldActionModal = ({
  isOpen,
  onClose,
  yieldItem,
  action,
  amount,
  assetSymbol,
}: YieldActionModalProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useToast()
  const {
    state: { wallet },
  } = useWallet()

  // State
  const [step, setStep] = useState<ModalStep>(ModalStep.Review)
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
    setStep(ModalStep.Review)
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
    if (!wallet || !accountId) throw new Error('Wallet not connected')
    if (!yieldChainId) throw new Error('Unsupported yield network')

    const adapter = assertGetChainAdapter(yieldChainId)

    // Update step status to loading
    setTransactionSteps(prev =>
      prev.map((s, idx) =>
        idx === index ? { ...s, status: 'loading', loadingMessage: 'Sign in Wallet' } : s,
      ),
    )
    setIsSubmitting(true)

    try {
      // 1. Parse Transaction
      const parsed = parseUnsignedTransaction(tx)
      const chainAdapterTx = toChainAdapterTx(parsed)

      // 2. Build addressNList
      const addressNList = accountMetadata?.bip44Params
        ? toAddressNList(adapter.getBip44Params(accountMetadata.bip44Params))
        : undefined

      if (!addressNList) throw new Error('Failed to get address derivation path')

      // 3. Sign and Broadcast
      const txHash = await signAndBroadcast({
        adapter: adapter as any, // Type cast for EVM adapter
        txToSign: { ...chainAdapterTx, addressNList } as any, // Type cast for adapter input
        wallet,
        senderAddress: userAddress,
        receiverAddress: chainAdapterTx.to,
      })

      if (!txHash) throw new Error('Failed to broadcast transaction')

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
            message: tx.title || 'Transaction',
            amountCryptoPrecision: amount,
          },
        }),
      )

      // Update step status to success
      setTransactionSteps(prev =>
        prev.map((s, idx) =>
          idx === index
            ? { ...s, status: 'success', txHash, txUrl, loadingMessage: undefined }
            : s,
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
        title: 'Transaction Failed',
        description: String(error),
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
        title: 'Unsupported network',
        description: 'This yield network is not supported yet.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    if (!wallet || !accountId) {
      toast({
        title: 'Wallet not connected',
        description: 'Connect a wallet that supports this network to continue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      return
    }
    if (!bnOrZero(amount).gt(0)) {
      toast({
        title: 'Enter an amount',
        description: 'Amount must be greater than zero.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      return
    }
    setIsSubmitting(true)

    // Show generic loading state immediately
    setTransactionSteps([
      { title: 'Preparing Transaction...', status: 'loading', originalTitle: '' },
    ])

    const mutation = action === 'enter' ? enterMutation : exitMutation

    const fields =
      action === 'enter'
        ? yieldItem.mechanics.arguments.enter.fields
        : yieldItem.mechanics.arguments.exit.fields
    const fieldNames = new Set(fields.map(field => field.name))
    const args: Record<string, unknown> = { amount }
    if (fieldNames.has('receiverAddress')) {
      args.receiverAddress = userAddress
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
        title: 'Error',
        description: 'Failed to initiate transaction sequence.',
        status: 'error',
      })
      setIsSubmitting(false)
      setTransactionSteps([])
    }
  }

  // Animation Keyframes
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
      {/* Top Glow Accent */}
      <Box
        position='absolute'
        top='0'
        left='20%'
        right='20%'
        h='1px'
        bgGradient='linear(to-r, transparent, blue.500, transparent)'
        boxShadow='0 0 20px 2px rgba(66, 153, 225, 0.5)'
      />

      <Flex alignItems='center' justify='center' mb={10} position='relative' gap={6}>
        {/* Wallet Node */}
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
            <Avatar size='md' src={walletAvatarUrl} icon={<FaWallet color='white' />} />
          </Box>
          <Box maxW='100px'>
            <MiddleEllipsis value={userAddress} fontSize='sm' color='gray.300' fontWeight='bold' />
          </Box>
        </VStack>

        {/* Animated Direction Flow */}
        <Box
          position='relative'
          flex={1}
          h='50px'
          display='flex'
          alignItems='center'
          justifyContent='center'
        >
          {/* Base Line */}
          <Box
            position='absolute'
            left={0}
            right={0}
            h='2px'
            bg='whiteAlpha.100'
            borderRadius='full'
          />

          {/* Flowing Dots - Repeating pattern for smoother infinite scroll */}
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

        {/* Vault Node */}
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

      {/* Transaction Steps List */}
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
                  ? 'Done'
                  : s.status === 'loading'
                    ? 'Sign now...'
                    : 'Waiting'}
              </Text>
            )}
          </Flex>
        ))}
      </VStack>
    </Box>
  )

  const renderAction = () => (
    <VStack spacing={6} align='stretch'>
      {!isSubmitting ? (
        <Box
          p={5}
          bg='whiteAlpha.50'
          borderRadius='2xl'
          borderWidth='1px'
          borderColor='whiteAlpha.100'
        >
          <Flex justifyContent='space-between' alignItems='center' mb={4}>
            <Text color='gray.400' fontSize='sm' fontWeight='medium'>
              {translate('common.amount')}
            </Text>
            <Flex alignItems='center' gap={2}>
              <Heading size='lg'>{amount}</Heading>
              <Text fontWeight='bold' color='gray.400' fontSize='lg'>
                {assetSymbol}
              </Text>
            </Flex>
          </Flex>
          <Divider my={4} borderColor='whiteAlpha.100' />
          <Flex justifyContent='space-between' alignItems='center'>
            <Text color='gray.400' fontSize='sm'>
              Expected APY
            </Text>
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
        </Box>
      ) : (
        renderStatusCard()
      )}

      {/* Main Wizard Button */}
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
            ? `Sign in Wallet`
            : 'Preparing...')
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

          {step === ModalStep.Review && renderAction()}
          {step === ModalStep.Success && renderSuccess()}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
