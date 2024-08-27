import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import type { Asset, BIP44Params } from '@shapeshiftoss/types'
import {
  isStakingChainAdapter,
  StakingAction,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import {
  checkIsMetaMaskDesktop,
  checkIsMetaMaskImpersonator,
  checkIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from 'state/slices/opportunitiesSlice/resolvers/cosmosSdk/constants'

const shapeshiftValidators = [SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS]

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
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })
  const {
    state: { wallet },
  } = useWallet()

  const handleStakingAction = async (data: StakingInput) => {
    const { bip44Params, chainSpecific, validator, action, value, asset } = data

    if (!(wallet && bip44Params)) return

    try {
      // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask

      const isMetaMaskDesktop = await checkIsMetaMaskDesktop(wallet)
      const isMetaMaskImpersonator = await checkIsMetaMaskImpersonator(wallet)
      if (
        !wallet.supportsOfflineSigning() &&
        (!isMetaMaskDesktop ||
          isMetaMaskImpersonator ||
          (isMetaMaskDesktop && !(await checkIsSnapInstalled())))
      ) {
        throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
      }

      const adapter = chainAdapterManager.get(asset.chainId)

      if (!adapter) throw new Error(`unsupported chainId ${asset.chainId}`)

      if (!isStakingChainAdapter(adapter)) {
        throw new Error(`no staking support for chainId: ${asset.chainId}`)
      }

      const memo = shapeshiftValidators.includes(validator) ? 'Delegated with ShapeShift' : ''

      const { accountNumber } = bip44Params

      await checkLedgerAppOpenIfLedgerConnected(asset.chainId)
      const address = await adapter.getAddress({ accountNumber, wallet })
      const { txToSign, receiverAddress } = await (async () => {
        switch (action) {
          case StakingAction.Claim:
            return {
              txToSign: (
                await adapter.buildClaimRewardsTransaction({
                  accountNumber,
                  wallet,
                  validator,
                  chainSpecific,
                  memo,
                })
              ).txToSign,
              receiverAddress: address,
            }
          case StakingAction.Stake:
            return {
              txToSign: (
                await adapter.buildDelegateTransaction({
                  accountNumber,
                  wallet,
                  validator,
                  value,
                  chainSpecific,
                  memo,
                })
              ).txToSign,
              receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
            }
          case StakingAction.Unstake:
            return {
              txToSign: (
                await adapter.buildUndelegateTransaction({
                  accountNumber,
                  wallet,
                  validator,
                  value,
                  chainSpecific,
                  memo,
                })
              ).txToSign,
              receiverAddress: address,
            }
          default:
            throw new Error(`unsupported staking action: ${action}`)
        }
      })()
      return adapter.signAndBroadcastTransaction({
        senderAddress: address,
        receiverAddress,
        signTxInput: { txToSign, wallet },
      })
    } catch (error) {
      console.error(error)
    }
  }
  return {
    handleStakingAction,
  }
}
