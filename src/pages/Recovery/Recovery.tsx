import type { GetAddressInput } from '@shapeshiftoss/chain-adapters'
import {
  accountTypeToScriptType,
  convertXpubVersion,
  toAddressNList,
  toRootDerivationPath,
} from '@shapeshiftoss/chain-adapters'
import type { HDWallet, PublicKey } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import type { UtxoAccountType } from '@shapeshiftoss/types'

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

const getAddress = async ({
  wallet,
  accountNumber,
  accountType,
  index,
  isChange = false,
  showOnDevice = false,
}: GetAddressInput): Promise<string> => {
  try {
    // this.assertIsAccountTypeSupported(accountType)

    const bip44Params = this.getBIP44Params({ accountNumber, accountType, isChange, index })

    if (!supportsBTC(wallet)) {
      throw new Error(`Recovery: wallet does not support bitcoin`)
    }

    // TODO(0xdef1cafe): just iterate a large number of addresses
    const maybeNextIndex = bip44Params.index ?? 0
    const address = await wallet.btcGetAddress({
      addressNList: toAddressNList({ ...bip44Params, index: maybeNextIndex }),
      coin: 'foo',
      scriptType: accountTypeToScriptType[accountType as UtxoAccountType], // deliberate cast so we can pass undefined
      showDisplay: showOnDevice,
    })

    if (!address) throw new Error('UtxoBaseAdapter: no address available from wallet')

    return address
  } catch (err) {}
}

export const Recovery = () => {
  return <div>Recovery</div>
}
