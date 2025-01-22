import { ArrowUpDownIcon, CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Box, Center, Collapse, Flex, HStack, Skeleton, StepStatus } from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { COW_SWAP_VAULT_RELAYER_ADDRESS, SwapperName } from '@shapeshiftoss/swapper'
import { bn } from '@shapeshiftoss/utils'
import type Polyglot from 'node-polyglot'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Address } from 'viem'
import { AnimatedCheck } from 'components/AnimatedCheck'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
import { getErc20Allowance } from 'lib/utils/evm'
import { usePlaceLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import {
  selectInputSellAmountCryptoBaseUnit,
  selectSellAccountId,
} from 'state/slices/limitOrderInputSlice/selectors'
import { LimitOrderSubmissionState } from 'state/slices/limitOrderSlice/constants'
import {
  selectActiveQuoteId,
  selectActiveQuoteSellAsset,
  selectLimitOrderSubmissionMetadata,
} from 'state/slices/limitOrderSlice/selectors'
import { TransactionExecutionState } from 'state/slices/tradeQuoteSlice/types'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'
import { TxLabel } from '../TradeConfirm/TxLabel'

const collapseStyle = { width: '100%' }
const stepProps = { py: 0, pr: 2, pl: 0 }

const erroredStepIndicator = <WarningIcon color='red.500' />
const completedStepIndicator = <CheckCircleIcon color='text.success' />

export const InnerSteps = () => {
  const { showErrorToast } = useErrorToast()
  const translate = useTranslate()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoadingAllowance, setIsLoadingAllowance] = useState(false)
  const [isAllowanceApprovalRequired, setIsAllowanceApprovalRequired] = useState(false)

  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const sellAccountId = useAppSelector(selectSellAccountId)
  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const quoteId = useAppSelector(selectActiveQuoteId)

  const [_, { data: orderData, error: orderError }] = usePlaceLimitOrderMutation()

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: quoteId ?? 0 }
  }, [quoteId])

  const {
    state: orderSubmissionState,
    allowanceReset,
    allowanceApproval,
  } = useSelectorWithArgs(selectLimitOrderSubmissionMetadata, orderSubmissionMetadataFilter)

  // FIXME: replace this with a check against the slice state
  useEffect(() => {
    if (!sellAsset || !sellAccountId) return
    const { assetReference, chainId } = fromAssetId(sellAsset.assetId)
    const sellAccountAddress = fromAccountId(sellAccountId).account as Address

    ;(async () => {
      setIsLoadingAllowance(true)

      try {
        // Check the ERC20 token allowance
        const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
          address: assetReference,
          spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
          from: sellAccountAddress as Address,
          chainId,
        })

        // If approval is required
        if (bn(allowanceOnChainCryptoBaseUnit).lt(sellAmountCryptoBaseUnit)) {
          setIsAllowanceApprovalRequired(true)
        }

        return
      } catch (e) {
        showErrorToast(e)
      } finally {
        setIsLoadingAllowance(false)
      }
    })()
  }, [
    isAllowanceApprovalRequired,
    sellAccountId,
    sellAmountCryptoBaseUnit,
    sellAsset,
    showErrorToast,
  ])

  const summaryStepIndicator = useMemo(() => {
    switch (true) {
      case !!orderData:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <AnimatedCheck />
          </Center>
        )
      case !!orderError:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <WarningIcon color='red.500' />
          </Center>
        )
      default:
        return (
          <Center boxSize='32px' borderWidth='2px' borderColor='border.base' borderRadius='full'>
            <CircularProgress size='20px' isIndeterminate />
          </Center>
        )
    }
  }, [orderData, orderError])

  const summaryStepProps = useMemo(
    () => ({
      py: 0,
      onClick: () => setIsExpanded(!isExpanded),
      cursor: 'pointer',
      'data-expanded': isExpanded,
    }),
    [isExpanded],
  )

  const titleTranslation: string | [string, number | Polyglot.InterpolationOptions] | null =
    useMemo(() => {
      switch (orderSubmissionState) {
        case LimitOrderSubmissionState.AwaitingAllowanceReset:
          return 'limitOrder.awaitingAllowanceReset'
        case LimitOrderSubmissionState.AwaitingAllowanceApproval:
          return 'limitOrder.awaitingApproval'
        case LimitOrderSubmissionState.AwaitingLimitOrderSubmission:
          return ['limitOrder.awaitingOrderPlacement', { swapperName: SwapperName.CowSwap }]
        default:
          return null
      }
    }, [orderSubmissionState])

  const titleElement = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1} gap={2}>
        <Text translation={titleTranslation} fontWeight='medium' />
        <HStack mr={2}>
          <ArrowUpDownIcon boxSize={3} color='gray.500' />
        </HStack>
      </Flex>
    )
  }, [titleTranslation])

  const stepIndicator = useMemo(
    () => (
      <StepStatus
        complete={completedStepIndicator}
        incomplete={undefined}
        active={orderError ? erroredStepIndicator : undefined}
      />
    ),
    [orderError],
  )

  const allowanceResetTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.resetTitle' />
        {allowanceReset.txHash && sellAsset && sellAccountId && (
          <TxLabel
            txHash={allowanceReset.txHash}
            explorerBaseUrl={sellAsset.explorerTxLink}
            accountId={sellAccountId}
            swapperName={undefined} // no swapper base URL here, this is an allowance Tx
          />
        )}
      </Flex>
    )
  }, [allowanceReset.txHash, sellAccountId, sellAsset])

  const allowanceApprovalTitle = useMemo(() => {
    return (
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
        <Text translation='trade.approvalTitle' />
        {allowanceApproval.txHash && sellAsset && sellAccountId && (
          <TxLabel
            txHash={allowanceApproval.txHash}
            explorerBaseUrl={sellAsset.explorerTxLink}
            accountId={sellAccountId}
            swapperName={undefined} // no swapper base URL here, this is an allowance Tx
          />
        )}
      </Flex>
    )
  }, [allowanceApproval.txHash, sellAccountId, sellAsset])

  return (
    <Skeleton isLoaded={!isLoadingAllowance} width='100%'>
      <StepperStep
        title={titleElement}
        stepIndicator={summaryStepIndicator}
        stepProps={summaryStepProps}
        useSpacer={false}
      />
      <Collapse in={isExpanded} style={collapseStyle}>
        <Box pb={2} px={3}>
          {allowanceReset.isRequired && (
            <StepperStep
              title={allowanceResetTitle}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
              isError={allowanceReset.state === TransactionExecutionState.Failed}
              stepIndicatorVariant='innerSteps'
            />
          )}
          {isAllowanceApprovalRequired && (
            <StepperStep
              title={allowanceApprovalTitle}
              stepIndicator={stepIndicator}
              stepProps={stepProps}
              useSpacer={false}
              isError={allowanceApproval.state === TransactionExecutionState.Failed}
              stepIndicatorVariant='innerSteps'
            />
          )}
          <StepperStep
            title={translate('limitOrder.orderPlacement', { swapperName: SwapperName.CowSwap })}
            stepIndicator={stepIndicator}
            stepProps={stepProps}
            useSpacer={false}
            isError={!!orderError}
            stepIndicatorVariant='innerSteps'
          />
        </Box>
      </Collapse>
    </Skeleton>
  )
}
