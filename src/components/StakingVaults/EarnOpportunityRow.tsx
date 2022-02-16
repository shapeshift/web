import { Box, HStack } from '@chakra-ui/layout'
import {
  Popover,
  PopoverTrigger,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Td,
  Tr,
  useMediaQuery
} from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { caip19 } from '@shapeshiftoss/caip'
import { SupportedYearnVault, YearnVault } from '@shapeshiftoss/investor-yearn'
import { ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { USDC_PRECISION } from 'constants/UsdcPrecision'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { debounce } from 'lodash'
import qs from 'qs'
import { useEffect, useState } from 'react'
import { FaInfoCircle, FaQuestionCircle } from 'react-icons/fa'
import { useHistory, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetTeaser } from './AssetTeaser'

export const EarnOpportunityRow = ({
  type,
  provider,
  vaultAddress,
  tokenAddress,
  chain,
  symbol,
  name,
  isLoaded,
  version,
  metadata,
  index,
  underlyingTokenBalance,
  showTeaser
}: SupportedYearnVault & {
  isLoaded: boolean
  index: number
  showTeaser?: boolean
}) => {
  const [isLargerThanMd, isLargerThanLg] = useMediaQuery([
    `(min-width: ${breakpoints['md']})`,
    `(min-width: ${breakpoints['lg']})`
  ])
  const [vault, setVault] = useState<YearnVault | null>(null)
  const [cryptoAmount, setCryptoAmount] = useState<BigNumber>(bnOrZero(0))
  const [fiatAmount, setFiatAmount] = useState<BigNumber>(bnOrZero(0))
  const [showPopover, setShowPopover] = useState(false)
  const { yearn, loading } = useYearn()
  const history = useHistory()
  const location = useLocation()

  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const TVL = bnOrZero(underlyingTokenBalance.amountUsdc).div(`1e+${USDC_PRECISION}`).toString()
  // asset
  const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId: tokenAddress })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  // useGetAssetDescriptionQuery(tokenAddress)
  // account info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(chain)
  const {
    state: { isConnected, wallet },
    dispatch
  } = useWallet()

  const handleClick = () => {
    if (showPopover) {
    } else {
      if (isConnected) {
        history.push({
          pathname: `/defi/${type}/${provider}/deposit`,
          search: qs.stringify({
            chain,
            contractAddress: vaultAddress,
            tokenId: tokenAddress
          }),
          state: { background: location }
        })
      } else {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      }
    }
  }

  useEffect(() => {
    ;(async () => {
      if (!yearn || !wallet || loading) return null
      try {
        const _vault = yearn.findByVaultTokenId(vaultAddress)
        if (_vault) setVault(_vault)
        const userAddress = await chainAdapter.getAddress({ wallet })
        // TODO: currently this is hard coded to yearn vaults only.
        // In the future we should add a hook to get the provider interface by vault provider
        const [balance, pricePerShare] = await Promise.all([
          yearn.balance({ vaultAddress, userAddress }),
          yearn.pricePerShare({ vaultAddress })
        ])
        const amount = bnOrZero(balance).div(`1e+${vault?.decimals}`)
        const price = pricePerShare.div(`1e+${vault?.decimals}`).times(marketData?.price)
        setCryptoAmount(amount)
        setFiatAmount(amount.times(price))
      } catch (error) {
        console.error('StakingVaultRow useEffect', error)
      }
    })()
  }, [
    chainAdapter,
    loading,
    marketData?.price,
    tokenAddress,
    vault?.decimals,
    vaultAddress,
    wallet,
    yearn
  ])

  const debouncedHandleMouseEnter = debounce(() => setShowPopover(true), 100)
  const handlOnMouseLeave = () => {
    debouncedHandleMouseEnter.cancel()
  }
  const hasZeroBalanceAndApy =
    bnOrZero(vault?.metadata?.apy?.net_apy).isEqualTo(0) && bnOrZero(cryptoAmount).isEqualTo(0)

  if (!asset || !vault || hasZeroBalanceAndApy || !yearn || loading) return null

  return (
    <Tr onClick={handleClick} tabIndex={index}>
      {isLargerThanMd && (
        <Td>
          <Skeleton isLoaded={isLoaded}>
            <RawText color='gray.500'>{index}</RawText>
          </Skeleton>
        </Td>
      )}

      <Td>
        <HStack width='full'>
          <SkeletonCircle isLoaded={isLoaded}>
            <Popover isOpen={showPopover && showTeaser} onClose={() => setShowPopover(false)}>
              <PopoverTrigger>
                <Box onMouseEnter={debouncedHandleMouseEnter} onMouseLeave={handlOnMouseLeave}>
                  <AssetIcon src={asset?.icon} boxSize='8' />
                </Box>
              </PopoverTrigger>
              {showPopover && <AssetTeaser assetId={asset.caip19} />}
            </Popover>
          </SkeletonCircle>
          <SkeletonText noOfLines={2} isLoaded={isLoaded} flex={1}>
            <Stack spacing={0} flex={1}>
              <HStack>
                <Box
                  position='relative'
                  overflow='hidden'
                  height='20px'
                  title={`${metadata.displayName} (${version})`}
                  _after={{
                    content: 'attr(title)',
                    overflow: 'hidden',
                    height: 0,
                    display: 'block'
                  }}
                >
                  <RawText
                    fontWeight='bold'
                    as='span'
                    position='absolute'
                    lineHeight='shorter'
                    isTruncated
                    display='block'
                    maxWidth='100%'
                  >{`${metadata.displayName} (${version})`}</RawText>
                </Box>
              </HStack>
              <RawText fontSize='sm' color='gray.500' lineHeight='shorter'>
                {provider}
              </RawText>
            </Stack>
          </SkeletonText>
        </HStack>
      </Td>
      <Td display={{ base: 'none', lg: 'table-cell' }}>
        <Skeleton isLoaded={isLoaded}>
          <Tag textTransform='capitalize'>{type}</Tag>
        </Skeleton>
      </Td>
      {isLargerThanMd && (
        <Td>
          <Skeleton isLoaded={isLoaded}>
            <Tag colorScheme='green'>
              <Amount.Percent value={bnOrZero(vault?.metadata?.apy?.net_apy).toString()} />
            </Tag>
          </Skeleton>
        </Td>
      )}

      {isLargerThanLg && (
        <Td borderRightRadius='lg'>
          <Skeleton isLoaded={isLoaded}>
            <Amount.Fiat value={TVL} />
          </Skeleton>
        </Td>
      )}
      <Td textAlign='right'>
        <Skeleton isLoaded={isLoaded}>
          {cryptoAmount.gt(0) ? (
            <Stack>
              <Amount.Fiat value={fiatAmount.toString()} color='green.500' />
            </Stack>
          ) : (
            <RawText>-</RawText>
          )}
        </Skeleton>
      </Td>
    </Tr>
  )
}
