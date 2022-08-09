import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
  DefiStep,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import qs from 'qs'
import { useContext, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { IdleClaimActionType } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'

export const Confirm = ({ onNext }: StepComponentProps) => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(ClaimContext)
  const { idle: idleInvestor } = useIdle()
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
    ;(async () => {
      if (!dispatch || !state.userAddress || !idleInvestor) {
        return
      }

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
    })()
  }, [state.userAddress, dispatch, idleInvestor, assetId])

  let renderAssets: any[] = []
  let claimableTokensTotalBalance = bnOrZero(0)

  useAppSelector(selectorState => {
    if (state && state.claimableTokens) {
      state.claimableTokens.forEach(token => {
        const asset = selectAssetById(selectorState, token.assetId)
        if (asset) {
          claimableTokensTotalBalance = claimableTokensTotalBalance.plus(token.amount)
          renderAssets.push(
            <Stack direction='row' alignItems='center' justifyContent='center' key={token.assetId}>
              <AssetIcon boxSize='8' src={asset.icon} />
              <Amount.Crypto
                fontSize='lg'
                fontWeight='medium'
                value={bnOrZero(token.amount).div(`1e+${asset.precision}`).toString()}
                symbol={asset?.symbol}
              />
            </Stack>,
          )
        }
      })
    }
  })

  if (!state || !dispatch) return null

  const handleConfirm = async () => {
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
      console.error('IdleClaim:handleConfirm error', error)
    } finally {
      dispatch({ type: IdleClaimActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const hasEnoughBalanceForGas =
    state.claim.estimatedGasCrypto &&
    bnOrZero(feeAssetBalance)
      .minus(bnOrZero(state.claim.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
      .gte(0)

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
              {renderAssets}
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
