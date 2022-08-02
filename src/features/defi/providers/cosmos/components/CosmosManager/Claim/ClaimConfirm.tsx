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
import { ASSET_REFERENCE, AssetId, ChainId, toAssetId } from '@shapeshiftoss/caip'
import { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { getFormFees } from 'plugins/cosmos/utils'
import { useEffect, useState } from 'react'
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
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ClaimConfirmProps = {
  assetId: AssetId
  amount?: string
  contractAddress: string
  chainId: ChainId
  onBack: () => void
}

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'ClaimConfirm'],
})

export const ClaimConfirm = ({
  assetId,
  amount,
  contractAddress,
  chainId,
  onBack,
}: ClaimConfirmProps) => {
  const [userAddress, setUserAddress] = useState<string>('')
  const [estimatedGas, setEstimatedGas] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapterManager = getChainAdapterManager()
  const { state: walletState } = useWallet()
  const translate = useTranslate()
  const claimAmount = bnOrZero(amount).toString()
  const history = useHistory()

  // Asset Info
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Cosmos, // TODO: Programmatic
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const toast = useToast()

  const { handleStakingAction } = useStakingAction()

  const handleConfirm = async () => {
    if (!walletState.wallet || !contractAddress || !userAddress) return
    setLoading(true)

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
      history.push('/status', {
        txid: broadcastTxId,
        assetId,
        amount,
        userAddress,
        estimatedGas,
        chainId,
      })
    } catch (error) {
      moduleLogger.error(error, { fn: 'handleConfirm' }, 'ClaimWithdraw:handleConfirm error')
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
        if (!walletState.wallet) return

        const { gasLimit, gasPrice } = await getFormFees(asset, feeMarketData.price)

        const chainAdapter = chainAdapterManager.get(chainId) as unknown as
          | cosmossdk.cosmos.ChainAdapter
          | cosmossdk.osmosis.ChainAdapter
        const userAddress = await chainAdapter.getAddress({ wallet: walletState.wallet })
        setUserAddress(userAddress)
        const gasEstimate = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        setEstimatedGas(gasEstimate)
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
                  <MiddleEllipsis address={userAddress} />
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
            <Button size='lg' colorScheme='blue' onClick={handleConfirm} isLoading={loading}>
              {translate('defi.modals.claim.confirmClaim')}
            </Button>
          </Stack>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
