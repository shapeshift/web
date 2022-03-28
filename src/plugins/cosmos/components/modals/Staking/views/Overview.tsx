import { Box, Flex } from '@chakra-ui/layout'
import { ModalCloseButton } from '@chakra-ui/react'
import { caip10, CAIP19 } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { OverviewHeader } from 'plugins/cosmos/components/OverviewHeader/OverviewHeader'
import { RewardsRow } from 'plugins/cosmos/components/RewardsRow/RewardsRow'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { StakingButtons } from 'plugins/cosmos/components/StakingButtons/StakingButtons'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { useEffect, useMemo, useState } from 'react'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import {
  selectRewardsCryptoBalancebyAccountSpecifier,
  selectTotalBondingsBalancebyAccountSpecifier,
  selectUnbondingEntriesbyAccountSpecifier
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type StakedProps = {
  assetId: CAIP19
}

export const Overview = ({ assetId }: StakedProps) => {
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

      // TODO(gomes): Can we get a CAIP10 here so we don't have to do the chainAdapter dance here + in RTK?
      const address = await chainAdapter.getAddress({
        wallet
      })
      setAddress(address)
    })()
  }, [chainAdapter, wallet, asset])

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier.length) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true }
        )
      )
    })()
  }, [accountSpecifier, dispatch])

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalancebyAccountSpecifier(
      state,
      accountSpecifier,
      'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf' // TODO(gomes): Pass this from `<StakingOpportunitiesRow />` with modal state
    )
  )
  const undelegationEntries = useAppSelector(state =>
    selectUnbondingEntriesbyAccountSpecifier(
      state,
      accountSpecifier,
      'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
    )
  )

  const rewardsAmount = useAppSelector(state =>
    selectRewardsCryptoBalancebyAccountSpecifier(
      state,
      accountSpecifier,
      'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
    )
  )

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box pt='38px' pb='70px' px='34px'>
        <ModalCloseButton borderRadius='full' />
        <Flex
          direction='column'
          maxWidth='595px'
          alignItems='center'
          justifyContent='space-between'
        >
          <OverviewHeader assetName={asset.name} mb='35px' />
          <StakedRow
            mb='10px'
            assetSymbol={asset.symbol}
            fiatRate={bnOrZero(marketData.price)}
            cryptoStakedAmount={totalBondings.div(`1e+${asset.precision}`)}
            apr={bnOrZero('0.12')}
          />
          <StakingButtons assetId={assetId} />
          <Box width='100%' mt='20px'>
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
          <RewardsRow
            mb='20px'
            mt='25px'
            assetSymbol={asset.symbol}
            fiatRate={bnOrZero(marketData.price)}
            cryptoRewardsAmount={bnOrZero(rewardsAmount)}
          />
          <ClaimButton assetId={assetId} />
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
