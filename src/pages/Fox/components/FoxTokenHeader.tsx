import { ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Flex, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { FaCreditCard } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { RewardsIcon } from 'components/Icons/RewardsIcon'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxPageContext } from '../hooks/useFoxPageContext'

const arrowUpIcon = <ArrowUpIcon />
const rewardsIcon = <RewardsIcon />
const faCreditCardIcon = <FaCreditCard />

const columnsProps = {
  base: 1,
  sm: 2,
  md: 4,
}

export const FoxTokenHeader = () => {
  const { assetId, selectedAssetAccountId } = useFoxPageContext()
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
      isConnected
        ? send.open({ assetId, accountId: selectedAssetAccountId })
        : handleWalletModalOpen(),
    [selectedAssetAccountId, assetId, handleWalletModalOpen, isConnected, send],
  )

  const handleBuySellClick = useCallback(() => {
    fiatRamps.open({
      assetId,
      fiatRampAction: FiatRampAction.Buy,
      accountId: selectedAssetAccountId,
    })
  }, [selectedAssetAccountId, assetId, fiatRamps])

  const handleStakeClick = useCallback(() => {
    history.push('/rfox')
  }, [history])

  return (
    <Flex py={8} alignItems='center' justifyContent='space-between'>
      <SimpleGrid columns={columnsProps} spacing='26px' width='100%'>
        <Stack spacing={0} flex={1} flexDir={'column'}>
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

        <Stack spacing={0} flex={1} flexDir={'column'}>
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

        <Stack spacing={0} flex={1} flexDir={'column'}>
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

        <Stack spacing={0} flex={1} flexDir={'column'}>
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
          onClick={handleBuySellClick}
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
