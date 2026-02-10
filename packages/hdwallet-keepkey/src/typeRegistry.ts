import * as Messages from '@keepkey/device-protocol/lib/messages_pb'
import * as BinanceMessages from '@keepkey/device-protocol/lib/messages-binance_pb'
import * as CosmosMessages from '@keepkey/device-protocol/lib/messages-cosmos_pb'
import * as EosMessages from '@keepkey/device-protocol/lib/messages-eos_pb'
import * as MayachainMessages from '@keepkey/device-protocol/lib/messages-mayachain_pb'
import * as NanoMessages from '@keepkey/device-protocol/lib/messages-nano_pb'
import * as RippleMessages from '@keepkey/device-protocol/lib/messages-ripple_pb'
import * as ThorchainMessages from '@keepkey/device-protocol/lib/messages-thorchain_pb'
import type * as core from '@shapeshiftoss/hdwallet-core'
import type * as jspb from 'google-protobuf'
import omit from 'lodash/omit'

// Conflict between typedef and actual js export

// When CJS modules are loaded in ESM context (e.g. vitest), `import * as X`
// creates a namespace with only `default` and `module.exports` as enumerable keys.
// Property access (X.Foo) works via proxy, but Object.entries() does not enumerate them.
// Access the underlying CJS module.exports via `.default` for proper enumeration.
const unwrapCjsModule = <T>(mod: T): T => (mod as any).default ?? mod

const MessagesUnwrapped = unwrapCjsModule(Messages)
const BinanceMessagesUnwrapped = unwrapCjsModule(BinanceMessages)
const CosmosMessagesUnwrapped = unwrapCjsModule(CosmosMessages)
const EosMessagesUnwrapped = unwrapCjsModule(EosMessages)
const MayachainMessagesUnwrapped = unwrapCjsModule(MayachainMessages)
const NanoMessagesUnwrapped = unwrapCjsModule(NanoMessages)
const RippleMessagesUnwrapped = unwrapCjsModule(RippleMessages)
const ThorchainMessagesUnwrapped = unwrapCjsModule(ThorchainMessages)

const AllMessages = ([] as [string, core.Constructor<jspb.Message>][])
  .concat(Object.entries(omit(MessagesUnwrapped, 'MessageType', 'MessageTypeMap')))
  .concat(Object.entries(CosmosMessagesUnwrapped))
  .concat(Object.entries(BinanceMessagesUnwrapped))
  .concat(Object.entries(RippleMessagesUnwrapped))
  .concat(Object.entries(NanoMessagesUnwrapped))
  .concat(Object.entries(omit(EosMessagesUnwrapped, 'EosPublicKeyKind', 'EosPublicKeyKindMap')))
  .concat(Object.entries(ThorchainMessagesUnwrapped))
  .concat(Object.entries(MayachainMessagesUnwrapped))

const upperCasedMessageClasses = AllMessages.reduce(
  (registry, entry: [string, core.Constructor<jspb.Message>]) => {
    registry[entry[0].toUpperCase()] = entry[1]
    return registry
  },
  {} as Record<string, core.Constructor<jspb.Message>>,
)

// Map of message type enums to human readable message name
export const messageNameRegistry = Object.entries(unwrapCjsModule(Messages).MessageType).reduce(
  (registry, entry: [string, number]) => {
    registry[entry[1]] = entry[0].split('_')[1] ?? ''
    return registry
  },
  {} as Record<number, string>,
)

// Map of message type enum to their protobuf constructor
export const messageTypeRegistry = Object.entries(unwrapCjsModule(Messages).MessageType).reduce(
  (registry, entry: [string, number]) => {
    const part = entry[0].split('_')[1] ?? ''
    registry[entry[1]] = upperCasedMessageClasses[part.toUpperCase()]
    return registry
  },
  {} as Record<number, core.Constructor<jspb.Message>>,
)
