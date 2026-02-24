import { useEffect, useRef } from 'react'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { cfAllOpenDepositChannels } from '@/lib/chainflip/rpc'
import { encodeRequestLiquidityDepositAddress } from '@/lib/chainflip/scale'
import type { ChainflipAsset, ChainflipOpenDepositChannelEntry } from '@/lib/chainflip/types'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useSignChainflipCall } from '@/pages/ChainflipLending/hooks/useSignChainflipCall'

const POLL_INTERVAL_MS = 6_000
const MAX_POLL_ATTEMPTS = 30

const decodeDepositAddress = (
  entry: ChainflipOpenDepositChannelEntry,
  targetAsset: ChainflipAsset,
): string | undefined => {
  const chainAccounts = entry[2]?.chain_accounts
  if (!chainAccounts) return undefined

  for (const [encodedAddress, asset] of chainAccounts) {
    if (asset.chain !== targetAsset.chain || asset.asset !== targetAsset.asset) continue

    const [[chainTag, addressData]] = Object.entries(encodedAddress)

    if (typeof addressData === 'string') return addressData

    if (Array.isArray(addressData)) {
      const bytes = addressData as number[]
      if (chainTag === 'Eth' || chainTag === 'Arb') {
        return `0x${bytes.map(b => b.toString(16).padStart(2, '0')).join('')}`
      }
      return String.fromCharCode(...bytes)
    }
  }

  return undefined
}

const pollForDepositAddress = async (
  scAccount: string,
  cfAsset: ChainflipAsset,
): Promise<string> => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    const channels = await cfAllOpenDepositChannels()

    for (const entry of channels) {
      const [accountId] = entry
      if (accountId !== scAccount) continue

      const address = decodeDepositAddress(entry, cfAsset)
      if (address) return address
    }
  }

  throw new Error('Deposit channel not found after polling')
}

export const useDepositChannel = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const assetId = DepositMachineCtx.useSelector(s => s.context.assetId)
  const lastUsedNonce = DepositMachineCtx.useSelector(s => s.context.lastUsedNonce)
  const isNativeWallet = DepositMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = DepositMachineCtx.useSelector(s => s.context.stepConfirmed)
  const wallet = useWallet().state.wallet
  const { accountId, scAccount } = useChainflipLendingAccount()
  const { signAndSubmit } = useSignChainflipCall()
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'opening_channel' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!accountId) throw new Error('Account not found')
        if (!scAccount) throw new Error('State Chain account not derived')

        const cfAsset = CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId]
        if (!cfAsset) throw new Error(`Unsupported asset: ${assetId}`)

        const encodedCall = encodeRequestLiquidityDepositAddress(cfAsset, 0)
        const nonceOrAccount = lastUsedNonce !== undefined ? lastUsedNonce + 1 : scAccount

        const { txHash, nonce } = await signAndSubmit({
          encodedCall,
          nonceOrAccount,
        })

        actorRef.send({ type: 'CHANNEL_BROADCASTED', txHash, nonce })

        const depositAddress = await pollForDepositAddress(scAccount, cfAsset)

        actorRef.send({ type: 'CHANNEL_SUCCESS', depositAddress })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to open deposit channel'
        actorRef.send({ type: 'CHANNEL_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [
    stateValue,
    actorRef,
    wallet,
    accountId,
    scAccount,
    assetId,
    lastUsedNonce,
    signAndSubmit,
    isNativeWallet,
    stepConfirmed,
  ])
}
