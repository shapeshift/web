import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import type { BIP44Params } from '@shapeshiftoss/types'
import {
  isStakingChainAdapter,
  StakingAction,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from 'state/slices/opportunitiesSlice/resolvers/cosmosSdk/constants'

const shapeshiftValidators = [
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
]

type StakingInput = {
  asset: Asset
  chainSpecific: cosmossdk.BuildTxInput
  validator: string
  bip44Params: BIP44Params
} & (
  | {
      action: StakingAction.Claim
      value?: string
    }
  | {
      action: StakingAction.Stake | StakingAction.Unstake
      value: string
    }
)

export const useStakingAction = () => {
  const chainAdapterManager = getChainAdapterManager()
  const {
    state: { wallet },
  } = useWallet()

  const handleStakingAction = async (data: StakingInput) => {
    const { bip44Params, chainSpecific, validator, action, value, asset } = data

    if (!(wallet && bip44Params)) return

    try {
      // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask
      if (!wallet.supportsOfflineSigning()) {
        throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
      }

      const adapter = chainAdapterManager.get(asset.chainId)

      if (!adapter) throw new Error(`unsupported chainId ${asset.chainId}`)

      if (!isStakingChainAdapter(adapter)) {
        throw new Error(`no staking support for chainId: ${asset.chainId}`)
      }

      const memo = shapeshiftValidators.includes(validator) ? 'Delegated with ShapeShift' : ''

      const { txToSign } = await (() => {
        const { accountNumber } = bip44Params
        switch (action) {
          case StakingAction.Claim:
            return adapter.buildClaimRewardsTransaction({
              accountNumber,
              wallet,
              validator,
              chainSpecific,
              memo,
            })
          case StakingAction.Stake:
            return adapter.buildDelegateTransaction({
              accountNumber,
              wallet,
              validator,
              value,
              chainSpecific,
              memo,
            })
          case StakingAction.Unstake:
            return adapter.buildUndelegateTransaction({
              accountNumber,
              wallet,
              validator,
              value,
              chainSpecific,
              memo,
            })
          default:
            throw new Error(`unsupported staking action: ${action}`)
        }
      })()

      return adapter.signAndBroadcastTransaction({ txToSign, wallet })
    } catch (error) {
      console.error(error)
    }
  }
  return {
    handleStakingAction,
  }
}
