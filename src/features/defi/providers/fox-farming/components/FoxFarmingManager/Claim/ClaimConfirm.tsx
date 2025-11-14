import {
  Alert,
  AlertIcon,
  Button,
  Link,
  ModalBody,
  ModalFooter,
  Skeleton,
  SkeletonText,
  Stack,
  useToast,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useFoxEth } from '@/context/FoxEthProvider/FoxEthProvider'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from '@/features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { assertIsFoxEthStakingContractAddress } from '@/state/slices/opportunitiesSlice/constants'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  accountId: AccountId | undefined
  assetId: AssetId
  amount: string
  onBack: () => void
}

export const ClaimConfirm = ({ accountId, assetId, amount, onBack }: ClaimConfirmProps) => {
  const [estimatedGas, setEstimatedGas] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const [canClaim, setCanClaim] = useState<boolean>(false)
  const wallet = useWallet().state.wallet
  const appDispatch = useAppDispatch()

  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const assets = useAppSelector(selectAssets)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const navigate = useNavigate()
  const { chainId, contractAddress } = query

  assertIsFoxEthStakingContractAddress(contractAddress)

  const { claimRewards, getClaimFees, foxFarmingContract } = useFoxFarming(contractAddress)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { onOngoingFarmingTxIdChange } = useFoxEth()

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  // Get Opportunity
  const opportunity = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, {
      userStakingId: serializeUserStakingId(
        accountId ?? '',
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
  )

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Cannot get fee AssetId not found for ChainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  const claimFiatAmount = useMemo(
    () =>
      bnOrZero(amount)
        .times(bnOrZero(assetMarketData?.price))
        .toString(),
    [amount, assetMarketData?.price],
  )

  const toast = useToast()

  const handleConfirm = useCallback(async () => {
    if (!wallet || !contractAddress || !accountAddress || !opportunity || !asset || !accountId) {
      return
    }

    setLoading(true)
    try {
      const txid = await claimRewards()
      if (!txid) throw new Error(`Transaction failed`)

      const now = Date.now()
      appDispatch(
        actionSlice.actions.upsertAction({
          id: txid,
          createdAt: now,
          updatedAt: now,
          type: ActionType.Claim,
          status: ActionStatus.Pending,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.FoxFarm,
            message: 'actionCenter.claim.pending',
            amountCryptoPrecision: bnOrZero(amount).decimalPlaces(6).toString(),
            assetId: asset.assetId,
            chainId: asset.chainId,
            accountId,
            txHash: txid,
          },
        }),
      )

      toast({
        id: txid,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        position: 'bottom-right',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txid}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      onOngoingFarmingTxIdChange(txid, contractAddress)

      trackOpportunityEvent(
        MixPanelEvent.ClaimConfirm,
        {
          opportunity,
          fiatAmounts: [claimFiatAmount],
          cryptoAmounts: [{ assetId: asset.assetId, amountCryptoHuman: amount }],
        },
        assets,
      )

      navigate(-1)
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [
    accountAddress,
    accountId,
    amount,
    appDispatch,
    asset,
    assets,
    claimFiatAmount,
    claimRewards,
    contractAddress,
    isDrawerOpen,
    navigate,
    onOngoingFarmingTxIdChange,
    openActionCenter,
    opportunity,
    toast,
    translate,
    wallet,
  ])

  useEffect(() => {
    ;(async () => {
      try {
        if (!(wallet && feeMarketData && accountAddress)) return

        const fees = await getClaimFees(accountAddress)
        if (!fees) throw new Error('failed to get claim fees')

        const estimatedGasCrypto = fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision)

        setCanClaim(true)
        setEstimatedGas(estimatedGasCrypto)
      } catch (error) {
        // TODO: handle client side errors
        console.error(error)
      }
    })()
  }, [
    accountAddress,
    feeAsset.precision,
    feeMarketData,
    feeMarketData?.price,
    getClaimFees,
    wallet,
    foxFarmingContract,
  ])

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset.assetId],
  )

  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const hasEnoughBalanceForGas = useMemo(
    () => bnOrZero(feeAssetBalance).minus(bnOrZero(estimatedGas)).gte(0),
    [feeAssetBalance, estimatedGas],
  )

  useEffect(() => {
    if (mixpanel && !hasEnoughBalanceForGas) {
      mixpanel.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const notEnoughGasTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [feeAsset.symbol],
  )

  if (!asset) return null

  return (
    <SlideTransition>
      <ModalBody>
        <Stack alignItems='center' justifyContent='center' py={8}>
          <Text color='text.subtle' translation='defi.modals.claim.claimAmount' />
          <Stack direction='row' alignItems='center' justifyContent='center'>
            <AssetIcon boxSize='10' src={asset.icon} />
            <Skeleton minWidth='100px' isLoaded={!!amount}>
              <Amount.Crypto
                fontSize='3xl'
                fontWeight='medium'
                value={amount}
                symbol={asset?.symbol}
              />
            </Skeleton>
          </Stack>
          <Skeleton minWidth='100px' isLoaded={!!amount} textAlign='center'>
            <Amount.Fiat value={claimFiatAmount} color='text.subtle' prefix='≈' />
          </Skeleton>
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column'>
        <Stack width='full' spacing={6}>
          <Row>
            <Row.Label>
              <Text translation='defi.modals.claim.claimToAddress' />
            </Row.Label>
            <Row.Value>
              <Skeleton minWidth='100px' isLoaded={!!accountAddress}>
                <InlineCopyButton value={accountAddress ?? ''}>
                  <Link
                    isExternal
                    color='blue.500'
                    href={`${asset?.explorerAddressLink}${accountAddress}`}
                  >
                    <MiddleEllipsis value={accountAddress ?? ''} />
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
                isLoaded={!!bnOrZero(estimatedGas).gt(0)}
                fontSize='md'
                display='flex'
                flexDir='column'
                alignItems='flex-end'
              >
                <Stack textAlign='right' spacing={0}>
                  <Amount.Fiat
                    value={bnOrZero(estimatedGas)
                      .times(bnOrZero(feeMarketData?.price))
                      .toFixed(2)}
                  />
                  <Amount.Crypto
                    color='text.subtle'
                    value={bnOrZero(estimatedGas).toFixed(5)}
                    symbol={feeAsset.symbol}
                  />
                </Stack>
              </SkeletonText>
            </Row.Value>
          </Row>
          {!hasEnoughBalanceForGas && (
            <Alert status='error' borderRadius='lg'>
              <AlertIcon />
              <Text translation={notEnoughGasTranslation} />
            </Alert>
          )}
          <Stack direction='row' width='full' justifyContent='space-between'>
            <Button size='lg' onClick={onBack}>
              {translate('common.cancel')}
            </Button>
            <Button
              size='lg-multiline'
              colorScheme='blue'
              isDisabled={!canClaim || !hasEnoughBalanceForGas}
              onClick={handleConfirm}
              isLoading={loading}
            >
              {translate('defi.modals.claim.confirmClaim')}
            </Button>
          </Stack>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
