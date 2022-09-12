import type { Asset } from '@shapeshiftoss/asset-service'
import type { cosmos, cosmossdk } from '@shapeshiftoss/chain-adapters'
import {
  isCosmosChainId,
  isOsmosisChainId,
  StakingAction,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from 'state/slices/validatorDataSlice/constants'
const moduleLogger = logger.child({ namespace: ['useStakingAction'] })

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
  const chainAdapterManager = getChainAdapterManager()
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
        const memo =
          validator === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS ||
          validator === SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS
            ? 'Delegated with ShapeShift'
            : ''

        // this works because cosmos and osmosis staking interfaces are identical
        if (isCosmosChainId(chainId) || isOsmosisChainId(chainId)) {
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
        moduleLogger.error(error, 'Cosmos:useStakingAction error: ')
      }
    }
  }
  return {
    handleStakingAction,
  }
}
