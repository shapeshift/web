import {
  Button,
  Link,
  FormControl,
  ModalBody,
  ModalFooter,
  Skeleton,
  SkeletonText,
  Stack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { ASSET_REFERENCE, AssetId, ChainId, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { ClaimableToken } from '@shapeshiftoss/investor-idle'

type ClaimConfirmProps = {
  assetId: AssetId
  claimableTokens: ClaimableToken[]
  contractAddress: string
  chainId: ChainId
  onBack: () => void
}

export const ClaimConfirm = ({
  assetId,
  claimableTokens,
  contractAddress,
  chainId,
  onBack
}: ClaimConfirmProps) => {
  const [userAddress, setUserAddress] = useState<string>('')
  const [estimatedGas, setEstimatedGas] = useState<string>('0')
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapterManager = useChainAdapters()
  const { idle: idleInvestor } = useIdle()
  const { state: walletState } = useWallet()
  const translate = useTranslate()
  const amount = 0 // Replace with total amount of claimable rewards
  const claimAmount = bnOrZero(amount).toString()
  const history = useHistory()

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
    if (!walletState.wallet || !contractAddress || !userAddress || !idleInvestor) return
    setLoading(true)
    try {
      const txid = await idleInvestor.claimWithdraw({
        claimAddress: userAddress,
        userAddress,
        wallet: walletState.wallet,
        contractAddress,
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
      console.error('ClaimWithdraw:handleConfirm error', error)
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
        const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
        if (!(walletState.wallet && contractAddress && idleInvestor && chainAdapter)) return
        const userAddress = await chainAdapter.getAddress({ wallet: walletState.wallet })
        setUserAddress(userAddress)

        // const [gasLimit, gasPrice] = await Promise.all([
        //   idleInvestor.estimateClaimWithdrawGas({
        //     claimAddress: userAddress,
        //     userAddress,
        //     contractAddress,
        //     wallet: walletState.wallet,
        //   }),
        //   idleInvestor.getGasPrice(),
        // ])
        // const gasEstimate = bnOrZero(gasPrice).times(gasLimit).toFixed(0)
        // setEstimatedGas(gasEstimate)
      } catch (error) {
        // TODO: handle client side errors
        console.error('FoxyClaim error:', error)
      }
    })()
  }, [
    chainAdapterManager,
    contractAddress,
    feeAsset.precision,
    feeMarketData.price,
    idleInvestor,
    walletState.wallet,
  ])

  let renderAssets = []
  useAppSelector( state => {
    claimableTokens.forEach( token => {
      const asset = selectAssetById(state, token.assetId)
      if (asset) {
        renderAssets.push((
          <Stack direction='row' alignItems='center' justifyContent='center' key={token.assetId}>
            <AssetIcon boxSize='8' src={asset.icon} />
            <Amount.Crypto
              fontSize='lg'
              fontWeight='medium'
              value={bnOrZero(token.amount).div(`1e+${asset.precision}`).toString()}
              symbol={asset?.symbol}
            />
          </Stack>
        ))
      }
    })
  })

  const bgColor = useColorModeValue('white', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  return (
    <SlideTransition>
      <ModalBody>
        <Stack alignItems='flex-start' justifyContent='center'>
          <FormControl
            borderWidth={1}
            borderColor={borderColor}
            bg={bgColor}
            borderRadius='xl'
            _hover={{ bg: bgColor }}
            py={2}
          >
            <Stack width='100%' direction='column' alignItems='flex-start' justifyContent='center' as='form'>
              {renderAssets}
            </Stack>
          </FormControl>
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
