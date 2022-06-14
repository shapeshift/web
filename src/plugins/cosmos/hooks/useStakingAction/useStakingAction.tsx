// @ts-ignore this will fail at 'file differs in casing' error
import { ChainAdapter as CosmosChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmosSdk/cosmos/CosmosChainAdapter'
import { Asset, ChainTypes } from '@shapeshiftoss/types'
import { BuildTxInput } from '@shapeshiftoss/types/dist/chain-adapters/cosmos'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { SHAPESHIFT_VALIDATOR_ADDRESS } from 'state/slices/validatorDataSlice/const'

type StakingInput =
  | {
      asset: Asset
      chainSpecific: BuildTxInput
      validator: string
      action: StakingAction.Claim
      value?: string
    }
  | {
      asset: Asset
      chainSpecific: BuildTxInput
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
        const memo = validator === SHAPESHIFT_VALIDATOR_ADDRESS ? 'Delegated with ShapeShift' : ''

        if (adapterType === ChainTypes.Cosmos) {
          switch (action) {
            case StakingAction.Claim: {
              result = await (adapter as CosmosChainAdapter).buildClaimRewardsTransaction({
                wallet,
                validator,
                chainSpecific,
                memo,
              })
              break
            }
            case StakingAction.Stake: {
              result = await (adapter as CosmosChainAdapter).buildDelegateTransaction({
                wallet,
                validator,
                value,
                chainSpecific,
                memo,
              })
              break
            }
            case StakingAction.Unstake: {
              result = await (adapter as CosmosChainAdapter).buildUndelegateTransaction({
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
