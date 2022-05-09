import { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { Asset, chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

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
        const adapterType = adapter.getType()

        let result

        const { chainSpecific, validator, action, value } = data
        if (adapterType === ChainTypes.Cosmos) {
          switch (action) {
            case StakingAction.Claim: {
              result = await (
                adapter as cosmossdk.cosmos.ChainAdapter
              ).buildClaimRewardsTransaction({
                wallet,
                validator,
                chainSpecific,
              })
              break
            }
            case StakingAction.Stake: {
              result = await (adapter as cosmossdk.cosmos.ChainAdapter).buildDelegateTransaction({
                wallet,
                validator,
                value,
                chainSpecific,
              })
              break
            }
            case StakingAction.Unstake: {
              result = await (adapter as cosmossdk.cosmos.ChainAdapter).buildUndelegateTransaction({
                wallet,
                validator,
                value,
                chainSpecific,
              })
              break
            }
            default: {
              break
            }
          }
        } else if (adapterType === ChainTypes.Osmosis) {
          // TODO(gomes): implement this
        } else {
          throw new Error('unsupported adapterType')
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
