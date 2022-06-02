import { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { Asset, chainAdapters } from '@shapeshiftoss/types'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from 'state/slices/validatorDataSlice/const'

type StakingInput =
  | {
      asset: Asset
      chainSpecific: chainAdapters.cosmos.BuildTxInput
      validator: string
      action: StakingAction.Claim
      value?: string
    }
  | {
      asset: Asset
      chainSpecific: chainAdapters.cosmos.BuildTxInput
      validator: string
      action: StakingAction.Stake | StakingAction.Unstake
      value: string
    }

export const useStakingAction = () => {
  const chainAdapterManager = useChainAdapters()
  const {
    state: { wallet },
  } = useWallet()

  const handleStakingAction = async (data: StakingInput) => {
    if (wallet) {
      try {
        const adapter = chainAdapterManager.byChain(data.asset.chain)

        let result

        const { chainSpecific, validator, action, value } = data
        const memo =
          validator === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS ? 'Delegated with ShapeShift' : ''

        const cosmosSdkAdapter = adapter as cosmossdk.cosmos.ChainAdapter
        const commonArgs = { wallet, validator, chainSpecific, memo }
        switch (action) {
          case StakingAction.Claim: {
            result = await cosmosSdkAdapter.buildClaimRewardsTransaction({
              ...commonArgs,
            })
            break
          }
          case StakingAction.Stake: {
            result = await cosmosSdkAdapter.buildDelegateTransaction({
              ...commonArgs,
              value,
            })
            break
          }
          case StakingAction.Unstake: {
            result = await cosmosSdkAdapter.buildUndelegateTransaction({
              ...commonArgs,
              value,
            })
            break
          }
          default: {
            break
          }
        }
        const txToSign = result?.txToSign

        let broadcastTXID: string | undefined

        // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask
        if (txToSign && wallet.supportsOfflineSigning()) {
          broadcastTXID = await adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
          return broadcastTXID
        } else {
          throw new Error('Bad hdwallet config')
        }
      } catch (error) {
        console.error('Cosmos:useStakingAction error: ', error)
      }
    }
  }
  return {
    handleStakingAction,
  }
}
