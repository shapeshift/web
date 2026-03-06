import { ASSET_NAMESPACE, solanaChainId, solAssetId, toAssetId } from '@shapeshiftoss/caip'
import { AccountLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import type { Connection } from '@solana/web3.js'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'

import type { SolanaBalanceChange, SolanaSimulationResult, SolanaTokenInfo } from './types'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectAssetById } from '@/state/slices/selectors'
import { store } from '@/state/store'

const TOKEN_PROGRAM_IDS = new Set([TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()])

function isTokenAccount(ownerProgram: string): boolean {
  return TOKEN_PROGRAM_IDS.has(ownerProgram)
}

function getTokenInfoFromStore(mint: string): SolanaTokenInfo | undefined {
  const assetId = toAssetId({
    chainId: solanaChainId,
    assetNamespace: ASSET_NAMESPACE.splToken,
    assetReference: mint,
  })
  const asset = selectAssetById(store.getState(), assetId)
  if (!asset) return undefined

  return {
    mint,
    symbol: asset.symbol,
    name: asset.name,
    icon: asset.icon,
    decimals: asset.precision,
  }
}

function getNativeTokenInfo(): SolanaTokenInfo {
  const asset = selectAssetById(store.getState(), solAssetId)

  return {
    mint: 'native',
    symbol: asset?.symbol ?? 'SOL',
    name: asset?.name ?? 'Solana',
    icon: asset?.icon ?? '',
    decimals: asset?.precision ?? 9,
  }
}

type AccountState = {
  lamports: bigint
  owner: string
  tokenMint?: string
  tokenOwner?: string
  tokenAmount?: bigint
}

function parseAccountState(data: Buffer | null, lamports: number, owner: string): AccountState {
  const base: AccountState = {
    lamports: BigInt(lamports),
    owner,
  }

  if (!isTokenAccount(owner) || !data || data.length < AccountLayout.span) return base

  const decoded = AccountLayout.decode(data)
  return {
    ...base,
    tokenMint: new PublicKey(decoded.mint).toBase58(),
    tokenOwner: new PublicKey(decoded.owner).toBase58(),
    tokenAmount: decoded.amount,
  }
}

export const simulateSolanaTransaction = async (
  connection: Connection,
  base64Tx: string,
): Promise<SolanaSimulationResult | null> => {
  try {
    const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, 'base64'))
    const accountKeys = tx.message.staticAccountKeys
    const feePayer = accountKeys[0]?.toBase58()

    if (!feePayer) return null

    const addresses = accountKeys.map(k => k.toBase58())

    const [preAccountInfos, simulationResponse] = await Promise.all([
      connection.getMultipleAccountsInfo(accountKeys),
      connection.simulateTransaction(tx, {
        replaceRecentBlockhash: true,
        accounts: {
          addresses,
          encoding: 'base64',
        },
      }),
    ])

    const { value: simulation } = simulationResponse

    if (simulation.err) {
      return {
        success: false,
        error: typeof simulation.err === 'string' ? simulation.err : JSON.stringify(simulation.err),
        balanceChanges: [],
        unitsConsumed: simulation.unitsConsumed,
      }
    }

    const postAccounts = simulation.accounts
    if (!postAccounts) {
      return {
        success: true,
        balanceChanges: [],
        unitsConsumed: simulation.unitsConsumed,
      }
    }

    const balanceChanges: SolanaBalanceChange[] = []

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i]
      const preInfo = preAccountInfos[i]
      const postInfo = postAccounts[i]

      if (!postInfo) continue

      const postData = Array.isArray(postInfo.data) ? Buffer.from(postInfo.data[0], 'base64') : null
      const postState = parseAccountState(postData, postInfo.lamports, postInfo.owner)

      if (address === feePayer) {
        const preLamports = BigInt(preInfo?.lamports ?? 0)
        const diff = postState.lamports - preLamports

        if (diff !== 0n) {
          const tokenInfo = getNativeTokenInfo()
          const absDiff = diff < 0n ? -diff : diff
          balanceChanges.push({
            type: diff < 0n ? 'send' : 'receive',
            amount: absDiff.toString(),
            isNativeAsset: true,
            tokenInfo,
          })
        }
      }

      if (postState.tokenOwner === feePayer && postState.tokenMint) {
        const preData = preInfo?.data ? Buffer.from(preInfo.data) : null
        const preState = parseAccountState(
          preData,
          preInfo?.lamports ?? 0,
          preInfo?.owner.toBase58() ?? '',
        )

        const preAmount = preState.tokenAmount ?? 0n
        const postAmount = postState.tokenAmount ?? 0n
        const diff = postAmount - preAmount

        if (diff !== 0n) {
          const tokenInfo = getTokenInfoFromStore(postState.tokenMint) ?? {
            mint: postState.tokenMint,
            symbol: postState.tokenMint.substring(0, 6) + '...',
            name: postState.tokenMint,
            icon: '',
            decimals: 0,
          }

          const absDiff = diff < 0n ? -diff : diff
          balanceChanges.push({
            type: diff < 0n ? 'send' : 'receive',
            amount: bnOrZero(absDiff.toString())
              .div(bnOrZero(10).pow(tokenInfo.decimals))
              .toFixed(),
            isNativeAsset: false,
            tokenInfo,
          })
        }
      }
    }

    const nativeChange = balanceChanges.find(c => c.isNativeAsset)
    if (nativeChange) {
      nativeChange.amount = bnOrZero(nativeChange.amount)
        .div(bnOrZero(10).pow(nativeChange.tokenInfo.decimals))
        .toFixed()
    }

    return {
      success: true,
      balanceChanges,
      unitsConsumed: simulation.unitsConsumed,
    }
  } catch (error) {
    console.error('Failed to simulate Solana transaction:', error)
    return null
  }
}
