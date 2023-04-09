import { Flex, Text, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS } from 'contracts/constants'
import { ethers } from 'ethers'
import { Approve as ReusableApprove } from 'features/defi/components/Approve/Approve'
import { ApprovePreFooter } from 'features/defi/components/Approve/ApprovePreFooter'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  DefiAction,
  DefiProviderMetadata,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import { useUniV2LiquidityPool } from 'features/defi/providers/univ2/hooks/useUniV2LiquidityPool'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { poll } from 'lib/poll/poll'
import { isSome } from 'lib/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { UniV2DepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type UniV2ApproveProps = StepComponentProps & {
  accountId: AccountId | undefined
  onNext: (arg: DefiStep) => void
}

const moduleLogger = logger.child({ namespace: ['UniV2Deposit:Approve'] })

export const Approve: React.FC<UniV2ApproveProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const approve0 = state?.approve0
  const approve1 = state?.approve1
  const [approve0Loading, setApprove0Loading] = useState<boolean>(false)
  const [approve1Loading, setApprove1Loading] = useState<boolean>(false)

  const isApprove0Needed = useMemo(
    () => Boolean(state?.approve0?.estimatedGasCryptoPrecision),
    [state?.approve0?.estimatedGasCryptoPrecision],
  )
  const isApprove1Needed = useMemo(
    () => Boolean(state?.approve1?.estimatedGasCryptoPrecision),
    [state?.approve1?.estimatedGasCryptoPrecision],
  )

  // Initially set to false if no approval is needed
  const [isAsset0AllowanceGranted, setIsAsset0AllowanceGranted] = useState<boolean>(false)
  const [isAsset1AllowanceGranted, setIsAsset1AllowanceGranted] = useState<boolean>(false)

  useEffect(() => {
    if (isApprove0Needed) setIsAsset0AllowanceGranted(false)
    if (isApprove1Needed) setIsAsset1AllowanceGranted(false)
  }, [isApprove0Needed, isApprove1Needed])

  const estimatedGasCryptoPrecision =
    approve0?.estimatedGasCryptoPrecision ?? approve1?.estimatedGasCryptoPrecision
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const lpAssetId = toAssetId({ chainId, assetNamespace, assetReference })

  const lpOpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const lpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, lpOpportunityFilter),
  )

  const assetId0 = lpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = lpOpportunity?.underlyingAssetIds[1] ?? ''

  const asset0ContractAddress = useMemo(() => {
    return ethers.utils.getAddress(fromAssetId(assetId0).assetReference)
  }, [assetId0])
  const asset1ContractAddress = useMemo(() => {
    return ethers.utils.getAddress(fromAssetId(assetId1).assetReference)
  }, [assetId1])
  const contractAddresses = useMemo(
    () => [asset0ContractAddress, asset1ContractAddress],
    [asset0ContractAddress, asset1ContractAddress],
  )
  const neededApprovals = [isApprove0Needed, isApprove1Needed].filter(Boolean).length
  const { approveAsset, asset0Allowance, asset1Allowance, getDepositGasDataCryptoBaseUnit } =
    useUniV2LiquidityPool({
      accountId: accountId ?? '',
      lpAssetId,
      assetId0,
      assetId1,
    })

  const assets = useAppSelector(selectAssets)
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const feeAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  if (!asset0) throw new Error('Missing asset 0')
  if (!asset1) throw new Error('Missing asset 1')
  if (!feeAsset) throw new Error('Missing fee asset')

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, ethAssetId))

  // user info
  const {
    state: { wallet },
  } = useWallet()

  // notify
  const toast = useToast()

  const handleApprove = useCallback(
    async (contractAddress: string) => {
      if (!dispatch || !state?.deposit || !lpOpportunity || !wallet || !supportsETH(wallet)) return
      contractAddress === asset0ContractAddress
        ? setApprove0Loading(true)
        : setApprove1Loading(true)
      try {
        await approveAsset(contractAddress)
        await poll({
          fn: () =>
            contractAddress === asset0ContractAddress ? asset0Allowance() : asset1Allowance(),
          validate: (result: string) => {
            const allowance = bnOrZero(result).div(
              bn(10).pow(
                contractAddress === asset0ContractAddress ? asset0.precision : asset1.precision,
              ),
            )
            return bnOrZero(allowance).gte(
              bnOrZero(
                contractAddress === asset0ContractAddress
                  ? state.deposit.asset0CryptoAmount
                  : state.deposit.asset1CryptoAmount,
              ),
            )
          },
          interval: 15000,
          maxAttempts: 30,
        })

        contractAddress === asset0ContractAddress
          ? setIsAsset0AllowanceGranted(true)
          : setIsAsset1AllowanceGranted(true)
      } catch (error) {
        moduleLogger.error({ fn: 'handleApprove', error }, 'Error getting approval gas estimate')
        toast({
          position: 'top-right',
          description: translate('common.transactionFailedBody'),
          title: translate('common.transactionFailed'),
          status: 'error',
        })
      } finally {
        contractAddress === asset0ContractAddress
          ? setApprove0Loading(false)
          : setApprove1Loading(false)
        dispatch({ type: UniV2DepositActionType.SET_LOADING, payload: false })
      }
    },
    [
      dispatch,
      state?.deposit,
      lpOpportunity,
      wallet,
      asset0ContractAddress,
      approveAsset,
      asset0Allowance,
      asset1Allowance,
      asset0.precision,
      asset1.precision,
      toast,
      translate,
    ],
  )

  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(estimatedGasCryptoPrecision) &&
      isSome(accountId) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [estimatedGasCryptoPrecision, accountId, feeAsset],
  )

  const preFooter = useMemo(
    () => (
      <ApprovePreFooter
        accountId={accountId}
        action={DefiAction.Deposit}
        feeAsset={feeAsset}
        estimatedGasCryptoPrecision={estimatedGasCryptoPrecision}
      />
    ),
    [accountId, feeAsset, estimatedGasCryptoPrecision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  // After both are approved, estimate gas and move to the confirm step
  useEffect(() => {
    ;(async () => {
      if (!(state && dispatch && lpOpportunity)) return
      if (!(isApprove0Needed || isApprove1Needed)) return
      if (isAsset0AllowanceGranted && isAsset1AllowanceGranted) {
        // Get deposit gas estimate
        const gasData = await getDepositGasDataCryptoBaseUnit({
          token0Amount: state.deposit.asset0CryptoAmount,
          token1Amount: state.deposit.asset1CryptoAmount,
        })
        if (!gasData) return
        const estimatedGasCryptoPrecision = bnOrZero(gasData.average.txFee)
          .div(bn(10).pow(feeAsset.precision))
          .toPrecision()
        dispatch({
          type: UniV2DepositActionType.SET_DEPOSIT,
          payload: { estimatedGasCryptoPrecision },
        })

        trackOpportunityEvent(
          MixPanelEvents.DepositApprove,
          {
            opportunity: lpOpportunity,
            fiatAmounts: [state.deposit.asset0FiatAmount, state.deposit.asset1FiatAmount],
            cryptoAmounts: [
              { assetId: assetId0, amountCryptoHuman: state.deposit.asset0CryptoAmount },
              { assetId: assetId1, amountCryptoHuman: state.deposit.asset1CryptoAmount },
            ],
          },
          assets,
        )

        // Set empty approve 0 and 1 gas estimation fields
        // This is to prevent this effect from running again and re-routing to confirm step
        // This is because of the way routing works in DeFi modals, components for **all** steps always render (possibly returning null)
        // no matter the current step
        dispatch({
          type: UniV2DepositActionType.SET_APPROVE_0,
          payload: {},
        })
        dispatch({
          type: UniV2DepositActionType.SET_APPROVE_1,
          payload: {},
        })

        onNext(DefiStep.Confirm)
      }
    })()
  }, [
    assetId0,
    assetId1,
    assets,
    dispatch,
    feeAsset.precision,
    getDepositGasDataCryptoBaseUnit,
    isApprove0Needed,
    isApprove1Needed,
    isAsset0AllowanceGranted,
    isAsset1AllowanceGranted,
    lpOpportunity,
    onNext,
    state,
  ])

  const approvalElements = useMemo(
    () => [
      ...(!isAsset0AllowanceGranted
        ? [
            <>
              <Text>{`${
                contractAddresses.indexOf(asset0ContractAddress) + 1
              } out of ${neededApprovals}`}</Text>
              <ReusableApprove
                key={'approve0'}
                asset={asset0}
                spenderName={lpOpportunity!.provider}
                feeAsset={feeAsset}
                estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
                disabled={!hasEnoughBalanceForGas}
                fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
                  .times(feeMarketData.price)
                  .toFixed(2)}
                isApproved={isAsset0AllowanceGranted}
                loading={approve0Loading}
                loadingText={translate('common.approve')}
                preFooter={preFooter}
                providerIcon={DefiProviderMetadata[lpOpportunity!.provider].icon}
                learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
                onCancel={() => onNext(DefiStep.Info)}
                onConfirm={() => handleApprove(asset0ContractAddress ?? '')}
                spenderContractAddress={UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS!}
              />
            </>,
          ]
        : []),
      ...(!isAsset1AllowanceGranted
        ? [
            <>
              <Text>{`${
                contractAddresses.indexOf(asset1ContractAddress) + 1
              } out of ${neededApprovals}`}</Text>
              <ReusableApprove
                key={'approve1'}
                asset={asset1}
                spenderName={lpOpportunity!.provider}
                feeAsset={feeAsset}
                estimatedGasFeeCryptoPrecision={bnOrZero(estimatedGasCryptoPrecision).toFixed(5)}
                disabled={!hasEnoughBalanceForGas}
                fiatEstimatedGasFee={bnOrZero(estimatedGasCryptoPrecision)
                  .times(feeMarketData.price)
                  .toFixed(2)}
                isApproved={isAsset1AllowanceGranted}
                loading={approve1Loading}
                loadingText={translate('common.approve')}
                preFooter={preFooter}
                providerIcon={DefiProviderMetadata[lpOpportunity!.provider].icon}
                learnMoreLink='https://shapeshift.zendesk.com/hc/en-us/articles/360018501700'
                onCancel={() => onNext(DefiStep.Info)}
                onConfirm={() => handleApprove(asset1ContractAddress ?? '')}
                spenderContractAddress={UNISWAP_V2_ROUTER_02_CONTRACT_ADDRESS}
              />
            </>,
          ]
        : []),
    ],
    [
      isAsset0AllowanceGranted,
      contractAddresses,
      asset0ContractAddress,
      neededApprovals,
      asset0,
      lpOpportunity,
      feeAsset,
      estimatedGasCryptoPrecision,
      hasEnoughBalanceForGas,
      feeMarketData.price,
      approve0Loading,
      translate,
      preFooter,
      isAsset1AllowanceGranted,
      asset1ContractAddress,
      asset1,
      approve1Loading,
      onNext,
      handleApprove,
    ],
  )

  if (!state || !dispatch) return null
  if (!(isApprove0Needed || isApprove1Needed)) return null
  if (!lpOpportunity) return null

  // We only show one approval at a time, and the array's head is going away as approval goes
  // This effectively peeks the next approval, until it exhausts all approvals needed and we route to the next DefiStep in the useEffect() above
  return <Flex flexDirection='column'>{approvalElements[0]}</Flex>
}
