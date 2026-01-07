# Cosmos Staking via Yield XYZ - Technical Spike

## Problem

Yield XYZ returns Cosmos transactions as **hex-encoded protobuf** (e.g., `0ab7010a9d010a232f636f736d6f732e7374616b696e672e763162657461312e4d736744656c656761746512760a2d...`), but our `@shapeshiftoss/hdwallet-core` expects **Amino JSON format** for signing.

### Current Error
```
ChainAdapterError: Cannot read properties of undefined (reading 'msg')
```

The adapter's `signAndBroadcastTransaction` expects `txToSign.tx.msg[]` in Amino format, not raw protobuf bytes.

## Yield XYZ Response Example

```json
{
  "id": "f5aef598-0987-4a60-9341-9d0be2613e39",
  "intent": "enter",
  "type": "STAKE",
  "yieldId": "cosmos-atom-native-staking",
  "transactions": [
    {
      "id": "68a1648a-7c8c-43f9-9df5-110960148368",
      "title": "STAKE Transaction",
      "unsignedTransaction": "0ab7010a9d010a232f636f736d6f732e7374616b696e672e763162657461312e4d736744656c656761746512760a2d636f736d6f733161386c33737271796b356b72767a686b743763797a79353279786367687436333232773271791234636f736d6f7376616c6f70657231686a63743671376e707373707367336467767a6b33736466383973706d6c7066646e366d39641a0f0a057561746f6d12063730373036341215766961205374616b654b6974204349442d3130303912680a510a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21034d61c87b52901de0969a12d285289bec15b7a7217fe2a03132b469b55f3cb1d112040a02080118e00612130a0d0a057561746f6d12043336323910ef92161a0b636f736d6f736875622d3420f6953a",
      "gasEstimate": "{\"amount\":\"0.003629\",\"gasLimit\":\"362863\",\"token\":{...}}"
    }
  ]
}
```

## HDWallet Expected Format

From `@shapeshiftoss/hdwallet-core/dist/cosmos.d.ts`:

```typescript
interface CosmosSignTx {
  addressNList: BIP32Path;
  tx: Cosmos.StdTx;  // <- Amino format
  chain_id: string;
  account_number: string;
  sequence: string;
}

interface StdTx {
  msg: Msg[];  // <- Amino messages
  fee: StdFee;
  signatures: StdSignature[];
  memo?: string;
}
```

## Investigation Tasks

1. **Check HDWallet capabilities**
   - Review `../shapeshiftHdWallet` repository
   - Does hdwallet support `signDirect` (protobuf signing) in addition to `signAmino`?
   - Look at `cosmosSignTx` implementation

2. **Protobuf decoding option**
   - Can we decode the hex protobuf to extract message types and values?
   - Then reconstruct in Amino format?
   - Libraries: `@cosmjs/proto-signing`, `cosmjs-types`

3. **Alternative: Build our own transaction**
   - Current workaround in `executeTransaction.ts` uses `adapter.buildDelegateTransaction()`
   - This bypasses Yield XYZ's pre-built transaction entirely
   - Need to pass `cosmosStakeArgs` with validator/amount/action

4. **Yield XYZ API check**
   - Does their API support returning Amino format instead of protobuf?
   - Contact Yield XYZ support about transaction format options

## Current Workaround

File: `src/lib/yieldxyz/executeTransaction.ts`

We're currently attempting to build the transaction ourselves using the adapter's native methods:

```typescript
const executeCosmosTransaction = async ({ cosmosStakeArgs, ... }) => {
  const { txToSign } = await adapter.buildDelegateTransaction({
    accountNumber,
    wallet,
    validator: cosmosStakeArgs.validator,
    value: cosmosStakeArgs.amountCryptoBaseUnit,
    chainSpecific: { gas, fee },
    memo: '',
  })
  
  return adapter.signAndBroadcastTransaction({
    signTxInput: { txToSign, wallet },
    ...
  })
}
```

This requires passing `cosmosStakeArgs` from `YieldActionModal.tsx`.

## Files to Investigate

- `../shapeshiftHdWallet/packages/hdwallet-core/src/cosmos.ts`
- `../shapeshiftHdWallet/packages/hdwallet-native/src/cosmos.ts`
- `@shapeshiftoss/chain-adapters` cosmos adapter source
- Yield XYZ API docs: https://docs.yield.xyz/docs/cosmos-atom-native-staking

## Related Code

- `src/lib/yieldxyz/executeTransaction.ts` - Transaction execution
- `src/pages/Yields/components/YieldActionModal.tsx` - Modal that initiates transactions
- `src/plugins/cosmos/hooks/useStakingAction/useStakingAction.tsx` - Existing cosmos staking pattern
