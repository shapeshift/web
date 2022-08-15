import { AssetId } from '@shapeshiftoss/caip'
import { Logger } from '@shapeshiftoss/logger'
import BigNumber from 'bignumber.js'

import { Event, Message } from '../../generated/cosmos'
import { TxMetadata } from '../types'
const logger = new Logger({
  namespace: ['client', 'cosmos', 'utils'],
  level: process.env.LOG_LEVEL,
})

const metaData = (msg: Message | undefined, assetId: string): TxMetadata | undefined => {
  if (!msg) return

  switch (msg.type) {
    case 'delegate':
    case 'begin_unbonding':
      return {
        parser: 'cosmos',
        method: msg.type,
        delegator: msg.from,
        destinationValidator: msg.to,
        value: msg?.value?.amount,
      }
    case 'begin_redelegate':
      return {
        parser: 'cosmos',
        method: msg.type,
        sourceValidator: msg.from,
        delegator: msg.origin,
        destinationValidator: msg.to,
        value: msg?.value?.amount,
        assetId,
      }
    case 'withdraw_delegator_reward':
      return {
        parser: 'cosmos',
        method: msg.type,
        destinationValidator: msg.to,
        value: msg?.value?.amount,
        assetId,
      }
    case 'ibc_send':
    case 'ibc_receive':
      return {
        parser: 'cosmos',
        method: msg.type,
        ibcDestination: msg.to,
        ibcSource: msg.from,
        assetId,
        value: msg?.value?.amount,
      }
    // known message types with no applicable metadata
    case 'send':
      return
    default:
      logger.warn(`unsupported message type: ${msg.type}`)
      return
  }
}

const virtualMessageFromEvents = (
  msg: Message,
  events: { [key: string]: Event[] },
  address: string,
): Message | undefined => {
  // ibc send tx indicated by events
  const ibcSendEventData = events[0]?.find((event) => event.type === 'send_packet')

  // ibc receive tx indicated by events
  const ibcReceivedData = Object.values(events).find((event) =>
    event.some(
      (subEvent: {
        type: string
        attributes: {
          key: string
          value: string
        }[]
      }) =>
        subEvent.type === 'coin_received' &&
        subEvent.attributes[0].key === 'receiver' &&
        subEvent.attributes[0].value.toLowerCase() === address.toLowerCase(),
    ),
  )
  const ibcRecvEventData = ibcReceivedData?.find((event) => {
    return event.type === 'recv_packet'
  })

  // get rewards tx indicted by events
  const rewardEventData = events[0]?.find((event) => event.type === 'withdraw_rewards')

  // Osmo swap tx. This works for now as a general cosmos-sdk parser
  // Eventually may want an osmo parser on its own
  const swapEventData = events[0]?.find((event) => event.type === 'token_swapped')

  if (ibcSendEventData) {
    const parsedPacketData = JSON.parse(
      ibcSendEventData?.attributes.find((attribute) => attribute.key === 'packet_data')?.value ??
        '{}',
    )

    // We dont support parsing ibc sends unless they are atom or osmo
    if (parsedPacketData.denom === 'uatom' || parsedPacketData.denom === 'uosmo')
      return {
        type: 'ibc_send',
        value: { amount: parsedPacketData.amount, denom: parsedPacketData.denom },
        from: parsedPacketData.sender,
        to: parsedPacketData.receiver,
        origin: parsedPacketData.sender,
      }
    return
  } else if (ibcRecvEventData) {
    const parsedPacketData = JSON.parse(
      ibcRecvEventData?.attributes.find((attribute) => attribute.key === 'packet_data')?.value ??
        '{}',
    )

    // Osmosis IBC receives are showing up as osmosis. (Requires further debugging, probably during a swapper re-write)
    // This hack ignores ibc deposits into osmosis
    // Its fine because ibc assets only ephemerally exist on osmosis during a swap
    if (parsedPacketData.receiver.startsWith('osmo')) return
    return {
      type: 'ibc_receive',
      value: { amount: parsedPacketData.amount, denom: parsedPacketData.denom },
      from: parsedPacketData.sender,
      to: parsedPacketData.receiver,
      origin: parsedPacketData.sender,
    }
  } else if (rewardEventData) {
    const valueUnparsed = rewardEventData?.attributes?.find(
      (attribute) => attribute.key === 'amount',
    )?.value
    const valueParsed = valueUnparsed?.slice(0, valueUnparsed.length - 'uatom'.length)
    return {
      type: 'withdraw_delegator_reward',
      value: { amount: valueParsed ?? '', denom: 'uatom' },
      from: msg.from,
      to: msg.to,
      origin: msg.origin,
    }
  } else if (swapEventData) {
    const sender = swapEventData.attributes.find((attribute) => attribute.key === 'sender')?.value
    const swapAmount = swapEventData.attributes.find(
      (attribute) => attribute.key === 'tokens_out',
    )?.value
    const valueParsed = swapAmount?.slice(0, swapAmount?.length - 'uosmo'.length) ?? ''
    if (swapAmount?.includes('uosmo'))
      return {
        type: 'send',
        value: { amount: valueParsed, denom: 'uosmo' },
        to: sender,
      }
  }

  // no virtual message handled, but also no transaction message
  if (!msg) {
    logger.warn(
      `no transaction message found and unable to create virtual message from events: ${events}`,
    )
  }

  return msg
}

export const valuesFromMsgEvents = (
  msg: Message,
  events: { [key: string]: Event[] },
  assetId: AssetId,
  address: string,
): { from: string; to: string; value: BigNumber; data: TxMetadata | undefined; origin: string } => {
  const virtualMsg = virtualMessageFromEvents(msg, events, address)
  const data = metaData(virtualMsg, assetId)
  const from = virtualMsg?.from ?? ''
  const to = virtualMsg?.to ?? ''
  const origin = virtualMsg?.origin ?? ''
  const value = new BigNumber(virtualMsg?.value?.amount || data?.value || 0)
  return { from, to, value, data, origin }
}
