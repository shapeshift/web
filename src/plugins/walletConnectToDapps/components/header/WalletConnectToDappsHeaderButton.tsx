import { ChevronDownIcon } from '@chakra-ui/icons'
import { AvatarGroup, Button, Menu, MenuButton, MenuList } from '@chakra-ui/react'
import type { SessionTypes } from '@walletconnect/types'
import { DappHeaderMenuSummaryV2 } from 'plugins/walletConnectToDapps/components/header/DappHeaderMenuSummaryV2'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { type FC, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { isSome } from 'lib/utils'
import { trimWithEndEllipsis } from 'state/slices/portfolioSlice/utils'

import { useIsWalletConnectToDappsSupportedWallet } from '../../hooks/useIsWalletConnectToDappsSupportedWallet'
import { WalletConnectButtons } from './ConnectDapp'
import { DappAvatar } from './DappAvatar'
import { DappHeaderMenuSummary } from './DappHeaderMenuSummary'

const paddingProp = { base: 0, md: '20px' }
const maxWidthProp = { base: '280px', md: 'xs' }
const minWidthProp = { base: 0, md: 'xs' }
const widthProp = { base: 'full', md: 'auto' }

const WalletConnectV1ConnectedButton = () => {
  const walletConnectV1 = useWalletConnect()

  return (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={
          <DappAvatar
            image={walletConnectV1.dapp?.icons[0] ?? ''}
            connected={walletConnectV1.connector?.connected ?? false}
            size='xs'
            connectedDotSize={2}
            borderWidth={1}
          />
        }
        rightIcon={<ChevronDownIcon />}
        width={widthProp}
        textAlign='left'
        flexShrink='none'
      >
        <RawText pr={paddingProp} fontSize='sm'>
          {trimWithEndEllipsis(walletConnectV1.dapp?.name, 16)}
        </RawText>
        <RawText fontSize='xs' color='text.subtle'>
          {trimWithEndEllipsis(walletConnectV1.dapp?.url.replace(/^https?:\/\//, ''), 18)}
        </RawText>
      </MenuButton>
      <MenuList zIndex={2}>
        <DappHeaderMenuSummary />
      </MenuList>
    </Menu>
  )
}

const WalletConnectV2ConnectedButtonText = ({
  title,
  subTitle,
}: {
  title: string
  subTitle: string
}) => {
  return (
    <>
      <RawText pr={paddingProp} fontSize='sm'>
        {title}
      </RawText>
      <RawText fontSize='xs' color='text.subtle'>
        {subTitle}
      </RawText>
    </>
  )
}

const WalletConnectV2ConnectedButton = () => {
  const walletConnectV2 = useWalletConnectV2()
  const translate = useTranslate()
  const sessions = Object.values(walletConnectV2.sessionsByTopic).filter(isSome)
  const mostRecentSession = sessions.reduce<SessionTypes.Struct | undefined>((acc, session) => {
    if (!acc || acc.expiry < session.expiry) return session
    return acc
  }, undefined)
  return (
    <Menu autoSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={
          <AvatarGroup max={2} size='xs'>
            {sessions.map(session => {
              return (
                <DappAvatar
                  key={session.topic}
                  image={session.peer.metadata.icons[0]}
                  connected={session.acknowledged}
                  size='xs'
                  connectedDotSize={2}
                  borderWidth={1}
                />
              )
            })}
          </AvatarGroup>
        }
        rightIcon={<ChevronDownIcon />}
        width={widthProp}
        textAlign='left'
        flexShrink='none'
      >
        {sessions.length > 1 ? (
          <WalletConnectV2ConnectedButtonText
            title={translate('plugins.walletConnectToDapps.header.multipleSessionsConnected', {
              count: sessions.length,
            })}
            subTitle={translate('plugins.walletConnectToDapps.header.clickToManage')}
          />
        ) : (
          <WalletConnectV2ConnectedButtonText
            title={trimWithEndEllipsis(mostRecentSession?.peer.metadata.name, 16)}
            subTitle={trimWithEndEllipsis(
              mostRecentSession?.peer.metadata.url.replace(/^https?:\/\//, ''),
              18,
            )}
          />
        )}
      </MenuButton>
      <MenuList
        zIndex='banner'
        maxWidth={maxWidthProp}
        minWidth={minWidthProp}
        display='flex'
        flexDir='column'
        pb={0}
      >
        <DappHeaderMenuSummaryV2 />
      </MenuList>
    </Menu>
  )
}

export const WalletConnectToDappsHeaderButton: FC = () => {
  const walletConnectV1 = useWalletConnect()
  const walletConnectV2 = useWalletConnectV2()

  const isWalletConnectToDappsV1Enabled = useFeatureFlag('WalletConnectToDapps')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')

  const walletConnectV2Connected = useMemo(
    () => Object.values(walletConnectV2.sessionsByTopic).some(session => session?.peer),
    [walletConnectV2.sessionsByTopic],
  )

  const isWalletConnectToDappsSupportedWallet = useIsWalletConnectToDappsSupportedWallet()

  if (!isWalletConnectToDappsSupportedWallet) return null

  switch (true) {
    case (!walletConnectV1.connector || !walletConnectV1.dapp) &&
      !walletConnectV2Connected &&
      (isWalletConnectToDappsV1Enabled || isWalletConnectToDappsV2Enabled):
      return <WalletConnectButtons />
    case walletConnectV2Connected:
      return <WalletConnectV2ConnectedButton />
    default:
      return <WalletConnectV1ConnectedButton />
  }
}
