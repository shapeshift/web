import { Box, Flex } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/react'
import { caip10, CAIP19 } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { AssetClaimCard } from 'plugins/cosmos/components/AssetClaimCard/AssetClaimCard'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { useEffect, useMemo, useState } from 'react'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import {
  ASSET_ID_TO_DENOM,
  selectRewardsAmountByDenom,
  selectStakingDataStatus,
  selectTotalBondingsBalanceByAccountSpecifier,
  selectUnbondingEntriesByAccountSpecifier
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type StakedProps = {
  assetId: CAIP19
  validatorAddress: string
}

export const Overview = ({ assetId, validatorAddress }: StakedProps) => {
  const stakingDataStatus = useAppSelector(selectStakingDataStatus)
  const isLoaded = stakingDataStatus === 'loaded'
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const [chainAdapter, setChainAdapter] = useState<ChainAdapter<ChainTypes> | null>(null)
  const [address, setAddress] = useState<string>('')
  const accountSpecifier = useMemo(() => {
    if (!address.length) return ''

    return caip10.toCAIP10({
      caip2: asset.caip2,
      account: address
    })
  }, [address, asset.caip2])

  const chainAdapterManager = useChainAdapters()
  const {
    state: { wallet }
  } = useWallet()
  const dispatch = useAppDispatch()

  useEffect(() => {
    ;(async () => {
      const cosmosChainAdapter = chainAdapterManager.byChain(asset.chain)
      setChainAdapter(cosmosChainAdapter)
    })()
  })

  useEffect(() => {
    ;(async () => {
      if (!chainAdapter || !wallet || !asset) return

      const address = await chainAdapter.getAddress({
        wallet
      })
      setAddress(address)
    })()
  }, [chainAdapter, wallet, asset])

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier.length || isLoaded) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true }
        )
      )
    })()
  }, [accountSpecifier, isLoaded, dispatch])

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByAccountSpecifier(
      state,
      accountSpecifier,
      validatorAddress,
      ASSET_ID_TO_DENOM[asset.caip19]
    )
  )
  const undelegationEntries = useAppSelector(state =>
    selectUnbondingEntriesByAccountSpecifier(state, accountSpecifier, validatorAddress)
  )

  const rewardsAmount = useAppSelector(state =>
    selectRewardsAmountByDenom(
      state,
      accountSpecifier,
      validatorAddress,
      ASSET_ID_TO_DENOM[asset.caip19]
    )
  )

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box p='22px'>
        <Flex
          direction='column'
          maxWidth='595px'
          alignItems='center'
          justifyContent='space-between'
        >
          <Skeleton
            isLoaded={isLoaded}
            width='100%'
            minHeight='48px'
            mb='30px'
            justifyContent='space-between'
          >
            <StakedRow
              assetSymbol={asset.symbol}
              fiatRate={bnOrZero(marketData.price)}
              cryptoStakedAmount={bnOrZero(totalBondings).div(`1e+${asset.precision}`)}
              apr={bnOrZero('0.12')}
            />
          </Skeleton>
          <Skeleton isLoaded={isLoaded} width='100%' mb='40px' justifyContent='space-between'>
            <Box width='100%'>
              <Text translation={'defi.rewards'} mb='12px' color='gray.500' />
              <AssetClaimCard
                assetSymbol={asset.symbol}
                assetName={asset.name}
                cryptoRewardsAmount={bnOrZero(rewardsAmount).div(`1e+${asset.precision}`)}
                fiatRate={bnOrZero(marketData.price)}
                renderButton={() => (
                  <ClaimButton assetId={assetId} validatorAddress={validatorAddress} />
                )}
              />
            </Box>
          </Skeleton>
          <Skeleton isLoaded={isLoaded} width='100%' minHeight='68px' mb='20px'>
            <Text translation={'defi.unstaking'} color='gray.500' />
            <Box width='100%'>
              {undelegationEntries.map((undelegation, i) => (
                <UnbondingRow
                  key={i}
                  assetSymbol={asset.symbol}
                  fiatRate={bnOrZero(marketData.price)}
                  cryptoUnbondedAmount={bnOrZero(undelegation.amount).div(`1e+${asset.precision}`)}
                  unbondingEnd={undelegation.completionTime}
                />
              ))}
            </Box>
          </Skeleton>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
