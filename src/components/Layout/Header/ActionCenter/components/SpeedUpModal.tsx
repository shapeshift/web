import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Spinner,
  Stack,
  Tag,
  Text,
  useToast,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { btcChainId, fromAccountId } from '@shapeshiftoss/caip'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  toAddressNList,
} from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import { BigAmount, bitcoin } from '@shapeshiftoss/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import type { OriginalTxSummary, ReconstructedInput, ReconstructedOutput } from './speedUpUtils'
import {
  buildOwnedAddressNListMap,
  buildReplacementOutputs,
  classifyOriginalOutputs,
  reconstructReplacementInputs,
  summarizeOriginalTx,
} from './speedUpUtils'

import { Amount } from '@/components/Amount/Amount'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn } from '@/lib/bignumber/bignumber'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { BtcUtxoRbfTxMetadata } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  isGenericTransactionAction,
} from '@/state/slices/actionSlice/types'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const BTC_DUST_THRESHOLD = 546
const FETCH_RETRIES = 1
const RETRY_DELAY_MS = 300
const MIN_REPLACEMENT_RELAY_FEE_RATE_SATS_PER_VB = 1
const FEE_MULTIPLIERS = [2, 3, 5] as const

type SpeedUpModalProps = {
  txHash: string
  accountId: AccountId
  amountCryptoPrecision?: string
  accountIdsToRefetch?: AccountId[]
  btcUtxoRbfTxMetadata?: BtcUtxoRbfTxMetadata
  isOpen: boolean
  onClose: () => void
}

type SpeedUpQueryData = {
  summary: OriginalTxSummary
  inputs: ReconstructedInput[]
  outputs: ReconstructedOutput[]
  confirmed: boolean
}

export const SpeedUpModal = ({
  txHash,
  accountId,
  amountCryptoPrecision,
  accountIdsToRefetch,
  btcUtxoRbfTxMetadata,
  isOpen,
  onClose,
}: SpeedUpModalProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const toast = useToast()
  const wallet = useWallet().state.wallet

  const pubkey = fromAccountId(accountId).account

  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const btcMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, bitcoin.assetId),
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId }),
  )

  const [selectedFeeRate, setSelectedFeeRate] = useState<string>('0')
  const [mutationError, setMutationError] = useState<string | null>(null)

  const speedUpQuery = useQuery<SpeedUpQueryData, Error>({
    queryKey: [
      'speedUp',
      txHash,
      pubkey,
      accountMetadata?.accountType,
      accountMetadata?.bip44Params,
      btcUtxoRbfTxMetadata,
    ],
    enabled: Boolean(isOpen && accountMetadata),
    staleTime: 0,
    retry: FETCH_RETRIES,
    retryDelay: attempt => RETRY_DELAY_MS * (attempt + 1),
    queryFn: async () => {
      const adapter = assertGetUtxoChainAdapter(btcChainId)
      const httpProvider = adapter.httpProvider

      const [originalTx, account] = await Promise.all([
        httpProvider.getTransaction({ txid: txHash }),
        adapter.getAccount(pubkey),
      ])

      const summary = summarizeOriginalTx(originalTx)
      const confirmed = (originalTx.confirmations ?? 0) > 0

      const ownedAddressMap = buildOwnedAddressNListMap(account.chainSpecific.addresses)

      const outputs = classifyOriginalOutputs({
        vouts: originalTx.vout,
        ownedAddressMap,
      })

      if (confirmed) return { summary, outputs, inputs: [], confirmed: true }

      const vinsWithTxid = originalTx.vin.filter((vin): vin is typeof vin & { txid: string } =>
        Boolean(vin.txid),
      )

      const prevTxs = await Promise.all(
        vinsWithTxid.map(vin => httpProvider.getTransaction({ txid: vin.txid })),
      )

      const inputs = reconstructReplacementInputs({
        vins: vinsWithTxid,
        prevTxs,
        ownedAddressMap,
        metadata: btcUtxoRbfTxMetadata,
      })

      return { summary, outputs, inputs, confirmed: false }
    },
  })

  useEffect(() => {
    const feeRate = speedUpQuery.data?.summary.feeRate
    if (feeRate) setSelectedFeeRate(feeRate)
  }, [speedUpQuery.data?.summary.feeRate])

  useEffect(() => {
    if (!speedUpQuery.error) return
    console.error('Failed to fetch transaction data:', speedUpQuery.error)
    toast({
      title: translate('common.error'),
      description: translate('modals.send.speedUp.fetchError'),
      status: 'error',
      duration: 9000,
      isClosable: true,
      position: 'top-right',
    })
  }, [speedUpQuery.error, toast, translate])

  const queryData = speedUpQuery.data
  const isLoading = speedUpQuery.isFetching
  const reconstructedInputs = useMemo(() => queryData?.inputs ?? [], [queryData?.inputs])
  const reconstructedOutputs = useMemo(() => queryData?.outputs ?? [], [queryData?.outputs])
  const isAlreadyConfirmed = queryData?.confirmed ?? false
  const originalFeeRate = queryData?.summary.feeRate ?? '0'
  const originalVsize = queryData?.summary.vsize ?? '0'
  const originalFeeSats = queryData?.summary.feeSats ?? '0'
  const error =
    mutationError ?? (speedUpQuery.error ? translate('modals.send.speedUp.fetchError') : null)

  const sliderMarks = useMemo(() => {
    const current = Number(originalFeeRate)
    const marks = [
      { value: current, label: translate('common.current') },
      ...FEE_MULTIPLIERS.map(multiplier => ({
        value: current * multiplier,
        label: `${multiplier}x`,
      })),
    ]
    return marks
      .filter(mark => Number.isFinite(mark.value))
      .sort((a, b) => a.value - b.value)
      .filter((mark, index, arr) => index === 0 || mark.value !== arr[index - 1].value)
  }, [originalFeeRate, translate])

  const currentMarkLabel = translate('common.current')
  const quickMultiplierMarks = useMemo(
    () => sliderMarks.filter(mark => mark.label !== currentMarkLabel),
    [sliderMarks, currentMarkLabel],
  )

  const sliderMin = useMemo(() => Number(originalFeeRate), [originalFeeRate])
  const sliderMax = useMemo(() => {
    const maxMark = sliderMarks[sliderMarks.length - 1]?.value ?? sliderMin
    return Math.max(sliderMin + 1, maxMark)
  }, [sliderMarks, sliderMin])

  const newFeeRate = useMemo(
    () => selectedFeeRate || originalFeeRate,
    [selectedFeeRate, originalFeeRate],
  )

  const effectiveNewFeeSats = useMemo(() => {
    if (!originalVsize || originalVsize === '0') return bn(0)
    const computedNewFee = bn(originalVsize).times(newFeeRate).integerValue()
    const minimumAdditionalRelayFee = bn(originalVsize)
      .times(MIN_REPLACEMENT_RELAY_FEE_RATE_SATS_PER_VB)
      .integerValue()
    const minimumReplacementFee = bn(originalFeeSats)
      .plus(minimumAdditionalRelayFee.gt(0) ? minimumAdditionalRelayFee : 1)
      .integerValue()
    return computedNewFee.lte(minimumReplacementFee) ? minimumReplacementFee : computedNewFee
  }, [newFeeRate, originalFeeSats, originalVsize])

  const newChangeSats = useMemo(() => {
    if (reconstructedInputs.length === 0 || reconstructedOutputs.length === 0) return bn(0)

    const totalInputValue = reconstructedInputs.reduce(
      (sum, input) => sum.plus(input.amount),
      bn(0),
    )

    const totalNonChangeValue = reconstructedOutputs
      .filter(o => !o.isChange)
      .reduce((sum, o) => sum.plus(o.amount), bn(0))

    return totalInputValue.minus(totalNonChangeValue).minus(effectiveNewFeeSats)
  }, [effectiveNewFeeSats, reconstructedInputs, reconstructedOutputs])

  // Below-dust change is dropped and absorbed into fee; show what's actually paid.
  const actualNewFeeSats = useMemo(() => {
    if (newChangeSats.gte(0) && newChangeSats.lt(BTC_DUST_THRESHOLD)) {
      return effectiveNewFeeSats.plus(newChangeSats)
    }
    return effectiveNewFeeSats
  }, [effectiveNewFeeSats, newChangeSats])

  const previousFeeCrypto = useMemo(() => {
    if (!originalFeeSats || originalFeeSats === '0') return bn(0)
    return bn(
      BigAmount.fromBaseUnit({
        value: originalFeeSats,
        precision: bitcoin.precision,
      }).toPrecision(),
    )
  }, [originalFeeSats])

  const newFeeCrypto = useMemo(() => {
    if (actualNewFeeSats.lte(0)) return bn(0)
    return bn(
      BigAmount.fromBaseUnit({
        value: actualNewFeeSats.toFixed(0),
        precision: bitcoin.precision,
      }).toPrecision(),
    )
  }, [actualNewFeeSats])

  const additionalFeeCrypto = useMemo(
    () => newFeeCrypto.minus(previousFeeCrypto),
    [newFeeCrypto, previousFeeCrypto],
  )

  const btcPriceUsd = btcMarketData?.price ?? 0
  const previousFeeFiat = useMemo(
    () => previousFeeCrypto.times(btcPriceUsd),
    [btcPriceUsd, previousFeeCrypto],
  )
  const newFeeFiat = useMemo(() => newFeeCrypto.times(btcPriceUsd), [btcPriceUsd, newFeeCrypto])
  const additionalFeeFiat = useMemo(
    () => additionalFeeCrypto.times(btcPriceUsd),
    [additionalFeeCrypto, btcPriceUsd],
  )

  const hasInsufficientFunds = useMemo(() => {
    if (reconstructedInputs.length === 0 || reconstructedOutputs.length === 0) return false
    return newChangeSats.lt(0)
  }, [newChangeSats, reconstructedInputs.length, reconstructedOutputs.length])

  const speedUpMutation = useMutation({
    onMutate: () => setMutationError(null),
    mutationFn: async () => {
      if (!wallet || !accountMetadata || !queryData || queryData.inputs.length === 0) return

      const accountType = accountMetadata.accountType as UtxoAccountType
      const adapter = assertGetUtxoChainAdapter(btcChainId)

      const latestTx = await adapter.httpProvider.getTransaction({ txid: txHash }).catch(() => null)
      if (!latestTx || (latestTx.confirmations ?? 0) > 0) {
        throw new Error(translate('modals.send.speedUp.alreadySpentOrReplaced'))
      }

      // Refetch the account for a current `nextChangeAddressIndex` — the user may have made other
      // tx activity since opening the modal.
      const account = await adapter.getAccount(pubkey)
      const changeAddressNList = toAddressNList(
        adapter.getBip44Params({
          accountNumber: accountMetadata.bip44Params.accountNumber,
          accountType,
          isChange: true,
          addressIndex: account.chainSpecific.nextChangeAddressIndex,
        }),
      )

      const buildResult = buildReplacementOutputs({
        outputs: queryData.outputs,
        newChangeSats,
        changeAddressNList,
        changeScriptType: accountTypeToOutputScriptType[accountType],
        dustThreshold: BTC_DUST_THRESHOLD,
      })
      if ('error' in buildResult) throw new Error(translate(buildResult.error))
      const { outputs, opReturnData } = buildResult

      const inputs = queryData.inputs.map(input => ({
        ...input,
        scriptType: accountTypeToScriptType[accountType],
        sequence: 0xfffffffd,
      })) as BTCSignTx['inputs']

      const txToSign: BTCSignTx = { coin: 'Bitcoin', inputs, outputs, opReturnData }
      const signedTx = await adapter.signTransaction({ txToSign, wallet })
      const replacementTxHash = await adapter.broadcastTransaction({ hex: signedTx })

      // Mark the replaced action first so the new Pending insert gets the newer
      // `updatedAt` from the reducer and sorts above it in the action list.
      const replacedAction = actionsById[txHash]
      if (
        replacedAction &&
        isGenericTransactionAction(replacedAction) &&
        replacedAction.status === ActionStatus.Pending
      ) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...replacedAction,
            status: ActionStatus.Replaced,
            transactionMetadata: {
              ...replacedAction.transactionMetadata,
              message: 'transactionHistory.replaced',
              replacedByTxHash: replacementTxHash,
            },
          }),
        )
      }

      dispatch(
        actionSlice.actions.upsertAction({
          id: replacementTxHash,
          type: ActionType.Send,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.SEND,
            txHash: replacementTxHash,
            chainId: btcChainId,
            accountId,
            accountIdsToRefetch,
            assetId: bitcoin.assetId,
            amountCryptoPrecision,
            message: 'modals.send.status.pendingBody',
            replacesTxHash: txHash,
            isRbfEnabled: true,
            btcUtxoRbfTxMetadata: {
              inputs: inputs.map(input => ({ addressNList: input.addressNList })),
            },
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

      onClose()
    },
    onError: e => {
      console.error('Speed up failed:', e)
      const message =
        e instanceof Error ? e.message : translate('modals.send.speedUp.speedUpFailed')
      setMutationError(message)
      toast({
        title: translate('common.error'),
        description: message,
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    },
  })

  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({ isOpen, onClose })

  return (
    <Modal isCentered {...modalProps}>
      <ModalOverlay {...overlayProps} />
      <ModalContent maxW='560px' pointerEvents='all' {...modalContentProps}>
        <ModalHeader>{translate('modals.send.speedUp.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Stack alignItems='center' py={8}>
              <Spinner />
            </Stack>
          ) : (
            <Stack gap={5}>
              <Flex justifyContent='space-between' alignItems='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('modals.send.speedUp.currentFeeRate')}
                </Text>
                <Tag size='sm' variant='subtle'>
                  {originalFeeRate} sat/B
                </Tag>
              </Flex>
              <Stack gap={4}>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('modals.send.speedUp.selectFeeRate')}
                </Text>
                <Box px={2} pb={5}>
                  <Slider
                    min={sliderMin}
                    max={sliderMax}
                    step={0.01}
                    value={Number(newFeeRate)}
                    onChange={value => setSelectedFeeRate(String(value))}
                  >
                    {sliderMarks.map(mark => (
                      <SliderMark
                        key={`${mark.label}-${mark.value}`}
                        value={mark.value}
                        mt='6'
                        transform='translateX(-50%)'
                        fontSize='2xs'
                        color='text.subtle'
                        whiteSpace='nowrap'
                      >
                        {mark.label}
                      </SliderMark>
                    ))}
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                </Box>
                <Tag
                  size='sm'
                  alignSelf='flex-start'
                  colorScheme={bn(newFeeRate).gt(originalFeeRate) ? 'blue' : 'orange'}
                >
                  {bn(newFeeRate).toFixed(2)} sat/B
                </Tag>
                <Stack direction='row' gap={2} flexWrap='wrap'>
                  {quickMultiplierMarks.map(mark => (
                    <Tag
                      key={`quick-${mark.label}-${mark.value}`}
                      size='sm'
                      cursor='pointer'
                      colorScheme={Number(newFeeRate) === mark.value ? 'blue' : 'gray'}
                      onClick={() => setSelectedFeeRate(String(mark.value))}
                    >
                      {mark.label}
                    </Tag>
                  ))}
                </Stack>
              </Stack>
              <Flex justifyContent='space-between' alignItems='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('modals.send.speedUp.previousFee')}
                </Text>
                <Stack gap={0} alignItems='flex-end'>
                  <Amount.Crypto value={previousFeeCrypto.toFixed(8)} symbol={bitcoin.symbol} />
                  <Amount.Fiat value={previousFeeFiat.toFixed(2)} color='text.subtle' />
                </Stack>
              </Flex>
              <Flex justifyContent='space-between' alignItems='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('modals.send.speedUp.newFee')}
                </Text>
                <Stack gap={0} alignItems='flex-end'>
                  <Amount.Crypto value={newFeeCrypto.toFixed(8)} symbol={bitcoin.symbol} />
                  <Amount.Fiat value={newFeeFiat.toFixed(2)} color='text.subtle' />
                </Stack>
              </Flex>
              <Flex justifyContent='space-between' alignItems='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('modals.send.speedUp.additionalFee')}
                </Text>
                <Stack gap={0} alignItems='flex-end'>
                  <Amount.Crypto
                    value={additionalFeeCrypto.toFixed(8)}
                    symbol={bitcoin.symbol}
                    prefix='+'
                  />
                  <Amount.Fiat
                    value={additionalFeeFiat.toFixed(2)}
                    color='text.subtle'
                    prefix='+'
                  />
                </Stack>
              </Flex>
              {hasInsufficientFunds && (
                <Tag size='sm' colorScheme='orange'>
                  {translate('modals.send.speedUp.insufficientFunds')}
                </Tag>
              )}
              {isAlreadyConfirmed && (
                <Tag size='sm' colorScheme='blue'>
                  {translate('modals.send.speedUp.alreadyConfirmed')}
                </Tag>
              )}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            width='full'
            colorScheme='blue'
            isLoading={speedUpMutation.isPending}
            isDisabled={
              isLoading ||
              speedUpMutation.isPending ||
              reconstructedInputs.length === 0 ||
              bn(newFeeRate).lte(originalFeeRate) ||
              hasInsufficientFunds ||
              isAlreadyConfirmed ||
              Boolean(error)
            }
            onClick={() => speedUpMutation.mutate()}
          >
            {translate('modals.send.speedUp.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
