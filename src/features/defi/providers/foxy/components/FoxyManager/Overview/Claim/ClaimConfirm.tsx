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
import type { AccountId, AssetId, ChainId } from '@keepkey/caip'
import { ASSET_REFERENCE, toAssetId } from '@keepkey/caip'
import { KnownChainIds } from '@keepkey/types'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
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
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

type ClaimConfirmProps = {
  accountId: Nullable<AccountId>
  assetId: AssetId
  amount?: string
  contractAddress: string
  chainId: ChainId
  onBack: () => void
}

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Foxy', 'Overview', 'ClaimConfirm'],
})

export const ClaimConfirm = ({
  accountId,
  assetId,
  amount,
  contractAddress,
  chainId,
  onBack,
}: ClaimConfirmProps) => {
  const [userAddress, setUserAddress] = useState<string>('')
  const [estimatedGas, setEstimatedGas] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const [canClaim, setCanClaim] = useState<boolean>(false)
  const { foxy } = useFoxy()
  const { state: walletState } = useWallet()
  const translate = useTranslate()
  const claimAmount = bnOrZero(amount).toString()
  const history = useHistory()

  const chainAdapterManager = getChainAdapterManager()

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const toast = useToast()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleConfirm = useCallback(async () => {
    if (!(walletState.wallet && contractAddress && userAddress && foxy && bip44Params)) return
    setLoading(true)
    try {
      const txid = await foxy.claimWithdraw({
        claimAddress: userAddress,
        userAddress,
        wallet: walletState.wallet,
        contractAddress,
        bip44Params,
      })
      history.push('/status', {
        txid,
        assetId,
        amount,
        userAddress,
        estimatedGas,
        chainId,
      })
    } catch (error) {
      moduleLogger.error(error, 'ClaimWithdraw error')
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
    amount,
    assetId,
    bip44Params,
    chainId,
    contractAddress,
    estimatedGas,
    foxy,
    history,
    toast,
    translate,
    userAddress,
    walletState?.wallet,
  ])

  useEffect(() => {
    if (!bip44Params) return
    ;(async () => {
      try {
        const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
        if (!(walletState.wallet && contractAddress && foxy && chainAdapter)) return
        const userAddress = await chainAdapter.getAddress({
          wallet: walletState.wallet,
          bip44Params,
        })
        setUserAddress(userAddress)
        const [gasLimit, gasPrice, canClaimWithdraw] = await Promise.all([
          foxy.estimateClaimWithdrawGas({
            claimAddress: userAddress,
            userAddress,
            contractAddress,
            wallet: walletState.wallet,
            bip44Params,
          }),
          foxy.getGasPrice(),
          foxy.canClaimWithdraw({ contractAddress, userAddress }),
        ])

        setCanClaim(canClaimWithdraw)
        const gasEstimate = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        setEstimatedGas(gasEstimate)
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxyClaim error')
      }
    })()
  }, [
    bip44Params,
    chainAdapterManager,
    contractAddress,
    feeAsset.precision,
    feeMarketData.price,
    foxy,
    walletState.wallet,
  ])

  return (
    <SlideTransition>
      <ModalBody>
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
                  href={`${asset?.explorerAddressLink}${userAddress}`}
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
                    color='gray.500'
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
              size='lg'
              colorScheme='blue'
              isDisabled={!canClaim}
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
