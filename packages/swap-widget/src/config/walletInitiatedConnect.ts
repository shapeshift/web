import { watchConnectors } from '@wagmi/core'
import type { Config, Connector } from 'wagmi'

// AppKit's own connection records (@reown/appkit-common SafeLocalStorageKeys), the same ones
// its session restore filters on. Read directly so hosts don't need @reown/appkit-controllers.
const APPKIT_CONNECTIONS_KEY = '@appkit/connections'
const APPKIT_DISCONNECTED_CONNECTOR_IDS_KEY = '@appkit/disconnected_connector_ids'
const EVM_NAMESPACE = 'eip155'

const readEvmEntries = (key: string): unknown[] => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const entries = JSON.parse(raw)?.[EVM_NAMESPACE]
    return Array.isArray(entries) ? entries : []
  } catch {
    return []
  }
}

// True only for a wallet the user connected through AppKit and hasn't disconnected since
export const isUserConnectedConnector = (connectorId: string): boolean => {
  const id = connectorId.toLowerCase()

  const wasDisconnected = readEvmEntries(APPKIT_DISCONNECTED_CONNECTOR_IDS_KEY).some(
    entry => typeof entry === 'string' && entry.toLowerCase() === id,
  )
  if (wasDisconnected) return false

  return readEvmEntries(APPKIT_CONNECTIONS_KEY).some(entry => {
    const entryId = (entry as { connectorId?: unknown } | null)?.connectorId
    return typeof entryId === 'string' && entryId.toLowerCase() === id
  })
}

const guardedConnectors = new WeakSet<Connector>()

// wagmi's `connect` event only fires when a wallet connects itself: the connect and reconnect
// actions detach that listener before running. Injected wallets fire it on page load whenever
// they still trust the site, even in incognito or after an explicit disconnect (Rabby ignores
// wallet_revokePermissions), so drop it unless the user connected that wallet and kept it.
const guardConnector = (connector: Connector) => {
  if (connector.type !== 'injected' || guardedConnectors.has(connector)) return
  guardedConnectors.add(connector)

  const { emitter } = connector
  const emit = emitter.emit.bind(emitter)

  emitter.emit = ((eventName, ...params) => {
    if (eventName === 'connect' && !isUserConnectedConnector(connector.id)) return
    emit(eventName, ...params)
  }) as typeof emitter.emit
}

export const guardWalletInitiatedConnects = (config: Config): (() => void) => {
  config.connectors.forEach(guardConnector)

  // EIP-6963 wallets can announce after the config is created
  return watchConnectors(config, {
    onChange: connectors => connectors.forEach(guardConnector),
  })
}
