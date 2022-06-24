import { cosmos, cosmossdk } from '@shapeshiftoss/chain-adapters'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { SHAPESHIFT_VALIDATOR_ADDRESS } from 'state/slices/validatorDataSlice/const'

type StakingInput =
  | {
      asset: Asset
      chainSpecific: cosmos.BuildTxInput
      validator: string
      action: StakingAction.Claim
      value?: string
    }
  | {
      asset: Asset
      chainSpecific: cosmos.BuildTxInput
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
        const chainId = data.asset.chainId
        const adapter = chainAdapterManager.get(chainId) as unknown as cosmos.ChainAdapter // FIXME: this is silly
        if (!adapter) throw new Error(`unsupported chainId ${chainId}`)

        let result

        const { chainSpecific, validator, action, value } = data
        const memo = validator === SHAPESHIFT_VALIDATOR_ADDRESS ? 'Delegated with ShapeShift' : ''

        if (chainId === KnownChainIds.CosmosMainnet) {
          switch (action) {
            case StakingAction.Claim: {
              result = await (adapter as unknown as cosmossdk.cosmos.ChainAdapter) // TODO: fix types
                .buildClaimRewardsTransaction({
                  wallet,
                  validator,
                  chainSpecific,
                  memo,
                })
              break
            }
            case StakingAction.Stake: {
              result = await (
                adapter as unknown as cosmossdk.cosmos.ChainAdapter
              ).buildDelegateTransaction({
                wallet,
                validator,
                value,
                chainSpecific,
                memo,
              })
              break
            }
            case StakingAction.Unstake: {
              result = await (
                adapter as unknown as cosmossdk.cosmos.ChainAdapter
              ).buildUndelegateTransaction({
                wallet,
                validator,
                value,
                chainSpecific,
                memo,
              })
              break
            }
            default: {
              break
            }
          }
        } else if (chainId === KnownChainIds.OsmosisMainnet) {
          // TODO(gomes): implement this
        } else {
          throw new Error(`unsupported chainId ${chainId}`)
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
