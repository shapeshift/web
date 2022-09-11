import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import qs from 'qs'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleClaimActionType } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'
import { ClaimableAsset } from './ClaimableAsset'

const moduleLogger = logger.child({ namespace: ['IdleClaim:Confirm'] })

export const Confirm = ({ onNext }: StepComponentProps) => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(ClaimContext)
  const { idleInvestor } = useIdle()
  const opportunity = state?.opportunity
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: feeAsset?.assetId ?? '' }),
  )

  useEffect(() => {
    if (!dispatch || !idleInvestor) return
    ;(async () => {
      try {
        if (!state.userAddress) return

        dispatch({ type: IdleClaimActionType.SET_LOADING, payload: true })

        const idleOpportunity = await idleInvestor.findByOpportunityId(assetId)
        if (!idleOpportunity) throw new Error('No opportunity')

        const preparedTx = await idleOpportunity.prepareClaimTokens(state.userAddress)
        const estimatedGasCrypto = bnOrZero(preparedTx.gasPrice)
          .times(preparedTx.estimatedGas)
          .integerValue()
          .toString()

        dispatch({ type: IdleClaimActionType.SET_LOADING, payload: false })
        dispatch({ type: IdleClaimActionType.SET_CLAIM, payload: { estimatedGasCrypto } })
      } catch (error) {
        moduleLogger.error({ fn: 'handleClaim', error }, 'Error getting opportunity')
      }
    })()
  }, [state.userAddress, dispatch, idleInvestor, assetId])

  const claimableTokensTotalBalance = useMemo(() => {
    if (!state.claimableTokens) return bnOrZero(0)
    return state.claimableTokens.reduce((total, token) => {
      total = total.plus(token.amount)
      return total
    }, bnOrZero(0))
  }, [state.claimableTokens])

  const claimableAssetsToRender = useMemo(() => {
    if (!state.claimableTokens) return null
    return state.claimableTokens.map(token => <ClaimableAsset key={token.assetId} token={token} />)
  }, [state.claimableTokens])

  const handleCancel = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location, query])

  const hasEnoughBalanceForGas = useMemo(() => {
    return (
      state.claim.estimatedGasCrypto &&
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state.claim.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0)
    )
  }, [state.claim, feeAssetBalance, feeAsset])

  const handleConfirm = useCallback(async () => {
    if (!dispatch) return
    try {
      if (
        !(
          state.userAddress &&
          assetReference &&
          walletState.wallet &&
          supportsETH(walletState.wallet) &&
          opportunity
        )
      )
        return
      dispatch({ type: IdleClaimActionType.SET_LOADING, payload: true })
      const idleOpportunity = await idleInvestor?.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!idleOpportunity) throw new Error('No opportunity')
      const tx = await idleOpportunity.prepareClaimTokens(state.userAddress)
      const txid = await idleOpportunity.signAndBroadcast({
        wallet: walletState.wallet,
        tx,
        // TODO: allow user to choose fee priority
        feePriority: undefined,
      })
      dispatch({ type: IdleClaimActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.error(error, 'IdleClaim:Confirm:handleConfirm error')
    } finally {
      dispatch({ type: IdleClaimActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    state.userAddress,
    state.opportunity,
    idleInvestor,
    assetReference,
    walletState.wallet,
    opportunity,
    onNext,
  ])

  if (!state || !dispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.claim.header'
      isDisabled={!hasEnoughBalanceForGas || claimableTokensTotalBalance.lte(0)}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToClaim' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack
              width='100%'
              direction='column'
              alignItems='flex-start'
              justifyContent='center'
              as='form'
            >
              {claimableAssetsToRender}
            </Stack>
          </Row>
        </Row>
        <Row p={4}>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.claim.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.claim.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
