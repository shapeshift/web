import { solana } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

import { getConfig } from '@/config'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'

const JITO_BUNDLE_POLL_INTERVAL_MS = 2_000
const JITO_BUNDLE_MAX_POLLS = 30
const COMPUTE_UNIT_MARGIN_MULTIPLIER = 1.6

/**
 * Execute a Jito bundle for oversized Solana transactions.
 *
 * Splits instructions into 2 transactions, adds a tip to the last one,
 * signs each sequentially, and submits as an atomic Jito bundle.
 */
export const execSolanaJitoBundle = async ({
  instructions,
  addressLookupTableAddresses,
  from,
  accountNumber,
  sellAssetChainId,
  signTransaction,
}: {
  instructions: TransactionInstruction[]
  addressLookupTableAddresses: string[]
  from: string
  accountNumber: number
  sellAssetChainId: string
  signTransaction: (txToSign: SolanaSignTx) => Promise<string>
}): Promise<string> => {
  const config = getConfig()
  const adapter = assertGetSolanaChainAdapter(sellAssetChainId)
  const jitoService = solana.createJitoService(config.VITE_JITO_BLOCK_ENGINE_URL)

  // Split instructions roughly in half
  const midpoint = Math.ceil(instructions.length / 2)
  const group1 = instructions.slice(0, midpoint)
  const group2 = instructions.slice(midpoint)

  // Build tip instruction for the last tx
  const tipInstruction = await solana.buildJitoTipInstruction({
    jitoService,
    fromPubkey: new PublicKey(from),
  })

  const group2WithTip = [...group2, tipInstruction]

  // Build both unsigned txs
  const [unsignedTx1, unsignedTx2] = await buildBundleUnsignedTxs({
    adapter,
    from,
    accountNumber,
    instructionGroups: [group1, group2WithTip],
    addressLookupTableAddresses,
  })

  // Sign both txs sequentially (hdwallet only supports single-tx signing)
  const signedTx1 = await signTransaction(unsignedTx1)
  const signedTx2 = await signTransaction(unsignedTx2)

  // Submit as Jito bundle
  const bundleId = await jitoService.sendBundle([signedTx1, signedTx2])

  // Poll for bundle landing
  return await pollBundleLanding(jitoService, bundleId)
}

const buildBundleUnsignedTxs = async ({
  adapter,
  from,
  accountNumber,
  instructionGroups,
  addressLookupTableAddresses,
}: {
  adapter: ReturnType<typeof assertGetSolanaChainAdapter>
  from: string
  accountNumber: number
  instructionGroups: TransactionInstruction[][]
  addressLookupTableAddresses: string[]
}): Promise<SolanaSignTx[]> => {
  const unsignedTxs: SolanaSignTx[] = []

  for (const instructions of instructionGroups) {
    const { fast } = await adapter.getFeeData({
      to: '',
      value: '0',
      chainSpecific: {
        from,
        instructions,
        addressLookupTableAccounts: addressLookupTableAddresses,
      },
    })

    const convertedInstructions = instructions.map(ix => adapter.convertInstruction(ix))

    const unsignedTx = await adapter.buildSendApiTransaction({
      from,
      to: '',
      value: '0',
      accountNumber,
      chainSpecific: {
        instructions: convertedInstructions,
        addressLookupTableAccounts: addressLookupTableAddresses,
        computeUnitLimit: bnOrZero(fast.chainSpecific.computeUnits)
          .times(COMPUTE_UNIT_MARGIN_MULTIPLIER)
          .toFixed(0),
        computeUnitPrice: fast.chainSpecific.priorityFee,
      },
    })

    unsignedTxs.push(unsignedTx)
  }

  return unsignedTxs
}

const pollBundleLanding = async (
  jitoService: solana.JitoService,
  bundleId: string,
): Promise<string> => {
  for (let i = 0; i < JITO_BUNDLE_MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, JITO_BUNDLE_POLL_INTERVAL_MS))

    const statuses = await jitoService.getInflightBundleStatuses([bundleId])
    const status = statuses.value[0]

    if (status?.status === 'Landed') {
      // Bundle landed - get the tx hash from getBundleStatuses
      const bundleStatuses = await jitoService.getBundleStatuses([bundleId])
      const bundleStatus = bundleStatuses.value[0]
      // Return the last tx hash (the one with the swap + tip)
      const txs = bundleStatus?.transactions
      if (!txs?.length) {
        throw new Error(`Jito bundle landed but no transaction hash returned: ${bundleId}`)
      }
      return txs[txs.length - 1]
    }

    if (status?.status === 'Failed' || status?.status === 'Invalid') {
      throw new Error(`Jito bundle ${status.status}: ${bundleId}`)
    }
  }

  throw new Error(
    `Jito bundle timed out after ${
      (JITO_BUNDLE_MAX_POLLS * JITO_BUNDLE_POLL_INTERVAL_MS) / 1000
    }s: ${bundleId}`,
  )
}
