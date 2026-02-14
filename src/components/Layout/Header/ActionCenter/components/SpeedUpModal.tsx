import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Tag,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { btcChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { FeeData } from '@shapeshiftoss/chain-adapters'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  FeeDataKey,
  toAddressNList,
} from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList, BTCOutputAddressType } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType, UtxoChainId } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn } from '@/lib/bignumber/bignumber'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const BTC_ASSET_ID: AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

type SpeedUpModalProps = {
  txHash: string
  accountId: AccountId
  assetId?: AssetId
  amountCryptoPrecision?: string
  accountIdsToRefetch?: AccountId[]
  isOpen: boolean
  onClose: () => void
}

const BTC_DUST_THRESHOLD = 546

type ReconstructedInput = {
  txid: string
  vout: number
  amount: string
  addressNList: number[]
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
  isOpen,
  onClose,
}: SpeedUpModalProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const {
    state: { wallet },
  } = useWallet()

  const pubkey = fromAccountId(accountId).account

  const btcAsset = useAppSelector(state => selectAssetById(state, BTC_ASSET_ID))
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, { accountId }),
  )

  const [feeData, setFeeData] = useState<Record<FeeDataKey, FeeData<UtxoChainId>> | null>(null)
  const [selectedFeeRate, setSelectedFeeRate] = useState<FeeDataKey>(FeeDataKey.Fast)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [originalFeeRate, setOriginalFeeRate] = useState<string>('0')
  const [originalVsize, setOriginalVsize] = useState<string>('0')

  const [reconstructedInputs, setReconstructedInputs] = useState<ReconstructedInput[]>([])
  const [reconstructedOutputs, setReconstructedOutputs] = useState<ReconstructedOutput[]>([])

  useEffect(() => {
    if (!isOpen || !accountMetadata) return

    const fetchTxData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const adapter = assertGetUtxoChainAdapter(btcChainId)
        const httpProvider = adapter.httpProvider

        const [originalTx, feeDataResult, utxos] = await Promise.all([
          httpProvider.getTransaction({ txid: txHash }),
          adapter.getFeeData({ to: '', value: '0', chainSpecific: { pubkey: '' } }),
          httpProvider.getUtxos({ pubkey }),
        ])

        setFeeData(feeDataResult as Record<FeeDataKey, FeeData<UtxoChainId>>)

        const fee = bn(originalTx.fee)
        const txSize = bn(originalTx.hex.length).div(2)
        const feeRate = fee.div(txSize).integerValue()

        setOriginalFeeRate(feeRate.toFixed(0))
        setOriginalVsize(txSize.toFixed(0))

        const { bip44Params } = accountMetadata

        const utxoByAddress = new Map<string, { path?: string }>()
        for (const utxo of utxos) {
          if (utxo.address) {
            utxoByAddress.set(utxo.address, { path: utxo.path })
          }
        }

        const inputs: ReconstructedInput[] = await Promise.all(
          originalTx.vin
            .filter(
              (vin): vin is typeof vin & { txid: string; vout: string; value: string } =>
                Boolean(vin.txid) && vin.vout !== undefined && Boolean(vin.value),
            )
            .map(async vin => {
              const prevTx = await httpProvider.getTransaction({ txid: vin.txid })

              const vinAddress = vin.addresses?.[0]
              const utxoInfo = vinAddress ? utxoByAddress.get(vinAddress) : undefined
              const addressNList = utxoInfo?.path
                ? bip32ToAddressNList(utxoInfo.path)
                : toAddressNList(bip44Params)

              return {
                txid: vin.txid,
                vout: Number(vin.vout),
                amount: vin.value,
                addressNList,
                hex: prevTx.hex,
              }
            }),
        )

        const ownAddresses = new Set(utxos.map(u => u.address).filter(Boolean))
        const outputs: ReconstructedOutput[] = originalTx.vout.map(vout => {
          const address = vout.addresses?.[0]
          const isChange = Boolean(address && ownAddresses.has(address))
          return {
            address,
            amount: vout.value,
            isChange,
          }
        })

        setReconstructedInputs(inputs)
        setReconstructedOutputs(outputs)
      } catch (e) {
        console.error('Failed to fetch transaction data:', e)
        setError(translate('modals.send.speedUp.fetchError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchTxData()
  }, [isOpen, txHash, pubkey, accountMetadata, translate])

  const feeRateOptions = useMemo(() => {
    if (!feeData) return []
    return [FeeDataKey.Average, FeeDataKey.Fast]
      .map(key => {
        const rate = feeData[key].chainSpecific.satoshiPerByte
        const label =
          key === FeeDataKey.Average
            ? translate('modals.send.sendForm.average')
            : translate('modals.send.sendForm.fast')
        return { key, rate, label }
      })
      .filter(opt => bn(opt.rate).gt(originalFeeRate))
  }, [feeData, originalFeeRate, translate])

  const newFeeRate = useMemo(() => {
    if (!feeData) return originalFeeRate
    return feeData[selectedFeeRate].chainSpecific.satoshiPerByte
  }, [feeData, selectedFeeRate, originalFeeRate])

  const feeDiff = useMemo(() => {
    if (!originalVsize || originalVsize === '0') return bn(0)
    const originalFee = bn(originalVsize).times(originalFeeRate)
    const newFee = bn(originalVsize).times(newFeeRate)
    return newFee.minus(originalFee)
  }, [originalVsize, originalFeeRate, newFeeRate])

  const hasInsufficientFunds = useMemo(() => {
    if (reconstructedInputs.length === 0 || reconstructedOutputs.length === 0) return false
    const totalInputValue = reconstructedInputs.reduce(
      (sum, input) => sum.plus(input.amount),
      bn(0),
    )
    const totalPaymentValue = reconstructedOutputs
      .filter(o => !o.isChange)
      .reduce((sum, o) => sum.plus(o.amount), bn(0))
    const newFee = bn(originalVsize).times(newFeeRate).integerValue()
    return totalInputValue.minus(totalPaymentValue).minus(newFee).lt(0)
  }, [reconstructedInputs, reconstructedOutputs, originalVsize, newFeeRate])

  const handleSpeedUp = useCallback(async () => {
    if (!wallet || !accountMetadata || reconstructedInputs.length === 0) return
    setIsSubmitting(true)
    setError(null)

    try {
      const adapter = assertGetUtxoChainAdapter(btcChainId)
      const accountType = accountMetadata.accountType as UtxoAccountType

      const totalInputValue = reconstructedInputs.reduce(
        (sum, input) => sum.plus(input.amount),
        bn(0),
      )
      const paymentOutputs = reconstructedOutputs.filter(o => !o.isChange)
      const totalPaymentValue = paymentOutputs.reduce((sum, o) => sum.plus(o.amount), bn(0))

      const newFee = bn(originalVsize).times(newFeeRate).integerValue()
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

      const txToSign: BTCSignTx = {
        coin: 'Bitcoin',
        inputs: reconstructedInputs.map(input => ({
          addressNList: input.addressNList,
          scriptType: accountTypeToScriptType[accountType],
          amount: input.amount,
          vout: input.vout,
          txid: input.txid,
          hex: input.hex,
          sequence: 0xfffffffe,
        })) as BTCSignTx['inputs'],
        outputs,
        version: 1,
        locktime: 0,
      }

      const signedTx = await adapter.signTransaction({ txToSign, wallet })
      const replacementTxHash = await adapter.broadcastTransaction({ hex: signedTx })

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
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

      onClose()
    } catch (e) {
      console.error('Speed up failed:', e)
      setError(e instanceof Error ? e.message : translate('modals.send.speedUp.speedUpFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }, [
    wallet,
    accountMetadata,
    reconstructedInputs,
    reconstructedOutputs,
    originalVsize,
    newFeeRate,
    pubkey,
    txHash,
    accountId,
    assetId,
    amountCryptoPrecision,
    accountIdsToRefetch,
    dispatch,
    onClose,
    translate,
  ])

  if (!btcAsset) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{translate('modals.send.speedUp.title')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Stack alignItems='center' py={8}>
              <Spinner />
            </Stack>
          ) : (
            <Stack gap={4}>
              <Row fontSize='sm'>
                <Row.Label>{translate('modals.send.speedUp.currentFeeRate')}</Row.Label>
                <Row.Value>{originalFeeRate} sat/B</Row.Value>
              </Row>
              <Row fontSize='sm'>
                <Row.Label>{translate('modals.send.speedUp.selectFeeRate')}</Row.Label>
                <Row.Value>
                  <Stack direction='row' gap={2}>
                    {feeRateOptions.map(opt => (
                      <Tag
                        key={opt.key}
                        size='sm'
                        cursor='pointer'
                        colorScheme={selectedFeeRate === opt.key ? 'blue' : 'gray'}
                        onClick={() => setSelectedFeeRate(opt.key)}
                      >
                        {opt.label}: {opt.rate} sat/B
                      </Tag>
                    ))}
                    {feeRateOptions.length === 0 && feeData && (
                      <Tag size='sm' colorScheme='orange'>
                        {translate('modals.send.speedUp.feesTooLow')}
                      </Tag>
                    )}
                  </Stack>
                </Row.Value>
              </Row>
              {feeDiff.gt(0) && (
                <Row fontSize='sm'>
                  <Row.Label>{translate('modals.send.speedUp.feeDifference')}</Row.Label>
                  <Row.Value>
                    +{feeDiff.div(1e8).toFixed(8)} {btcAsset.symbol}
                  </Row.Value>
                </Row>
              )}
              {hasInsufficientFunds && (
                <Tag size='sm' colorScheme='orange'>
                  {translate('modals.send.speedUp.insufficientFunds')}
                </Tag>
              )}
              {error && (
                <Tag size='sm' colorScheme='red'>
                  {error}
                </Tag>
              )}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            width='full'
            colorScheme='blue'
            isLoading={isSubmitting}
            isDisabled={
              isLoading ||
              isSubmitting ||
              feeRateOptions.length === 0 ||
              bn(newFeeRate).lte(originalFeeRate) ||
              hasInsufficientFunds
            }
            onClick={handleSpeedUp}
          >
            {translate('modals.send.speedUp.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
