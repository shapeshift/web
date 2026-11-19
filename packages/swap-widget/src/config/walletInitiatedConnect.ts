import { watchConnectors } from '@wagmi/core'
import type { Config, Connector } from 'wagmi'

// AppKit's own connection records (@reown/appkit-common SafeLocalStorageKeys), the same ones
// its session restore filters on. Read directly so hosts don't need @reown/appkit-controllers.
const APPKIT_CONNECTIONS_KEY = '@appkit/connections'
const APPKIT_DISCONNECTED_CONNECTOR_IDS_KEY = '@appkit/disconnected_connector_ids'
const EVM_NAMESPACE = 'eip155'

// undefined when the record can't be read, so callers can tell that apart from an empty record
const readEvmEntries = (key: string): unknown[] | undefined => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const entries = JSON.parse(raw)?.[EVM_NAMESPACE]
    return Array.isArray(entries) ? entries : []
  } catch {
    return undefined
  }
}

// True only for a wallet the user connected through AppKit and hasn't disconnected since
export const isUserConnectedConnector = (connectorId: string): boolean => {
  const id = connectorId.toLowerCase()
  const disconnectedIds = readEvmEntries(APPKIT_DISCONNECTED_CONNECTOR_IDS_KEY)
  const connections = readEvmEntries(APPKIT_CONNECTIONS_KEY)
  if (!disconnectedIds || !connections) return false

  const wasDisconnected = disconnectedIds.some(
    entry => typeof entry === 'string' && entry.toLowerCase() === id,
  )
  if (wasDisconnected) return false

  return connections.some(entry => {
    const entryId = (entry as { connectorId?: unknown } | null)?.connectorId
    return typeof entryId === 'string' && entryId.toLowerCase() === id
  })
}

const guardedConnectors = new WeakSet<Connector>()

// Injected wallets still trust the site in incognito or after an explicit disconnect (Rabby
// ignores wallet_revokePermissions), so two paths would connect them without the user:
// - the wallet's own `connect` event, which wagmi only listens to outside connect/reconnect
// - reconnect, which wagmi runs on mount and AppKit runs for every connector when it has no
//   records, connecting each connector whose isAuthorized() is true
// Both are dropped unless the user connected that wallet and kept it.
const guardConnector = (connector: Connector) => {
  if (connector.type !== 'injected' || guardedConnectors.has(connector)) return
  guardedConnectors.add(connector)

  const isAuthorized = connector.isAuthorized.bind(connector)
  connector.isAuthorized = () =>
    isUserConnectedConnector(connector.id) ? isAuthorized() : Promise.resolve(false)

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
