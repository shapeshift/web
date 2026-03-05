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
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { btcChainId, fromAccountId } from '@shapeshiftoss/caip'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  toAddressNList,
} from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList, BTCOutputAddressType } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import {
  getDisplayFeeRateSatPerVbPrecise,
  getTxFeeSats,
  getTxIdFromHex,
  getTxVsize,
  isLikelyBitcoinTxId,
  resolveVinVoutIndex,
} from './speedUpUtils'

import { Amount } from '@/components/Amount/Amount'
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
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const BTC_ASSET_ID: AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

type SpeedUpModalProps = {
  txHash: string
  accountId: AccountId
  assetId?: AssetId
  amountCryptoPrecision?: string
  accountIdsToRefetch?: AccountId[]
  btcUtxoRbfTxMetadata?: BtcUtxoRbfTxMetadata
  isOpen: boolean
  onClose: () => void
}

const BTC_DUST_THRESHOLD = 546
const FETCH_RETRIES = 1
const RETRY_DELAY_MS = 300
const BROADCAST_VERIFY_RETRIES = 10
const BROADCAST_VERIFY_DELAY_MS = 1000
const MIN_REPLACEMENT_RELAY_FEE_RATE_SATS_PER_VB = 1

type ReconstructedInput = {
  txid: string
  vout: number
  amount: string
  addressNList: number[]
  alternateAddressNList?: number[]
  hex: string
}

type ReconstructedOutput = {
  address?: string
  amount: string
  isChange: boolean
}

export const SpeedUpModal = ({
  txHash,
  accountId,
  assetId = BTC_ASSET_ID,
  amountCryptoPrecision,
  accountIdsToRefetch,
  btcUtxoRbfTxMetadata,
  isOpen,
  onClose,
}: SpeedUpModalProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const toast = useToast()
  const {
    state: { wallet },
  } = useWallet()

  const pubkey = fromAccountId(accountId).account

  const btcAsset = useAppSelector(state => selectAssetById(state, BTC_ASSET_ID))
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const btcMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, BTC_ASSET_ID),
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId }),
  )
  const btcPrecision = btcAsset?.precision ?? 8

  const [selectedFeeRate, setSelectedFeeRate] = useState<string>('0')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [originalFeeRate, setOriginalFeeRate] = useState<string>('0')
  const [originalVsize, setOriginalVsize] = useState<string>('0')
  const [originalFeeSats, setOriginalFeeSats] = useState<string>('0')

  const [reconstructedInputs, setReconstructedInputs] = useState<ReconstructedInput[]>([])
  const [reconstructedOutputs, setReconstructedOutputs] = useState<ReconstructedOutput[]>([])
  const [isAlreadyConfirmed, setIsAlreadyConfirmed] = useState(false)
  const fetchedTxRef = useRef<string | null>(null)
  const intendedSendSats = useMemo(() => {
    if (!amountCryptoPrecision) return undefined
    if (!btcPrecision) return undefined
    return bn(amountCryptoPrecision).times(bn(10).pow(btcPrecision)).integerValue().toFixed(0)
  }, [amountCryptoPrecision, btcPrecision])

  const sleep = useCallback((ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }, [])

  const withRetry = useCallback(
    async <T,>(fetcher: () => Promise<T>): Promise<T> => {
      let lastError: unknown
      for (let i = 0; i <= FETCH_RETRIES; i++) {
        try {
          return await fetcher()
        } catch (e) {
          lastError = e
          if (i === FETCH_RETRIES) break
          await sleep(RETRY_DELAY_MS * (i + 1))
        }
      }
      throw lastError
    },
    [sleep],
  )

  useEffect(() => {
    if (!isOpen) {
      fetchedTxRef.current = null
      return
    }
    if (!accountMetadata) return
    if (fetchedTxRef.current === txHash) return
    let cancelled = false

    const fetchTxData = async () => {
      setIsLoading(true)
      setError(null)
      setIsAlreadyConfirmed(false)

      try {
        const adapter = assertGetUtxoChainAdapter(btcChainId)
        const httpProvider = adapter.httpProvider

        const [originalTx, utxos] = await Promise.all([
          withRetry(() => httpProvider.getTransaction({ txid: txHash })),
          withRetry(() => httpProvider.getUtxos({ pubkey })),
        ])

        if (cancelled) return
        const confirmed = Boolean((originalTx.confirmations ?? 0) > 0)

        const feeSats = getTxFeeSats(originalTx)
        const txSize = getTxVsize(originalTx)
        const feeRate = getDisplayFeeRateSatPerVbPrecise({
          tx: {
            ...originalTx,
            fee: feeSats.toFixed(0),
          },
        })

        setOriginalFeeRate(feeRate.toFixed(2))
        setOriginalVsize(txSize.toFixed(0))
        setOriginalFeeSats(feeSats.toFixed(0))
        setSelectedFeeRate(feeRate.toFixed(2))

        const { bip44Params } = accountMetadata
        const accountType = accountMetadata.accountType as UtxoAccountType
        const account = await adapter.getAccount(pubkey)
        const accountAddressIndexByAddress = new Map<string, number>()
        account.chainSpecific.addresses?.forEach((entry, index) => {
          if (entry.pubkey) accountAddressIndexByAddress.set(entry.pubkey, index)
        })

        const utxoByAddress = new Map<string, { path?: string }>()
        for (const utxo of utxos) {
          if (utxo.address) {
            utxoByAddress.set(utxo.address, { path: utxo.path })
          }
        }

        const ownAddresses = new Set(utxos.map(u => u.address).filter(Boolean))
        const intendedPaymentIndices =
          intendedSendSats !== undefined
            ? originalTx.vout
                .map((vout, index) => ({ index, value: String(vout.value ?? '0') }))
                .filter(({ value }) => value === intendedSendSats)
                .map(({ index }) => index)
            : []
        const hasUniqueIntendedPaymentIndex = intendedPaymentIndices.length === 1
        const outputs: ReconstructedOutput[] = originalTx.vout.map((vout, index) => {
          const address = vout.addresses?.[0]
          const isChange = hasUniqueIntendedPaymentIndex
            ? index !== intendedPaymentIndices[0]
            : Boolean(address && ownAddresses.has(address))
          return {
            address,
            amount: vout.value,
            isChange,
          }
        })

        if (cancelled) return
        setReconstructedOutputs(outputs)
        setReconstructedInputs([])

        if (confirmed) {
          setIsAlreadyConfirmed(true)
          return
        }

        const reconstructInputs = async () => {
          try {
            const inputs: ReconstructedInput[] = await Promise.all(
              originalTx.vin
                .filter((vin): vin is typeof vin & { txid: string } => Boolean(vin.txid))
                .map(async (vin, index) => {
                  const metadataInput = btcUtxoRbfTxMetadata?.inputs[index]
                  const prevTx = await httpProvider.getTransaction({ txid: vin.txid })
                  const vinAddress = vin.addresses?.[0]
                  const voutIndex = resolveVinVoutIndex({
                    vinVout: vin.vout,
                    vinValue: vin.value,
                    vinAddress,
                    prevTxVouts: prevTx.vout,
                  })
                  if (voutIndex === undefined) {
                    throw new Error(`Unable to resolve vin.vout for ${vin.txid}`)
                  }
                  const prevOutputAmount = prevTx.vout[voutIndex]?.value
                  const inputAmount = vin.value ?? prevOutputAmount ?? '0'

                  const utxoInfo = vinAddress ? utxoByAddress.get(vinAddress) : undefined
                  const accountAddressIndex = vinAddress
                    ? accountAddressIndexByAddress.get(vinAddress)
                    : undefined
                  const receivePath =
                    accountAddressIndex !== undefined
                      ? toAddressNList(
                          adapter.getBip44Params({
                            accountNumber: bip44Params.accountNumber,
                            accountType,
                            isChange: false,
                            addressIndex: accountAddressIndex,
                          }),
                        )
                      : undefined
                  const changePath =
                    accountAddressIndex !== undefined
                      ? toAddressNList(
                          adapter.getBip44Params({
                            accountNumber: bip44Params.accountNumber,
                            accountType,
                            isChange: true,
                            addressIndex: accountAddressIndex,
                          }),
                        )
                      : undefined

                  const metadataAddressNList = metadataInput?.addressNList
                  let addressNList = metadataAddressNList?.length
                    ? metadataAddressNList
                    : utxoInfo?.path
                    ? bip32ToAddressNList(utxoInfo.path)
                    : receivePath ?? toAddressNList(bip44Params)
                  let alternateAddressNList =
                    metadataAddressNList?.length ||
                    utxoInfo?.path ||
                    accountAddressIndex === undefined
                      ? undefined
                      : changePath
                  const walletWithBtcGetAddress = wallet as unknown as {
                    btcGetAddress?: (input: {
                      addressNList: number[]
                      coin: string
                      scriptType: BTCSignTx['inputs'][number]['scriptType']
                      showDisplay: boolean
                    }) => Promise<string>
                  }

                  if (
                    !utxoInfo?.path &&
                    walletWithBtcGetAddress?.btcGetAddress &&
                    vinAddress &&
                    receivePath &&
                    changePath
                  ) {
                    const [derivedReceiveAddress, derivedChangeAddress] = await Promise.all([
                      walletWithBtcGetAddress.btcGetAddress({
                        addressNList: receivePath,
                        coin: 'Bitcoin',
                        scriptType: accountTypeToScriptType[accountType],
                        showDisplay: false,
                      }),
                      walletWithBtcGetAddress.btcGetAddress({
                        addressNList: changePath,
                        coin: 'Bitcoin',
                        scriptType: accountTypeToScriptType[accountType],
                        showDisplay: false,
                      }),
                    ])

                    if (derivedReceiveAddress === vinAddress) {
                      addressNList = receivePath
                      alternateAddressNList = changePath
                    } else if (derivedChangeAddress === vinAddress) {
                      addressNList = changePath
                      alternateAddressNList = receivePath
                    }
                  }

                  return {
                    txid: vin.txid,
                    vout: voutIndex,
                    amount: inputAmount,
                    addressNList,
                    alternateAddressNList,
                    hex: prevTx.hex,
                  }
                }),
            )

            if (cancelled) return
            setReconstructedInputs(inputs)
          } catch (inputError) {
            console.error('Failed to reconstruct replacement tx inputs:', inputError)
            if (cancelled) return
            setError(translate('modals.send.speedUp.fetchError'))
          }
        }
        await reconstructInputs()
        fetchedTxRef.current = txHash
      } catch (e) {
        console.error('Failed to fetch transaction data:', e)
        if (cancelled) return
        setOriginalFeeRate(prev => (bn(prev).gt(0) ? prev : '1'))
        setSelectedFeeRate(prev => (bn(prev).gt(0) ? prev : '1'))
        setError(translate('modals.send.speedUp.fetchError'))
        toast({
          title: translate('common.error'),
          description: translate('modals.send.speedUp.fetchError'),
          status: 'error',
          duration: 9000,
          isClosable: true,
          position: 'top-right',
        })
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchTxData()

    return () => {
      cancelled = true
    }
  }, [
    accountMetadata,
    btcUtxoRbfTxMetadata,
    isOpen,
    onClose,
    pubkey,
    toast,
    translate,
    txHash,
    wallet,
    withRetry,
    intendedSendSats,
  ])

  const quickMultiplierMarks = useMemo(() => {
    const current = Number(originalFeeRate)
    return [2, 3, 5]
      .map(multiplier => ({
        value: current * multiplier,
        label: `${multiplier}x`,
      }))
      .filter(mark => Number.isFinite(mark.value))
  }, [originalFeeRate])

  const sliderMarks = useMemo(() => {
    const current = Number(originalFeeRate)
    const multiplierMarks = [2, 3, 5].map(multiplier => ({
      value: current * multiplier,
      label: `${multiplier}x`,
    }))
    const marks = [{ value: current, label: translate('common.current') }, ...multiplierMarks]
    return marks
      .filter(mark => Number.isFinite(mark.value))
      .sort((a, b) => a.value - b.value)
      .filter((mark, index, arr) => index === 0 || mark.value !== arr[index - 1].value)
  }, [originalFeeRate, translate])

  const sliderMin = useMemo(() => Number(originalFeeRate), [originalFeeRate])
  const sliderMax = useMemo(() => {
    const maxMark = sliderMarks[sliderMarks.length - 1]?.value ?? sliderMin
    return Math.max(sliderMin + 1, maxMark)
  }, [sliderMarks, sliderMin])

  const newFeeRate = useMemo(() => {
    return selectedFeeRate || originalFeeRate
  }, [selectedFeeRate, originalFeeRate])

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

  const previousFeeCrypto = useMemo(() => {
    if (!originalFeeSats || originalFeeSats === '0') return bn(0)
    return bn(
      BigAmount.fromBaseUnit({
        value: originalFeeSats,
        precision: btcPrecision,
      }).toPrecision(),
    )
  }, [btcPrecision, originalFeeSats])

  const newFeeCrypto = useMemo(() => {
    if (effectiveNewFeeSats.lte(0)) return bn(0)
    return bn(
      BigAmount.fromBaseUnit({
        value: effectiveNewFeeSats.toFixed(0),
        precision: btcPrecision,
      }).toPrecision(),
    )
  }, [btcPrecision, effectiveNewFeeSats])

  const additionalFeeCrypto = useMemo(() => {
    return newFeeCrypto.minus(previousFeeCrypto)
  }, [newFeeCrypto, previousFeeCrypto])

  const previousFeeFiat = useMemo(
    () => previousFeeCrypto.times(btcMarketData?.price ?? 0),
    [btcMarketData?.price, previousFeeCrypto],
  )
  const newFeeFiat = useMemo(
    () => newFeeCrypto.times(btcMarketData?.price ?? 0),
    [btcMarketData?.price, newFeeCrypto],
  )
  const additionalFeeFiat = useMemo(
    () => additionalFeeCrypto.times(btcMarketData?.price ?? 0),
    [additionalFeeCrypto, btcMarketData?.price],
  )

  const hasInsufficientFunds = useMemo(() => {
    if (reconstructedInputs.length === 0 || reconstructedOutputs.length === 0) return false
    const totalInputValue = reconstructedInputs.reduce(
      (sum, input) => sum.plus(input.amount),
      bn(0),
    )
    const totalPaymentValue = reconstructedOutputs
      .filter(o => !o.isChange)
      .reduce((sum, o) => sum.plus(o.amount), bn(0))
    const newFee = effectiveNewFeeSats
    return totalInputValue.minus(totalPaymentValue).minus(newFee).lt(0)
  }, [effectiveNewFeeSats, reconstructedInputs, reconstructedOutputs])

  const speedUpMutation = useMutation({
    onMutate: () => setError(null),
    mutationFn: async () => {
      if (!wallet || !accountMetadata || reconstructedInputs.length === 0) return

      const adapter = assertGetUtxoChainAdapter(btcChainId)
      const accountType = accountMetadata.accountType as UtxoAccountType
      const latestTx = await adapter.httpProvider.getTransaction({ txid: txHash }).catch(() => null)
      if (!latestTx || (latestTx.confirmations ?? 0) > 0) {
        throw new Error(translate('modals.send.speedUp.alreadySpentOrReplaced'))
      }

      const totalInputValue = reconstructedInputs.reduce(
        (sum, input) => sum.plus(input.amount),
        bn(0),
      )
      const paymentOutputs = reconstructedOutputs.filter(o => !o.isChange)
      const totalPaymentValue = paymentOutputs.reduce((sum, o) => sum.plus(o.amount), bn(0))

      const newFee = effectiveNewFeeSats
      const newChange = totalInputValue.minus(totalPaymentValue).minus(newFee)

      const account = await adapter.getAccount(pubkey)
      const changeBip44Params = adapter.getBip44Params({
        accountNumber: accountMetadata.bip44Params.accountNumber,
        accountType,
        isChange: true,
        addressIndex: account.chainSpecific.nextChangeAddressIndex,
      })

      const outputs: BTCSignTx['outputs'] = paymentOutputs
        .filter((o): o is typeof o & { address: string } => Boolean(o.address))
        .map(o => ({
          addressType: BTCOutputAddressType.Spend,
          address: o.address,
          amount: o.amount,
        })) as BTCSignTx['outputs']

      if (newChange.gte(BTC_DUST_THRESHOLD)) {
        ;(outputs as unknown as unknown[]).push({
          addressType: BTCOutputAddressType.Change,
          addressNList: toAddressNList(changeBip44Params),
          scriptType: accountTypeToOutputScriptType[accountType],
          amount: newChange.toFixed(0),
          isChange: true,
        })
      }

      const ambiguousInputIndices = reconstructedInputs.reduce<number[]>((acc, input, index) => {
        if (input.alternateAddressNList) acc.push(index)
        return acc
      }, [])

      const maxAttempts = Math.min(1 << ambiguousInputIndices.length, 16)
      let replacementTxHash: string | undefined
      let replacementBtcUtxoRbfTxMetadata: BtcUtxoRbfTxMetadata | undefined
      let lastError: unknown

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const txInputs = reconstructedInputs.map((input, index) => {
          const ambiguousIndex = ambiguousInputIndices.indexOf(index)
          const useAlternate =
            ambiguousIndex >= 0 && input.alternateAddressNList
              ? Boolean((attempt >> ambiguousIndex) & 1)
              : false

          return {
            addressNList:
              useAlternate && input.alternateAddressNList
                ? input.alternateAddressNList
                : input.addressNList,
            scriptType: accountTypeToScriptType[accountType],
            amount: input.amount,
            vout: input.vout,
            txid: input.txid,
            hex: input.hex,
            sequence: 0xfffffffd,
          }
        }) as BTCSignTx['inputs']
        replacementBtcUtxoRbfTxMetadata = {
          inputs: txInputs.map(input => ({ addressNList: input.addressNList })),
        }

        const txToSign: BTCSignTx = {
          coin: 'Bitcoin',
          inputs: txInputs,
          outputs,
          version: 1,
          locktime: 0,
        }
        try {
          const signedTx = await adapter.signTransaction({ txToSign, wallet })
          const signedTxId = getTxIdFromHex(signedTx)

          const broadcastResult = await adapter.broadcastTransaction({ hex: signedTx })
          const broadcastTxId = String(broadcastResult).trim()

          const candidateTxIds = [
            ...new Set([broadcastTxId, signedTxId].filter(isLikelyBitcoinTxId)),
          ]
          if (!candidateTxIds.length) {
            throw new Error(`Unexpected broadcast txid response: ${broadcastResult}`)
          }

          let resolvedTxId: string | undefined
          for (const candidateTxId of candidateTxIds) {
            for (let i = 0; i <= BROADCAST_VERIFY_RETRIES; i++) {
              const observedTx = await adapter.httpProvider
                .getTransaction({ txid: candidateTxId })
                .catch(() => null)
              if (observedTx) {
                resolvedTxId = candidateTxId
                break
              }
              if (i < BROADCAST_VERIFY_RETRIES) await sleep(BROADCAST_VERIFY_DELAY_MS)
            }
            if (resolvedTxId) break
          }

          if (!resolvedTxId) throw new Error(translate('modals.send.speedUp.broadcastNotObserved'))

          replacementTxHash = resolvedTxId
          break
        } catch (signError) {
          lastError = signError
        }
      }

      if (!replacementTxHash) throw lastError ?? new Error('Failed to sign replacement transaction')

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
            assetId,
            amountCryptoPrecision,
            message: 'modals.send.status.pendingBody',
            replacesTxHash: txHash,
            isRbfEnabled: true,
            btcUtxoRbfTxMetadata: replacementBtcUtxoRbfTxMetadata,
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

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
            updatedAt: Date.now(),
            transactionMetadata: {
              ...replacedAction.transactionMetadata,
              message: 'transactionHistory.replaced',
              replacedByTxHash: replacementTxHash,
            },
          }),
        )
      }

      onClose()
    },
    onError: e => {
      console.error('Speed up failed:', e)
      const message =
        e instanceof Error ? e.message : translate('modals.send.speedUp.speedUpFailed')

      setError(message)
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

  if (!btcAsset) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW='560px'>
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
                  <Amount.Crypto value={previousFeeCrypto.toFixed(8)} symbol={btcAsset.symbol} />
                  <Amount.Fiat value={previousFeeFiat.toFixed(2)} color='text.subtle' />
                </Stack>
              </Flex>
              <Flex justifyContent='space-between' alignItems='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('modals.send.speedUp.newFee')}
                </Text>
                <Stack gap={0} alignItems='flex-end'>
                  <Amount.Crypto value={newFeeCrypto.toFixed(8)} symbol={btcAsset.symbol} />
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
                    symbol={btcAsset.symbol}
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
