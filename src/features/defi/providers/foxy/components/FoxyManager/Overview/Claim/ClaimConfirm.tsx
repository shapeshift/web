import {
  Button,
  Link,
  ModalBody,
  ModalFooter,
  Skeleton,
  SkeletonText,
  Stack,
  useToast,
} from '@chakra-ui/react'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ASSET_REFERENCE, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getFoxyApi } from 'state/apis/foxy/foxyApiSingleton'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  serializeUserStakingId,
  supportsUndelegations,
} from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ClaimConfirmProps = {
  accountId: AccountId | undefined
  stakingAssetId: AssetId
  amount?: string
  contractAddress: string
  chainId: ChainId
  onBack: () => void
}

export const ClaimConfirm = ({
  accountId,
  stakingAssetId,
  amount,
  contractAddress,
  chainId,
  onBack,
}: ClaimConfirmProps) => {
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })
  const [userAddress, setUserAddress] = useState<string>('')
  const [estimatedGas, setEstimatedGas] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const foxyApi = getFoxyApi()
  const { state: walletState } = useWallet()
  const translate = useTranslate()
  const claimAmount = bnOrZero(amount).toString()
  const history = useHistory()

  const chainAdapterManager = getChainAdapterManager()

  // Asset Info
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  if (!stakingAsset) throw new Error(`Asset not found for AssetId ${stakingAssetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const toast = useToast()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const cryptoHumanBalance = useMemo(
    () => bnOrZero(claimAmount).div(`1e+${stakingAsset.precision}`),
    [stakingAsset.precision, claimAmount],
  )
  // The highest level AssetId/OpportunityId, in this case of the single FOXy contract
  const assetId = toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference: contractAddress,
  })
  const opportunityDataFilter = useMemo(() => {
    if (!accountId) return undefined
    return {
      userStakingId: serializeUserStakingId(accountId, assetId as StakingId),
    }
  }, [accountId, assetId])

  const foxyEarnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const undelegations = useMemo(
    () =>
      foxyEarnOpportunityData && supportsUndelegations(foxyEarnOpportunityData)
        ? foxyEarnOpportunityData.undelegations
        : undefined,
    [foxyEarnOpportunityData],
  )

  const hasPendingUndelegation = Boolean(
    undelegations &&
      undelegations.some(undelegation =>
        dayjs().isAfter(dayjs(undelegation.completionTime).unix()),
      ),
  )

  const handleConfirm = useCallback(async () => {
    if (!(walletState.wallet && contractAddress && userAddress && foxyApi && bip44Params)) return
    setLoading(true)
    try {
      if (!supportsETH(walletState.wallet))
        throw new Error(`handleConfirm: wallet does not support ethereum`)
      const txid = await foxyApi.claimWithdraw({
        claimAddress: userAddress,
        userAddress,
        wallet: walletState.wallet,
        contractAddress,
        bip44Params,
        checkLedgerAppOpenIfLedgerConnected,
      })
      history.push('/status', {
        txid,
        assetId: stakingAssetId,
        amount,
        userAddress,
        estimatedGas,
        chainId,
      })
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
    walletState.wallet,
    contractAddress,
    userAddress,
    foxyApi,
    bip44Params,
    checkLedgerAppOpenIfLedgerConnected,
    history,
    stakingAssetId,
    amount,
    estimatedGas,
    chainId,
    toast,
    translate,
  ])

  useEffect(() => {
    if (!bip44Params) return
    ;(async () => {
      try {
        const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
        if (!(walletState.wallet && contractAddress && foxyApi && chainAdapter && accountId)) return
        if (!supportsETH(walletState.wallet))
          throw new Error(`ClaimConfirm::useEffect: wallet does not support ethereum`)

        const { accountNumber } = bip44Params
        const userAddress = await chainAdapter.getAddress({
          wallet: walletState.wallet,
          accountNumber,
          // Unsafe useEffect IIAFE, we skip on-device derivation here to avoid unpredictable ledger ack popping up
          pubKey: fromAccountId(accountId).account,
        })
        setUserAddress(userAddress)
        const feeDataEstimate = await foxyApi.estimateClaimWithdrawFees({
          claimAddress: userAddress,
          userAddress,
          contractAddress,
          wallet: walletState.wallet,
          bip44Params,
          checkLedgerAppOpenIfLedgerConnected,
        })

        const {
          chainSpecific: { gasPrice, gasLimit },
        } = feeDataEstimate.fast

        const gasEstimate = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        setEstimatedGas(gasEstimate)
      } catch (error) {
        // TODO: handle client side errors
        console.error(error)
      }
    })()
  }, [
    accountId,
    bip44Params,
    chainAdapterManager,
    checkLedgerAppOpenIfLedgerConnected,
    contractAddress,
    feeAsset.precision,
    feeMarketData.price,
    foxyApi,
    walletState.wallet,
  ])

  return (
    <SlideTransition>
      <ModalBody>
        <Stack alignItems='center' justifyContent='center' py={8}>
          <Text color='text.subtle' translation='defi.modals.claim.claimAmount' />
          <Stack direction='row' alignItems='center' justifyContent='center'>
            <AssetIcon boxSize='10' src={stakingAsset.icon} />
            <Amount.Crypto
              fontSize='3xl'
              fontWeight='medium'
              value={cryptoHumanBalance.toString()}
              symbol={stakingAsset?.symbol}
            />
          </Stack>
          <Amount.Fiat
            value={cryptoHumanBalance.times(assetMarketData.price).toString()}
            color='text.subtle'
            prefix='≈'
          />
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column'>
        <Stack width='full' spacing={6}>
          <Row>
            <Row.Label>
              <Text translation='defi.modals.claim.claimToAddress' />
            </Row.Label>
            <Row.Value>
              <Skeleton minWidth='100px' isLoaded={!!userAddress}>
                <Link
                  isExternal
                  color='blue.500'
                  href={`${stakingAsset?.explorerAddressLink}${userAddress}`}
                >
                  <MiddleEllipsis value={userAddress} />
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
                isLoaded={!!bnOrZero(estimatedGas).gt(0)}
                fontSize='md'
                display='flex'
                flexDir='column'
                alignItems='flex-end'
              >
                <Stack textAlign='right' spacing={0}>
                  <Amount.Fiat
                    value={bnOrZero(estimatedGas)
                      .div(`1e+${feeAsset.precision}`)
                      .times(feeMarketData.price)
                      .toFixed(2)}
                  />
                  <Amount.Crypto
                    color='text.subtle'
                    value={bnOrZero(estimatedGas).div(`1e+${feeAsset.precision}`).toFixed(5)}
                    symbol={feeAsset.symbol}
                  />
                </Stack>
              </SkeletonText>
            </Row.Value>
          </Row>
          <Stack direction='row' width='full' justifyContent='space-between'>
            <Button size='lg' onClick={onBack}>
              {translate('common.cancel')}
            </Button>
            <Button
              size='lg-multiline'
              colorScheme='blue'
              isDisabled={!hasPendingUndelegation}
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
