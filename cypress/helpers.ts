import { getVault } from 'context/WalletProvider/NativeWallet/components/NativeCreate'

export const getSeedPhrase = async (): Promise<string> => {
  const vault = await getVault()
  return await vault.unwrap().get('#mnemonic')
}

export const getRandomNumericalString = (): string => {
  return crypto
    .getRandomValues(new Uint32Array(10))
    .reduce((acc, int) => acc.concat(int.toString()), '')
}
