import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Button,
  Container,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Skeleton,
  useDisclosure,
} from '@chakra-ui/react'
import type { ResponsiveValue } from '@chakra-ui/system'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { Property } from 'csstype'
import React, { memo, useCallback, useMemo } from 'react'
import { IoEllipsisHorizontal, IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { SideNavContent } from 'components/Layout/Header/SideNavContent'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'

const qrCodeIcon = <QRCodeIcon />
const arrowUpIcon = <ArrowUpIcon />
const arrowDownIcon = <ArrowDownIcon />
const ioSwapVerticalSharpIcon = <IoSwapVerticalSharp />
const moreIcon = <IoEllipsisHorizontal />

const ButtonRowDisplay = { base: 'flex', md: 'none' }

const containerPadding = { base: 6, '2xl': 8 }
const containerGap = { base: 6, md: 6 }
const containerInnerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const portfolioTextAlignment: ResponsiveValue<Property.AlignItems> = {
  base: 'center',
  md: 'flex-start',
}
const buttonGroupDisplay = { base: 'none', md: 'flex' }

const balanceFontSize = { base: '2xl', md: '4xl' }
const balanceFlexDir: ResponsiveValue<Property.FlexDirection> = {
  base: 'column-reverse',
  md: 'column',
}

const profileGridColumn = { base: 2, md: 1 }
const profileGridTemplate = { base: '1fr 1fr 1fr', md: '1fr 1fr' }

type DashboardHeaderTopProps = {
  isOpportunitiesLoading: boolean
}

export const DashboardHeaderTop: React.FC<DashboardHeaderTopProps> = memo(
  ({ isOpportunitiesLoading }) => {
    const { isOpen, onClose, onOpen } = useDisclosure()
    const isPortfolioLoading = useAppSelector(selectPortfolioLoading)
    const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
    const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
      selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
    )
    const earnUserCurrencyBalance = useAppSelector(
      selectEarnBalancesUserCurrencyAmountFull,
    ).toFixed()
    const portfolioTotalUserCurrencyBalance = useAppSelector(
      selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
    )
    const netWorth = useMemo(
      () =>
        bnOrZero(earnUserCurrencyBalance)
          .plus(portfolioTotalUserCurrencyBalance)
          .plus(claimableRewardsUserCurrencyBalance)
          .toFixed(),
      [
        claimableRewardsUserCurrencyBalance,
        earnUserCurrencyBalance,
        portfolioTotalUserCurrencyBalance,
      ],
    )
    const translate = useTranslate()
    const {
      state: { isConnected },
    } = useWallet()

    const { history } = useBrowserRouter()
    const send = useModal('send')
    const receive = useModal('receive')
    const qrCode = useModal('qrCode')

    const handleQrCodeClick = useCallback(() => {
      qrCode.open({})
    }, [qrCode])

    const handleSendClick = useCallback(() => {
      send.open({})
    }, [send])

    const handleReceiveClick = useCallback(() => {
      receive.open({})
    }, [receive])

    const handleTradeClick = useCallback(() => {
      history.push('/trade')
    }, [history])

    return (
      <Container
        width='full'
        display='grid'
        gridTemplateColumns={profileGridTemplate}
        maxWidth='container.4xl'
        px={containerPadding}
        pt={4}
        pb={4}
        alignItems='flex-start'
        justifyContent='space-between'
        gap={containerGap}
      >
        <Flex
          alignItems='center'
          flexDir={containerInnerFlexDir}
          gap={4}
          gridColumn={profileGridColumn}
        >
          <ProfileAvatar />
          <Flex flexDir={balanceFlexDir} alignItems={portfolioTextAlignment}>
            <Text fontWeight='medium' translation='defi.netWorth' color='text.subtle' />
            <Skeleton isLoaded={!isPortfolioLoading && !isOpportunitiesLoading}>
              <Amount.Fiat
                lineHeight='shorter'
                value={netWorth}
                fontSize={balanceFontSize}
                fontWeight='semibold'
              />
            </Skeleton>
          </Flex>
        </Flex>
        <Flex
          gridColumn={3}
          gap={4}
          flexWrap={'wrap'}
          justifyContent={'center'}
          display={buttonGroupDisplay}
        >
          <Button isDisabled={!isConnected} onClick={handleQrCodeClick} leftIcon={qrCodeIcon}>
            {translate('modals.send.qrCode')}
          </Button>
          <Button isDisabled={!isConnected} onClick={handleSendClick} leftIcon={arrowUpIcon}>
            {translate('common.send')}
          </Button>
          <Button isDisabled={!isConnected} onClick={handleReceiveClick} leftIcon={arrowDownIcon}>
            {translate('common.receive')}
          </Button>
          <Button onClick={handleTradeClick} leftIcon={ioSwapVerticalSharpIcon}>
            {translate('navBar.tradeShort')}
          </Button>
        </Flex>
        <Flex
          justifyContent='flex-end'
          alignItems='flex-start'
          gridColumn={3}
          display={ButtonRowDisplay}
        >
          <IconButton isRound icon={moreIcon} aria-label='Settings' onClick={onOpen} />
        </Flex>
        <Drawer isOpen={isOpen} onClose={onClose} placement='left'>
          <DrawerOverlay />
          <DrawerContent
            paddingTop='env(safe-area-inset-top)'
            paddingBottom='max(1rem, env(safe-area-inset-top))'
            overflowY='auto'
          >
            <SideNavContent onClose={onClose} />
          </DrawerContent>
        </Drawer>
      </Container>
    )
  },
)
