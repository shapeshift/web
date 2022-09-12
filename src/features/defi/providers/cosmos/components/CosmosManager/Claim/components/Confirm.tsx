import { Button, Link, Skeleton, SkeletonText, Stack, useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { getFormFees } from 'plugins/cosmos/utils'
import { useContext, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosClaimActionType } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'Claim', 'Confirm'],
})

export const Confirm = ({ onNext }: StepComponentProps) => {
  const { state, dispatch } = useContext(ClaimContext)
  const opportunity = state?.opportunity
  const { query, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const chainAdapterManager = getChainAdapterManager()
  const { state: walletState } = useWallet()
  const translate = useTranslate()
  const claimAmount = bnOrZero(opportunity?.rewards).toString()

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, opportunity?.assetId ?? ''))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const toast = useToast()

  const { handleStakingAction } = useStakingAction()

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !dispatch || !asset) return

        const { gasLimit, gasPrice } = await getFormFees(asset, feeMarketData.price)
        const estimatedGasCrypto = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        dispatch({ type: CosmosClaimActionType.SET_CLAIM, payload: { estimatedGasCrypto } })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'ClaimConfirm error')
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

  if (!state || !dispatch || !asset) return null

  const handleConfirm = async () => {
    if (!walletState.wallet || !contractAddress || !state?.userAddress || !dispatch) return
    dispatch({ type: CosmosClaimActionType.SET_LOADING, payload: true })

    const { gasLimit, gasPrice } = await getFormFees(asset, feeMarketData.price)

    try {
      const broadcastTxId = await handleStakingAction({
        asset,
        validator: contractAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: bnOrZero(gasPrice).times(`1e+${asset?.precision}`).toString(),
        },
        value: bnOrZero(claimAmount).times(`1e+${asset.precision}`).toString(),
        action: StakingAction.Claim,
      })
      dispatch({ type: CosmosClaimActionType.SET_TXID, payload: broadcastTxId ?? null })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleConfirm' }, 'handleConfirm error')
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: CosmosClaimActionType.SET_LOADING, payload: false })
    }
  }

  const handleBack = history.goBack

  return (
    <>
      <Stack alignItems='center' justifyContent='center' py={8}>
        <Text color='gray.500' translation='defi.modals.claim.claimAmount' />
        <Stack direction='row' alignItems='center' justifyContent='center'>
          <AssetIcon boxSize='10' src={asset.icon} />
          <Amount.Crypto
            fontSize='3xl'
            fontWeight='medium'
            value={bnOrZero(claimAmount).div(`1e+${asset.precision}`).toString()}
            symbol={asset?.symbol}
          />
        </Stack>
      </Stack>
      <Stack width='full' spacing={6}>
        <Row>
          <Row.Label>
            <Text translation='defi.modals.claim.claimToAddress' />
          </Row.Label>
          <Row.Value>
            <Skeleton minWidth='100px' isLoaded={!!state.userAddress}>
              <Link
                isExternal
                color='blue.500'
                href={`${asset?.explorerAddressLink}${state.userAddress}`}
              >
                {state.userAddress && <MiddleEllipsis value={state.userAddress} />}
              </Link>
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
              isLoaded={bnOrZero(state.claim.estimatedGasCrypto).gt(0)}
              fontSize='md'
              display='flex'
              flexDir='column'
              alignItems='flex-end'
            >
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat
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
              </Stack>
            </SkeletonText>
          </Row.Value>
        </Row>
        <Stack direction='row' width='full' justifyContent='space-between'>
          <Button size='lg' onClick={handleBack}>
            {translate('common.cancel')}
          </Button>
          <Button size='lg' colorScheme='blue' onClick={handleConfirm} isLoading={state.loading}>
            {translate('defi.modals.claim.confirmClaim')}
          </Button>
        </Stack>
      </Stack>
    </>
  )
}
