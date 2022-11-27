import { useToast } from '@chakra-ui/react'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { LegacyWCService } from 'kkdesktop/walletconnect'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'
import { getWalletConnect } from 'kkdesktop/walletconnect/utils'
import { CoreTypes, SignClientTypes } from '@walletconnect/types'
import { SessionProposalModal } from './components/modal/callRequest/SessionProposalModal'
import { WalletConnectLogic } from 'WalletConnectLogic'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const wallet = useWallet().state.wallet
  const [legacyBridge, setLegacyBridge] = useState<LegacyWCService>()
  const [pairingMeta, setPairingMeta] = useState<CoreTypes.Metadata>()
  const [isLegacy, setIsLegacy] = useState(false)

  const [requests, setRequests] = useState<any[]>([])
  const [proposals, setProposals] = useState<SignClientTypes.EventArguments['session_proposal'][]>([])

  const addRequest = useCallback((req: any) => setRequests(requests.concat(req)), [requests])
  const addProposal = useCallback((req: any) => setProposals(proposals.concat(req)), [proposals])

  const removeRequest = useCallback(
    (id: number) => {
      const newRequests = requests.filter(request => request.id !== id)
      delete newRequests[id]
      setRequests(newRequests)
    },
    [requests],
  )

  const removeProposal = useCallback(
    (id: number) => {
      const newProposals = proposals.filter(proposal => proposal.id !== id)
      setProposals(newProposals)
    },
    [proposals],
  )

  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(prev => prev + 1), [])

  const toast = useToast()

  // connects to given URI or attempts previous connection
  const connect = useCallback(
    async (uri?: string) => {
      if (uri) {
        const wc = await getWalletConnect(wallet as ETHWallet, uri)
        if (wc instanceof LegacyWCService) {
          setIsLegacy(true)
          wc.connector.on('call_request', (_e, payload) => {
            addRequest(payload)
          })

          wc.connector.off('connect')
          wc.connector.off('disconnect')
          wc.connector.off('wallet_switchEthereumChain')
          wc.connector.on('connect', rerender)
          wc.connector.on('disconnect', rerender)
          wc.connector.on('wallet_switchEthereumChain', (_, e) => {
            toast({
              title: 'Wallet Connect',
              description: `Switched to chainId ${e.params[0].chainId}`,
              isClosable: true,
            })
            rerender()
          })
          await wc.connect()
          setLegacyBridge(wc)
        } else {
          setIsLegacy(false)
          setLegacyBridge(undefined)
        }
      }
      else {
        // const wcSessionJsonString = localStorage.getItem('walletconnect')
        // if (!wcSessionJsonString) return
        // const session = JSON.parse(wcSessionJsonString)
        // newBridge = new WCService(wallet as ETHWallet, new LegacyWalletConnect({ session }), {
        //   onCallRequest: addRequest,
        // })
      }

    },
    [wallet, addRequest, rerender, toast],
  )

  useEffect(() => {
    connect()
  }, [connect])

  const dapp = pairingMeta

  return (
    <WalletConnectBridgeContext.Provider value={{ proposals, addProposal, removeProposal, isLegacy, legacyBridge, dapp, connect, removeRequest, requests, addRequest, setPairingMeta }}>
      <WalletConnectLogic />
      {children}
      {requests.length > 0 && <CallRequestModal />}
      {proposals.length > 0 && <SessionProposalModal />}
    </WalletConnectBridgeContext.Provider>
  )
}
