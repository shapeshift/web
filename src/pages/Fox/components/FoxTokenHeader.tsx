import { ArrowUpIcon } from '@chakra-ui/icons'
import type { FlexProps, StackProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useEffect } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { RewardsIcon } from 'components/Icons/RewardsIcon'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

const arrowUpIcon = <ArrowUpIcon />
const rewardsIcon = <RewardsIcon />
const faCreditCardIcon = <FaCreditCard />

const columnsProps = {
  base: 1,
  sm: 2,
  md: 4,
}
const stackProps: StackProps = {
  width: '100%',
  flexDir: 'column',
  flex: 1,
  spacing: 0,
}

const containerProps: FlexProps = {
  py: 4,
  alignItems: 'center',
  justifyContent: 'space-between',
  flexDir: {
    base: 'column',
    md: 'row',
  },
}

export const FoxTokenHeader = () => {
  const { assetId, assetAccountId } = useFoxPageContext()
  const appDispatch = useAppDispatch()

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  const send = useModal('send')
  const fiatRamps = useModal('fiatRamps')
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const history = useHistory()

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )

  const handleSendClick = useCallback(
    () =>
      isConnected ? send.open({ assetId, accountId: assetAccountId }) : handleWalletModalOpen(),
    [assetAccountId, assetId, handleWalletModalOpen, isConnected, send],
  )

  const handleBuyClick = useCallback(() => {
    fiatRamps.open({
      assetId,
      fiatRampAction: FiatRampAction.Buy,
      accountId: assetAccountId,
    })
  }, [assetAccountId, assetId, fiatRamps])

  const handleStakeClick = useCallback(() => {
    history.push('/rfox')
  }, [history])

  useEffect(() => {
    appDispatch(marketApi.endpoints.findByAssetId.initiate(assetId))
  }, [marketData, assetId, appDispatch])

  return (
    <Flex {...containerProps}>
      <SimpleGrid my={4} columns={columnsProps} spacing='26px' width='100%'>
        <Stack {...stackProps}>
          <Text
            fontSize='md'
            color='text.subtle'
            fontWeight='medium'
            translation='plugins.foxPage.currentPrice'
            mb={1}
          />
          <Skeleton isLoaded={true}>
            <Amount.Fiat fontSize='2xl' value={marketData?.price ?? '0'} />
          </Skeleton>
        </Stack>

        <Stack {...stackProps}>
          <Text
            fontSize='md'
            color='text.subtle'
            fontWeight='medium'
            translation='foxPage.24hrPriceChange'
            mb={1}
          />
          <Skeleton isLoaded={true}>
            <Amount.Percent
              fontSize='2xl'
              value={bnOrZero(marketData?.changePercent24Hr)
                .div(100)
                .toFixed()}
              color={
                bnOrZero(marketData?.changePercent24Hr).isGreaterThan(0) ? 'green.500' : 'red.500'
              }
            />
          </Skeleton>
        </Stack>

        <Stack {...stackProps}>
          <Text
            fontSize='md'
            color='text.subtle'
            fontWeight='medium'
            translation='dashboard.portfolio.marketCap'
            mb={1}
          />
          <Skeleton isLoaded={true}>
            <Amount.Fiat fontSize='2xl' value={marketData?.marketCap ?? '0'} />
          </Skeleton>
        </Stack>

        <Stack {...stackProps}>
          <Text
            fontSize='md'
            color='text.subtle'
            fontWeight='medium'
            translation='assets.assetDetails.assetHeader.24HrVolume'
            mb={1}
          />
          <Skeleton isLoaded={true}>
            <Amount.Fiat fontSize='2xl' value={marketData?.volume ?? '0'} />
          </Skeleton>
        </Stack>
      </SimpleGrid>

      <Flex alignItems='center'>
        <Button
          mx={2}
          variant='solid'
          size='sm'
          leftIcon={faCreditCardIcon}
          onClick={handleBuyClick}
        >
          <Text translation='assets.assetCards.assetActions.buy' />
        </Button>

        <Button mx={2} variant='solid' size='sm' leftIcon={arrowUpIcon} onClick={handleSendClick}>
          <Text translation='common.send' />
        </Button>

        <Button
          mx={2}
          variant='solid'
          size='sm'
          colorScheme='blue'
          leftIcon={rewardsIcon}
          onClick={handleStakeClick}
        >
          <Text translation='defi.stake' />
        </Button>
      </Flex>
    </Flex>
  )
}
