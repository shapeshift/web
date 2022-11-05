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
import { ASSET_REFERENCE, fromAccountId, toAssetId } from '@keepkey/caip'
import { useFoxFarming } from 'features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

type ClaimConfirmProps = {
  accountId: Nullable<AccountId>
  assetId: AssetId
  amount: string
  contractAddress: string
  chainId: ChainId
  onBack: () => void
}

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'FoxFarming', 'Overview', 'ClaimConfirm'],
})

export const ClaimConfirm = ({
  accountId,
  assetId,
  amount,
  contractAddress,
  chainId,
  onBack,
}: ClaimConfirmProps) => {
  const [estimatedGas, setEstimatedGas] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const [canClaim, setCanClaim] = useState<boolean>(false)
  const { state: walletState } = useWallet()
  const { claimRewards, getClaimGasData, foxFarmingContract } = useFoxFarming(contractAddress)
  const translate = useTranslate()
  const history = useHistory()
  const { onOngoingTxIdChange } = useFoxEth()

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

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

  const handleConfirm = async () => {
    if (!walletState.wallet || !contractAddress || !accountAddress) return
    setLoading(true)
    try {
      const txid = await claimRewards()
      if (!txid) throw new Error(`Transaction failed`)
      onOngoingTxIdChange(txid)
      history.push('/status', {
        txid,
        assetId,
        amount,
        userAddress: accountAddress,
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
  }

  useEffect(() => {
    ;(async () => {
      try {
        if (
          !(walletState.wallet && feeAsset && feeMarketData && foxFarmingContract && accountAddress)
        )
          return
        const gasEstimate = await getClaimGasData(accountAddress)
        if (!gasEstimate) throw new Error('Gas estimation failed')
        const estimatedGasCrypto = bnOrZero(gasEstimate.average.txFee)
          .div(`1e${feeAsset.precision}`)
          .toPrecision()
        setCanClaim(true)
        setEstimatedGas(estimatedGasCrypto)
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxFarmingClaim error')
      }
    })()
  }, [
    accountAddress,
    feeAsset,
    feeAsset.precision,
    feeMarketData,
    feeMarketData.price,
    getClaimGasData,
    walletState.wallet,
    foxFarmingContract,
  ])

  return (
    <SlideTransition>
      <ModalBody>
        <Stack alignItems='center' justifyContent='center' py={8}>
          <Text color='gray.500' translation='defi.modals.claim.claimAmount' />
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
                <Link
                  isExternal
                  color='blue.500'
                  href={`${asset?.explorerAddressLink}${accountAddress}`}
                >
                  <MiddleEllipsis value={accountAddress ?? ''} />
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
                    value={bnOrZero(estimatedGas).times(feeMarketData.price).toFixed(2)}
                  />
                  <Amount.Crypto
                    color='gray.500'
                    value={bnOrZero(estimatedGas).toFixed(5)}
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
