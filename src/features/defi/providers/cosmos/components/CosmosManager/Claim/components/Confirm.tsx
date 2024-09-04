import { Button, Link, Skeleton, SkeletonText, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { getFeeData } from 'plugins/cosmos/utils'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import {
  selectAssetById,
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosClaimActionType } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'

type ConfirmProps = StepComponentProps & { accountId?: AccountId | undefined }

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(ClaimContext)
  const opportunity = state?.opportunity

  if (!opportunity) throw new Error('Opportunity not found')

  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const chainAdapterManager = getChainAdapterManager()
  const { state: walletState } = useWallet()
  const translate = useTranslate()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  // Asset Info
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, opportunity?.assetId ?? ''))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, opportunity.assetId ?? ''),
  )
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  const claimAmount = bnOrZero(opportunity?.rewardsCryptoBaseUnit?.amounts[0]).toString()
  const claimFiatAmount = useMemo(
    () => bnOrZero(claimAmount).times(assetMarketData.price).toString(),
    [assetMarketData.price, claimAmount],
  )

  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const toast = useToast()

  const { handleStakingAction } = useStakingAction()

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !dispatch || !asset) return

        const { txFee } = await getFeeData(asset)

        dispatch({
          type: CosmosClaimActionType.SET_CLAIM,
          payload: { estimatedGasCryptoBaseUnit: txFee },
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error(error)
      }
    })()
  }, [
    chainId,
    asset,
    chainAdapterManager,
    contractAddress,
    feeAsset.precision,
    feeMarketData.price,
    walletState.wallet,
    dispatch,
  ])

  const handleConfirm = useCallback(async () => {
    if (!(asset && walletState.wallet && contractAddress && userAddress && dispatch && bip44Params))
      return
    dispatch({ type: CosmosClaimActionType.SET_LOADING, payload: true })

    const { gasLimit, txFee } = await getFeeData(asset)

    try {
      const broadcastTxId = await handleStakingAction({
        asset,
        bip44Params,
        validator: contractAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: txFee,
        },
        value: toBaseUnit(claimAmount, asset.precision),
        action: StakingAction.Claim,
      })
      dispatch({ type: CosmosClaimActionType.SET_TXID, payload: broadcastTxId ?? null })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvent.ClickOpportunity,
        {
          opportunity,
          fiatAmounts: [claimFiatAmount],
          cryptoAmounts: [{ assetId: asset.assetId, amountCryptoHuman: claimAmount }],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: CosmosClaimActionType.SET_LOADING, payload: false })
    }
  }, [
    asset,
    assets,
    bip44Params,
    claimAmount,
    claimFiatAmount,
    contractAddress,
    dispatch,
    handleStakingAction,
    onNext,
    opportunity,
    toast,
    translate,
    userAddress,
    walletState.wallet,
  ])

  const estimatedGasCryptoPrecision = useMemo(() => {
    return bnOrZero(fromBaseUnit(state?.claim.estimatedGasCryptoBaseUnit ?? 0, feeAsset.precision))
  }, [state?.claim.estimatedGasCryptoBaseUnit, feeAsset])

  if (!state || !dispatch || !asset) return null

  return (
    <>
      <Stack alignItems='center' justifyContent='center' py={8}>
        <Text color='text.subtle' translation='defi.modals.claim.claimAmount' />
        <Stack direction='row' alignItems='center' justifyContent='center'>
          <AssetIcon boxSize='10' src={asset.icon} />
          <Amount.Crypto
            fontSize='3xl'
            fontWeight='medium'
            value={bnOrZero(claimAmount).div(`1e+${asset.precision}`).toString()}
            symbol={asset.symbol}
          />
        </Stack>
      </Stack>
      <Stack width='full' spacing={6}>
        <Row>
          <Row.Label>
            <Text translation='defi.modals.claim.claimToAddress' />
          </Row.Label>
          <Row.Value>
            <Skeleton minWidth='100px' isLoaded={!!userAddress && !!accountId}>
              <InlineCopyButton value={userAddress ?? ''}>
                <Link
                  isExternal
                  color='blue.500'
                  href={`${asset.explorerAddressLink}${userAddress}`}
                >
                  {userAddress && <MiddleEllipsis value={accountId ?? userAddress} />}
                </Link>
              </InlineCopyButton>
            </Skeleton>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='common.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <SkeletonText
              noOfLines={2}
              isLoaded={estimatedGasCryptoPrecision.gt(0)}
              fontSize='md'
              display='flex'
              flexDir='column'
              alignItems='flex-end'
            >
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat
                  value={estimatedGasCryptoPrecision.times(feeMarketData.price).toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={estimatedGasCryptoPrecision.toFixed()}
                  symbol={feeAsset.symbol}
                />
              </Stack>
            </SkeletonText>
          </Row.Value>
        </Row>
        <Button
          size='lg-multiline'
          width='full'
          colorScheme='blue'
          onClick={handleConfirm}
          isLoading={state.loading}
        >
          {translate('defi.modals.claim.confirmClaim')}
        </Button>
      </Stack>
    </>
  )
}
