import type { solana } from '@shapeshiftoss/chain-adapters'
import type { TransactionInstruction } from '@solana/web3.js'
import {
  AddressLookupTableAccount,
  MessageV0,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js'

// Solana caps a single transaction at 1232 bytes (anything larger must be split into a Jito bundle).
const SOLANA_MAX_TX_SIZE_BYTES = 1232

export const isSolanaTransactionOversized = async ({
  adapter,
  from,
  instructions,
  addressLookupTableAddresses,
}: {
  adapter: solana.ChainAdapter
  from: string
  instructions: TransactionInstruction[]
  addressLookupTableAddresses: string[]
}): Promise<boolean> => {
  if (!instructions.length) return false

  const lookupTableInfos = await adapter.getAddressLookupTableAccounts(addressLookupTableAddresses)

  const lookupTableAccounts = lookupTableInfos.map(
    info =>
      new AddressLookupTableAccount({
        key: new PublicKey(info.key),
        state: AddressLookupTableAccount.deserialize(new Uint8Array(info.data)),
      }),
  )

  const messageV0 = MessageV0.compile({
    payerKey: new PublicKey(from),
    instructions,
    recentBlockhash: PublicKey.default.toString(),
    addressLookupTableAccounts: lookupTableAccounts,
  })

  return new VersionedTransaction(messageV0).serialize().length > SOLANA_MAX_TX_SIZE_BYTES
}
