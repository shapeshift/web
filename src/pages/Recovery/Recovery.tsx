import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

/**
 *
 * eth bip44params
 *
	{
	  bip44Params: {
	    purpose: 44,
	    coinType: 60,
	    accountNumber: 0
	  }
	}
 */
const stuckFundsPubkey =
  'zpub6qanHyghGMGS1JY4a3iDGjj9xACApuKwM72LLPB6gowdeL5wcVcP3Et3txHPmMegSNcPXo9h3BHG6aoxkRUJE81AKcGxtzZUEnmV6kW5FJc'
const stuckFundsAddress = 'bc1q9hz8dl4hhz6el7rgt25tu7rest4yacq4fwyknx'

/**
 * prob not required
const getPublicKey = async (
  wallet: HDWallet,
  // accountNumber: number,
  accountType: UtxoAccountType,
): Promise<PublicKey> => {
  const bip44Params = {
    purpose: 44,
    coinType: 60,
    accountNumber: 0,
  }
  const path = toRootDerivationPath(bip44Params)
  const publicKeys = await wallet.getPublicKeys([
    {
      coin: 'foo', // 'Bitcoin', // does this do anything in hdwallet?
      addressNList: bip32ToAddressNList(path),
      curve: 'secp256k1',
      scriptType: accountTypeToScriptType[accountType], // could possibly be undefined
    },
  ])

  if (!publicKeys?.[0]) throw new Error("couldn't get public key")

  if (accountType) {
    return { xpub: convertXpubVersion(publicKeys[0].xpub, accountType) }
  }

  return publicKeys[0]
}
*/

export const recoveryAccountTypeToScriptType: Record<UtxoAccountType, BTCInputScriptType> =
  Object.freeze({
    [UtxoAccountType.P2pkh]: BTCInputScriptType.SpendAddress,
    [UtxoAccountType.SegwitP2sh]: BTCInputScriptType.SpendP2SHWitness,
    [UtxoAccountType.SegwitNative]: BTCInputScriptType.SpendWitness,
  })

const getDangerousBIP44Params = () => {
  // eth
  return {
    purpose: 44,
    coinType: 60,
    accountNumber: 0,
  }
}

type GetDangerousAddressesArgs = {
  wallet: HDWallet
}

const getDangerousAddresses = async ({ wallet }: GetDangerousAddressesArgs): Promise<string[]> => {
  const bip44Params = getDangerousBIP44Params()

  if (!supportsBTC(wallet)) {
    throw new Error(`Recovery: wallet does not support bitcoin`)
  }

  const addressCount = 1000
  const addresses: string[] = []
  for (let index = 0; index < addressCount; index++) {
    for (const scriptType of Object.values(recoveryAccountTypeToScriptType)) {
      const address = await wallet.btcGetAddress({
        addressNList: toAddressNList({ ...bip44Params, index }),
        coin: 'foo',
        scriptType,
        showDisplay: false,
      })
      if (!address) throw new Error('Recovery: no address available from wallet')
      addresses.push(address)
    }
  }

  return addresses
}

export const Recovery = () => {
  const wallet = useWallet().state.wallet
  const [addresses, setAddresses] = useState<string[]>([])

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      setAddresses(await getDangerousAddresses({ wallet }))
    })()
  }, [wallet])

  return (
    <>
      <div>Recovery</div>
      <div>{addresses.join('\n')}</div>
    </>
  )
}
