import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  Center,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { fromHex, isHex } from 'viem'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { ModalCollapsableSection } from '@/plugins/walletConnectToDapps/components/modals/ModalCollapsableSection'
import { TransactionAdvancedParameters } from '@/plugins/walletConnectToDapps/components/modals/TransactionAdvancedParameters'
import { WalletConnectPeerHeader } from '@/plugins/walletConnectToDapps/components/modals/WalletConnectPeerHeader'
import { WalletConnectSigningWithSection } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningFromSection'
import { useCallRequestEvmFees } from '@/plugins/walletConnectToDapps/hooks/useCallRequestEvmFees'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CustomTransactionData,
  EthSendTransactionCallRequest,
  EthSignTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import { convertHexToNumber } from '@/plugins/walletConnectToDapps/utils'
import {
  detectContractType,
  getFunctionName,
  parseApprovalData,
  parseTransferData,
} from '@/plugins/walletConnectToDapps/utils/contractDetection'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const faWrenchIcon = <FaWrench />

export const EIP155TransactionConfirmation: FC<
  WalletConnectRequestModalProps<EthSendTransactionCallRequest | EthSignTransactionCallRequest>
> = ({ onConfirm: handleConfirm, onReject: handleReject, state, topic }) => {
  const { address, transaction, isInteractingWithContract, chainId } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const { isLoading, feeAsset, fees } = useCallRequestEvmFees(state)

  const { showErrorToast } = useErrorToast()
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const gas = useMemo(
    () => transaction?.gasLimit ?? transaction?.gas,
    [transaction?.gas, transaction?.gasLimit],
  )

  const form = useForm<CustomTransactionData>({
    defaultValues: {
      nonce: transaction?.nonce ? convertHexToNumber(transaction.nonce).toString() : undefined,
      gasLimit: gas ? convertHexToNumber(gas).toString() : undefined,
      speed: FeeDataKey.Average,
      customFee: {
        baseFee: '0',
        priorityFee: '0',
      },
    },
  })

  const [selectedSpeed, setSelectedSpeed] = useState<FeeDataKey>(FeeDataKey.Fast)

  const handleSpeedChange = useCallback(
    (newSpeed: FeeDataKey) => {
      setSelectedSpeed(newSpeed)
      form.setValue('speed', newSpeed)
    },
    [form],
  )

  const speedOptions = useMemo(
    () => [
      { value: FeeDataKey.Slow, label: '🐌 Slow ~10 mins', emoji: '🐌', text: 'Slow ~10 mins' },
      {
        value: FeeDataKey.Average,
        label: '🟡 Average ~3 mins',
        emoji: '🟡',
        text: 'Average ~3 mins',
      },
      { value: FeeDataKey.Fast, label: '⚡ Fast ~24 sec', emoji: '⚡', text: 'Fast ~24 sec' },
    ],
    [],
  )

  const currentFee = useMemo(() => {
    if (!fees) return null
    return fees[selectedSpeed]
  }, [fees, selectedSpeed])

  const currentSpeedOption = useMemo(
    () => speedOptions.find(option => option.value === selectedSpeed) || speedOptions[2], // default to Fast
    [speedOptions, selectedSpeed],
  )
  const tooltipIconProps = useMemo(() => ({ boxSize: '12px', color: 'text.subtle' }), [])

  const value = useMemo(() => {
    if (!feeAsset) return '0'

    const valueCryptoBaseUnit =
      transaction?.value && isHex(transaction.value)
        ? fromHex(transaction.value, 'bigint').toString()
        : transaction?.value
    const valueCryptoPrecision = fromBaseUnit(valueCryptoBaseUnit ?? '0', feeAsset.precision)
    return valueCryptoPrecision
  }, [feeAsset, transaction?.value])

  // Phase 1 Contract Intelligence
  const contractInfo = useMemo(() => {
    if (!transaction?.to) return null
    return detectContractType(transaction.to)
  }, [transaction?.to])

  const functionName = useMemo(() => {
    if (!transaction?.data) return null
    return getFunctionName(transaction.data)
  }, [transaction?.data])

  // For token approvals, the 'to' address is the token contract being approved
  const approvalTokenAsset = useAppSelector(state => {
    if (!transaction?.to || !chainId) return null

    try {
      const assetId = toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: transaction.to.toLowerCase(),
      })
      return selectAssetById(state, assetId)
    } catch {
      return null
    }
  })

  const approvalData = useMemo(() => {
    if (!transaction?.data || !chainId) return null
    const data = parseApprovalData(transaction.data, chainId)
    if (!data) return null

    // Try to get token info if we're approving a token
    // For ERC20 approvals, the 'to' address is the token contract
    let formattedAmount = data.amount
    if (!data.isUnlimited && approvalTokenAsset) {
      // Format with proper decimals
      const amountInPrecision = fromBaseUnit(data.amountRaw, approvalTokenAsset.precision)
      formattedAmount = `${amountInPrecision} ${approvalTokenAsset.symbol}`
    }

    return {
      ...data,
      formattedAmount: data.isUnlimited ? 'Unlimited' : formattedAmount,
    }
  }, [transaction?.data, chainId, approvalTokenAsset])

  // For token transfers, the 'to' address in the transaction is the token contract
  const transferTokenAsset = useAppSelector(state => {
    if (!transaction?.to || !chainId || !transaction?.data) return null
    const functionName = getFunctionName(transaction.data)
    if (functionName !== 'transfer' && functionName !== 'transferFrom') return null

    try {
      const assetId = toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: transaction.to.toLowerCase(),
      })
      return selectAssetById(state, assetId)
    } catch {
      return null
    }
  })

  const transferData = useMemo(() => {
    if (!transaction?.data) return null
    const data = parseTransferData(transaction.data)
    if (!data || !transferTokenAsset) return data

    // Format with proper decimals
    const amountInPrecision = fromBaseUnit(data.amount, transferTokenAsset.precision)
    return {
      ...data,
      formattedAmount: `${amountInPrecision} ${transferTokenAsset.symbol}`,
    }
  }, [transaction?.data, transferTokenAsset])

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
      <WalletConnectPeerHeader peerMetadata={peerMetadata} />
      <Card bg={cardBg} borderRadius='2xl' p={4}>
        <VStack spacing={3} align='stretch'>
          {/* Contract Info Header */}
          {contractInfo && (
            <Box>
              <HStack mb={4}>
                <Tag size='sm' colorScheme='purple' variant='subtle'>
                  {contractInfo.type.toUpperCase()}
                </Tag>
                <RawText fontSize='sm' fontWeight='medium'>
                  {contractInfo.name}
                </RawText>
              </HStack>
            </Box>
          )}

          {/* Main Transaction Details */}
          <VStack spacing={3} align='stretch'>
            {/* Action/Method */}
            {functionName && (
              <HStack justify='space-between'>
                <RawText fontSize='sm' color='text.subtle'>
                  Method
                </RawText>
                <RawText fontSize='sm'>{functionName}</RawText>
              </HStack>
            )}

            {/* Approval-specific details */}
            {approvalData && (
              <>
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Approve Token
                  </RawText>
                  <HStack spacing={2}>
                    <RawText fontSize='sm'>
                      {approvalTokenAsset?.symbol ||
                        transaction.to.slice(0, 6) + '...' + transaction.to.slice(-4)}
                    </RawText>
                    {approvalTokenAsset && (
                      <Image boxSize='16px' src={approvalTokenAsset.icon} borderRadius='full' />
                    )}
                  </HStack>
                </HStack>
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Amount
                  </RawText>
                  <HStack spacing={2}>
                    <RawText fontSize='sm' color={approvalData.isUnlimited ? 'red.400' : undefined}>
                      {approvalData.formattedAmount}
                    </RawText>
                    {approvalTokenAsset && !approvalData.isUnlimited && (
                      <Image boxSize='16px' src={approvalTokenAsset.icon} borderRadius='full' />
                    )}
                  </HStack>
                </HStack>
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Spender
                  </RawText>
                  <RawText fontSize='sm' fontFamily='mono'>
                    {approvalData.spender.slice(0, 6)}...{approvalData.spender.slice(-4)}
                  </RawText>
                </HStack>
              </>
            )}

            {/* Transfer-specific details */}
            {transferData && (
              <>
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Send Token
                  </RawText>
                  <HStack spacing={2}>
                    <RawText fontSize='sm'>
                      {transferTokenAsset?.symbol ||
                        transaction.to.slice(0, 6) + '...' + transaction.to.slice(-4)}
                    </RawText>
                    {transferTokenAsset && (
                      <Image boxSize='16px' src={transferTokenAsset.icon} borderRadius='full' />
                    )}
                  </HStack>
                </HStack>
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Send To
                  </RawText>
                  <RawText fontSize='sm' fontFamily='mono'>
                    {transferData.to.slice(0, 6)}...{transferData.to.slice(-4)}
                  </RawText>
                </HStack>
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    Amount
                  </RawText>
                  <RawText fontSize='sm'>
                    {'formattedAmount' in transferData
                      ? transferData.formattedAmount
                      : transferData.amount}
                  </RawText>
                </HStack>
              </>
            )}

            {/* Regular send or contract interaction */}
            {!approvalData && !transferData && (
              <>
                {/* Chain/Network */}
                {connectedAccountFeeAsset && (
                  <HStack justify='space-between'>
                    <RawText fontSize='sm' color='text.subtle'>
                      Chain
                    </RawText>
                    <HStack spacing={2}>
                      <RawText fontSize='sm'>
                        {connectedAccountFeeAsset.networkName || connectedAccountFeeAsset.name}
                      </RawText>
                      <Image
                        boxSize='16px'
                        src={connectedAccountFeeAsset.networkIcon || connectedAccountFeeAsset.icon}
                        borderRadius='full'
                      />
                    </HStack>
                  </HStack>
                )}

                {/* Send amount for regular transfers or contract interactions */}
                {(value !== '0' || !isInteractingWithContract) && feeAsset && (
                  <HStack justify='space-between'>
                    <RawText fontSize='sm' color='text.subtle'>
                      Send
                    </RawText>
                    <HStack spacing={2}>
                      <RawText fontSize='sm'>
                        {value} {feeAsset.symbol}
                      </RawText>
                      <Image boxSize='16px' src={feeAsset.icon} borderRadius='full' />
                    </HStack>
                  </HStack>
                )}

                {/* Interact Contract */}
                <HStack justify='space-between'>
                  <RawText fontSize='sm' color='text.subtle'>
                    {isInteractingWithContract ? 'Interact Contract' : 'Send To'}
                  </RawText>
                  <RawText fontSize='sm' fontFamily='mono'>
                    {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}
                  </RawText>
                </HStack>

                {/* Method for unrecognized contract interactions */}
                {isInteractingWithContract && !functionName && transaction?.data && (
                  <HStack justify='space-between'>
                    <RawText fontSize='sm' color='text.subtle'>
                      Method
                    </RawText>
                    <RawText fontSize='sm' fontFamily='mono'>
                      {transaction.data.slice(0, 10)}
                    </RawText>
                  </HStack>
                )}
              </>
            )}
          </VStack>
        </VStack>
      </Card>
      <ModalCollapsableSection
        title={translate(
          'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
        )}
        icon={faWrenchIcon}
        defaultOpen={false}
      >
        <TransactionAdvancedParameters />
      </ModalCollapsableSection>
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
            <WalletConnectSigningWithSection
              feeAssetId={feeAsset.assetId}
              address={address ?? ''}
            />
          )}

          {/* Gas Selection */}
          {fees && feeAsset && currentFee && (
            <HStack justify='space-between' w='full' align='center'>
              <VStack spacing={0} align='flex-start'>
                <RawText fontSize='sm' fontWeight='bold'>
                  {currentFee.txFee &&
                    bnOrZero(fromBaseUnit(currentFee.txFee, feeAsset.precision)).toFixed(6)}{' '}
                  {feeAsset.symbol} (${bnOrZero(currentFee.fiatFee).toFixed(2)})
                </RawText>
                <HStack spacing={1} align='center'>
                  <HelperTooltip
                    label={translate(
                      'plugins.walletConnectToDapps.modal.sendTransaction.feeEstimateTooltip',
                    )}
                    iconProps={tooltipIconProps}
                  />
                  <RawText fontSize='xs' color='text.subtle'>
                    Fee Estimate
                  </RawText>
                </HStack>
              </VStack>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<ChevronDownIcon />}
                  size='sm'
                  maxW='140px'
                  variant='outline'
                  bg='transparent'
                  borderColor='whiteAlpha.200'
                  borderWidth='1px'
                  borderRadius='lg'
                  color='white'
                  fontSize='sm'
                  fontWeight='medium'
                  _hover={{ borderColor: 'whiteAlpha.300' }}
                  _active={{ borderColor: 'whiteAlpha.400' }}
                  px={3}
                >
                  <HStack spacing={1}>
                    <Box>{currentSpeedOption.emoji}</Box>
                    <Box>{currentSpeedOption.text}</Box>
                  </HStack>
                </MenuButton>
                <MenuList bg='gray.800' borderColor='whiteAlpha.200' borderRadius='lg' py={1}>
                  {speedOptions.map(option => (
                    <MenuItem
                      key={option.value}
                      onClick={() => handleSpeedChange(option.value)}
                      bg='transparent'
                      color='white'
                      fontSize='sm'
                      _hover={{ bg: 'whiteAlpha.100' }}
                      _focus={{ bg: 'whiteAlpha.100' }}
                      px={3}
                      py={2}
                    >
                      <HStack spacing={2}>
                        <Box>{option.emoji}</Box>
                        <Box>{option.text}</Box>
                      </HStack>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>
          )}

          <HStack spacing={4}>
            <Button
              size='lg'
              flex={1}
              onClick={handleReject}
              isDisabled={form.formState.isSubmitting}
              _disabled={disabledProp}
            >
              {translate('common.cancel')}
            </Button>
            <Button
              size='lg'
              flex={1}
              colorScheme='blue'
              type='submit'
              onClick={form.handleSubmit(handleConfirm)}
              isLoading={form.formState.isSubmitting}
              isDisabled={!fees}
              _disabled={disabledProp}
            >
              {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </FormProvider>
  )
}
