import { Button } from '@chakra-ui/react'
import { btcChainId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { toPath } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, BTCSignTxInput, BTCSignTxOutput } from '@shapeshiftoss/hdwallet-core'
import {
  bip32ToAddressNList,
  BTCInputScriptType,
  BTCOutputAddressType,
  BTCOutputScriptType,
} from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'

export const Waterman = () => {
  const wallet = useWallet().state.wallet
  const sendRecoveryTx = useCallback(async () => {
    if (!wallet) return
    const affectedXpub =
      'zpub6rqc3KmwAavANm7AKqZDTZmPSAzimbq6AcYpANx7cX4ovgmqAfFNBY9oA7ySkSmZQ7Noqaw7z57VijCXumXrgrXSv2E2n6xAMAKw46mXHL8'
    const affectedAddress = 'bc1q9hz8dl4hhz6el7rgt25tu7rest4yacq4fwyknx'
    const affectedBalance = '33107961'
    const accountType = UtxoAccountType.SegwitNative
    const bitcoinChainAdapter = getChainAdapterManager().get(
      btcChainId,
    ) as unknown as UtxoBaseAdapter<KnownChainIds.BitcoinMainnet>

    // user wants to receive back into their regular account
    const accountNumber = 0
    // get a normal receive address to send stuck funds back to 🤦‍♂️
    const validReceiveAddress = await bitcoinChainAdapter.getAddress({
      wallet,
      accountNumber,
      accountType,
    })
    const sendMax = true
    const fees = await bitcoinChainAdapter.getFeeData({
      to: validReceiveAddress,
      value: affectedBalance,
      chainSpecific: {
        from: affectedAddress,
        pubkey: affectedXpub,
      },
      sendMax,
    })
    console.log({ fees })
    // TODO(0xdef1cafe): hardcode input utxos
    // const utxoUrl = `https://api.bitcoin.shapeshift.com/api/v1/account/${affectedXpub}/utxos`
    // const { data: utxos } = await axios.get(utxoUrl)

    // incorrect bip44params used to generate affected address (THORChain)
    const dangerousBip44Params = {
      purpose: 44,
      coinType: 931,
      accountNumber: 0,
    }

    const inputPath = toPath(dangerousBip44Params)
    const inputAddressNList = bip32ToAddressNList(inputPath)

    // original bad txid https://blockchair.com/bitcoin/transaction/2267f89589c7ce8c9be466658b021f998391856d66864fd951485c09d51d9d95
    // hex obtained via unchained https://api.bitcoin.shapeshift.com/api/v1/tx/2267f89589c7ce8c9be466658b021f998391856d66864fd951485c09d51d9d95/raw
    const originalVout = 0 // obtained and confirmed via tx link above ^^^

    const originalBadTxHex =
      '01000000000101378789b74a220101e33f58ca29f4bc3e110d605e0de0f8f3e703422c3dd7dc2e0100000000ffffffff03112cf901000000001600142dc476feb7b8b59ff8685aa8be787982ea4ee0153614584d05000000160014fb302e192fee2372915f553d59303c619b0906560000000000000000466a444f55543a424630413034354132443634344131413543363946323636304239373042303530393238363746314537394131463235303335453337323744434435433643460247304402205db90ad90f7b0017bbcdd4a3f3dcf49e8dc0083aff1e4270ce879cbc1a1c52f002202a12b9e98095b5810b1313dba1a7a331f6bd8b4ee07ec43674cebeb9a5852cbb0121026fbfb85de0351983cd9a86fc5eb97e83fdcee13d958acd0cfd1d0236c71f016700000000'

    const originalBadTxId = '2267f89589c7ce8c9be466658b021f998391856d66864fd951485c09d51d9d95'
    const inputs: BTCSignTxInput[] = [
      {
        addressNList: inputAddressNList,
        scriptType: BTCInputScriptType.SpendWitness,
        vout: originalVout,
        txid: originalBadTxId,
        hex: originalBadTxHex,
        amount: affectedBalance,
      },
    ]

    // no change address in outputs - so no need to specific addressNList!

    const outputs: BTCSignTxOutput[] = [
      {
        addressType: BTCOutputAddressType.Spend,
        address: validReceiveAddress, // where we actually want it to go
        amount: 'TODO', // affected amount - fee (miner keep different between sum of inputs and sum of outputs)
      },
    ]
    const coin = 'Bitcoin' // required by hdwallet

    const opReturnData = undefined // to be explicit

    const txToSign: BTCSignTx = { coin, inputs, outputs, opReturnData }
    console.log({ txToSign })

    // TODO(0xdef1cafe): render tx to user for confirmation

    // TODO(0xdef1cafe): test this ourselves by getting doggy coin stuck on thorchain bip44 path

    const signedTx = await bitcoinChainAdapter.signTransaction({ txToSign, wallet })
    console.log({ signedTx })
  }, [wallet])

  if (!wallet) return null

  return (
    <div>
      <h1>Waterman</h1>
      <Button onClick={sendRecoveryTx}>Send recovery tx</Button>
    </div>
  )
}
