import * as native from '@shapeshiftoss/hdwallet-native'
import { GENERATE_MNEMONIC, Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useCallback, useEffect, useMemo, useState } from 'react'

const Revocable = native.crypto.Isolation.Engines.Default.Revocable

export const useRevocableSeed = (vault: Vault) => {
  const [generating, setIsGenerating] = useState(true)

  const revoker = useMemo(() => new (Revocable(class {}))(), [])
  revoker.addRevoker(() => vault.seal())

  const generate = useCallback(async () => {
    setIsGenerating(true)
    try {
      if (!vault.has('#mnemonic')) {
        vault.set('#mnemonic', GENERATE_MNEMONIC)
        await vault.save()
      }
    } catch (error) {
      console.error('Error creating wallet', error)
    }
    setIsGenerating(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault])

  useEffect(() => {
    generate()
  }, [generate])

  return {
    getSeed: () => {
      try {
        return vault.unwrap().get('#mnemonic')
      } catch (error) {
        console.error('Error creating wallet', error)
        return null
      }
    },
    revoker,
    generating
  }
}
