import { Box, Flex } from '@chakra-ui/layout'
import { ModalCloseButton } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { OverviewHeader } from 'plugins/cosmos/components/OverviewHeader/OverviewHeader'
import { RewardsRow } from 'plugins/cosmos/components/RewardsRow/RewardsRow'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { StakingButtons } from 'plugins/cosmos/components/StakingButtons/StakingButtons'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { useEffect, useState } from 'react'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import {
  selectRewardsCryptoBalanceByPubKey,
  selectTotalBondingsBalanceByPubKey,
  selectUnbondingEntriesByPubKey
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type StakedProps = {
  assetId: CAIP19
}

export const Overview = ({ assetId }: StakedProps) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const [chainAdapter, setChainAdapter] = useState<ChainAdapter<ChainTypes> | null>(null)
  const [address, setAddress] = useState<string>('')

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
      if (!chainAdapter || !wallet) return

      // TODO(gomes): Can we get a CAIP10 here so we don't have to do the chainAdapter dance here + in RTK?
      const address = await chainAdapter.getAddress({
        wallet
      })
      setAddress(address)
      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { pubKey: address, assetId },
          { forceRefetch: true }
        )
      )
    })()
  }, [wallet, chainAdapter, assetId])

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByPubKey(
      state,
      address,
      'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf' // TODO(gomes): Pass this from `<StakingOpportunitiesRow />` with modal state
    )
  )
  const undelegationEntries = useAppSelector(state =>
    selectUnbondingEntriesByPubKey(state, address)
  )
  const rewardsAmount = useAppSelector(state => selectRewardsCryptoBalanceByPubKey(state, address))

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
            fiatRate={bnOrZero('8.47')}
            cryptoStakedAmount={totalBondings}
            apr={bnOrZero('0.12')}
          />
          <StakingButtons assetId={assetId} />
          <Box width='100%' mt='20px'>
            {undelegationEntries.map((undelegation, i) => (
              <UnbondingRow
                key={i}
                assetSymbol={asset.symbol}
                fiatRate={bnOrZero('8.47')}
                cryptoUnbondedAmount={bnOrZero(undelegation.amount)}
                unbondingEnd={undelegation.completionTime}
              />
            ))}
          </Box>
          <RewardsRow
            mb='20px'
            mt='25px'
            assetSymbol={asset.symbol}
            fiatRate={bnOrZero('8.47')}
            cryptoRewardsAmount={bnOrZero(rewardsAmount)}
          />
          <ClaimButton assetId={assetId} />
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
