import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useContext, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { RunePoolDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { InfoAcknowledgement } from '@/components/Acknowledgement/InfoAcknowledgement'
import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import type { DepositValues } from '@/features/defi/components/Deposit/Deposit'
import { Deposit as ReusableDeposit } from '@/features/defi/components/Deposit/Deposit'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { RUNEPOOL_DEPOSIT_MEMO } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { useThorchainMimirTimes } from '@/lib/utils/thorchain/hooks/useThorchainMimirTimes'
import { formatSecondsToDuration } from '@/lib/utils/time'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DepositProps = StepComponentProps & {
  accountId?: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
  fromAddress: string | undefined
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const Deposit: React.FC<DepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  fromAddress,
  onNext,
}) => {
  const { state, dispatch: contextDispatch } = useContext(DepositContext)

  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const translate = useTranslate()
  const [shouldShowInfoAcknowledgement, setShouldShowInfoAcknowledgement] = useState(false)
  const [depositValues, setDepositValues] = useState<DepositValues>()
  const [inputValues, setInputValues] = useState<{
    fiatAmount: string
    cryptoAmount: string
  } | null>(null)
  const navigate = useNavigate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const assets = useAppSelector(selectAssets)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunityId = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId ?? highestBalanceAccountId ?? '',
        opportunityId ?? '',
      ),
    }),
    [accountId, highestBalanceAccountId, opportunityId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )

  const balanceFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  ).toBaseUnit()

  const { data: thorchainMimirTimes, isLoading: isThorchainMimirTimesLoading } =
    useThorchainMimirTimes()

  const { estimatedFeesData, isEstimatedFeesDataLoading, outboundFeeCryptoBaseUnit } =
    useSendThorTx({
      assetId,
      accountId: accountId ?? null,
      amountCryptoBaseUnit: BigAmount.fromPrecision({
        value: inputValues?.cryptoAmount,
        precision: asset.precision,
      }).toBaseUnit(),
      memo: RUNEPOOL_DEPOSIT_MEMO,
      fromAddress: fromAddress ?? null,
      action: 'depositRunepool',
      enableEstimateFees: Boolean(bnOrZero(inputValues?.cryptoAmount).gt(0)),
    })

  const handleContinue = useCallback(
    (formValues: DepositValues) => {
      if (!accountId) return
      if (!inputValues) return
      if (!opportunityData) return
      if (!contextDispatch) return
      if (!estimatedFeesData) return

      contextDispatch({ type: RunePoolDepositActionType.SET_DEPOSIT, payload: formValues })
      contextDispatch({ type: RunePoolDepositActionType.SET_LOADING, payload: true })

      try {
        contextDispatch({
          type: RunePoolDepositActionType.SET_DEPOSIT,
          payload: {
            estimatedGasCryptoPrecision: BigAmount.fromBaseUnit({
              value: estimatedFeesData.txFeeCryptoBaseUnit,
              precision: asset.precision,
            }).toPrecision(),
            networkFeeCryptoBaseUnit: estimatedFeesData.txFeeCryptoBaseUnit,
          },
        })

        onNext(DefiStep.Confirm)
        trackOpportunityEvent(
          MixPanelEvent.DepositContinue,
          {
            opportunity: opportunityData,
            fiatAmounts: [formValues.fiatAmount],
            cryptoAmounts: [{ assetId, amountCryptoPrecision: formValues.cryptoAmount }],
          },
          assets,
        )
      } catch (error) {
        console.error(error)
        toast({
          description: translate('common.somethingWentWrongBody'),
          title: translate('common.somethingWentWrong'),
          status: 'error',
        })
      } finally {
        contextDispatch({ type: RunePoolDepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      accountId,
      inputValues,
      opportunityData,
      contextDispatch,
      estimatedFeesData,
      asset.precision,
      onNext,
      assetId,
      assets,
      toast,
      translate,
    ],
  )

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const balanceCryptoPrecision = useMemo(
    () =>
      bn(
        BigAmount.fromBaseUnit({
          value: balanceCryptoBaseUnit,
          precision: asset.precision,
        }).toPrecision(),
      ),
    [balanceCryptoBaseUnit, asset.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(balanceCryptoPrecision).times(bnOrZero(assetMarketData?.price)),
    [balanceCryptoPrecision, assetMarketData?.price],
  )

  const validateCryptoAmount = useCallback(
    (value: string) => {
      const valueCryptoPrecision = bnOrZero(value)
      if (balanceCryptoPrecision.isZero() || balanceCryptoPrecision.lt(value))
        return 'common.insufficientFunds'
      if (valueCryptoPrecision.isEqualTo(0)) return ''

      // RUNE is its own fee asset, so the outbound fee is denominated in RUNE directly
      const isBelowOutboundFee =
        bnOrZero(outboundFeeCryptoBaseUnit).gt(0) &&
        bn(BigAmount.fromPrecision({ value, precision: asset.precision }).toBaseUnit()).lt(
          outboundFeeCryptoBaseUnit ?? '0',
        )

      if (isBelowOutboundFee) {
        const minLimitCryptoPrecision = BigAmount.fromBaseUnit({
          value: outboundFeeCryptoBaseUnit ?? '0',
          precision: asset.precision,
        }).toPrecision()
        return translate('trade.errors.amountTooSmall', {
          minLimit: `${minLimitCryptoPrecision} ${asset.symbol}`,
        })
      }

      return true
    },
    [asset.precision, asset.symbol, balanceCryptoPrecision, outboundFeeCryptoBaseUnit, translate],
  )

  const validateFiatAmount = useCallback(
    (value: string) => {
      const fiatBalance = balanceCryptoPrecision.times(bnOrZero(assetMarketData?.price))
      if (fiatBalance.isZero() || fiatBalance.lt(value)) return 'common.insufficientFunds'

      return true
    },
    [assetMarketData?.price, balanceCryptoPrecision],
  )

  const handlePercentClick = useCallback(
    (percent: number) => {
      const percentageCryptoAmount = balanceCryptoPrecision.times(percent).dp(asset.precision)
      const percentageFiatAmount = percentageCryptoAmount.times(bnOrZero(assetMarketData?.price))

      if (contextDispatch) {
        contextDispatch({
          type: RunePoolDepositActionType.SET_DEPOSIT,
          payload: { sendMax: percent === 1 },
        })
      }

      return Promise.resolve({
        percentageCryptoAmount: percentageCryptoAmount.toFixed(),
        percentageFiatAmount: percentageFiatAmount.toFixed(),
      })
    },
    [asset.precision, assetMarketData?.price, balanceCryptoPrecision, contextDispatch],
  )

  const handleInputChange = useCallback(
    ({ fiatAmount, cryptoAmount }: { fiatAmount: string; cryptoAmount: string }) => {
      setInputValues({ fiatAmount, cryptoAmount })
    },
    [],
  )

  const cryptoInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateCryptoAmount },
    }),
    [validateCryptoAmount],
  )

  const fiatInputValidation = useMemo(
    () => ({
      required: true,
      validate: { validateFiatAmount },
    }),
    [validateFiatAmount],
  )

  const handleContinueOrAcknowledgement = useCallback(
    (formValues: DepositValues) => {
      setDepositValues(formValues)
      if (thorchainMimirTimes?.runePoolDepositMaturityTime) {
        setShouldShowInfoAcknowledgement(true)
        return
      }

      handleContinue(formValues)
    },
    [thorchainMimirTimes?.runePoolDepositMaturityTime, handleContinue],
  )

  const handleAcknowledge = useCallback(() => {
    if (!depositValues) return
    handleContinue(depositValues)
  }, [depositValues, handleContinue])

  if (!state || !contextDispatch || !opportunityData) return null

  return (
    <>
      <InfoAcknowledgement
        message={translate('defi.liquidityLockupWarning', {
          time: formatSecondsToDuration(thorchainMimirTimes?.runePoolDepositMaturityTime ?? 0),
        })}
        onAcknowledge={handleAcknowledge}
        shouldShowAcknowledgement={shouldShowInfoAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowInfoAcknowledgement}
      />
      <ReusableDeposit
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        asset={asset}
        apy={opportunityData.apy ?? undefined}
        cryptoAmountAvailable={balanceCryptoPrecision.toPrecision()}
        cryptoInputValidation={cryptoInputValidation}
        fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
        fiatInputValidation={fiatInputValidation}
        marketData={assetMarketData}
        onCancel={handleCancel}
        onPercentClick={handlePercentClick}
        onContinue={handleContinueOrAcknowledgement}
        onChange={handleInputChange}
        percentOptions={percentOptions}
        enableSlippage={false}
        isLoading={isEstimatedFeesDataLoading || isThorchainMimirTimesLoading || state.loading}
      />
    </>
  )
}
