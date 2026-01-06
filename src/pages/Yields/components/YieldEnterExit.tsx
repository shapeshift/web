import {
  Box,
  Button,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router-dom'

import { AssetInput } from '@/components/DeFi/components/AssetInput'
import type { AugmentedYieldBalance, AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { YieldActionModal } from '@/pages/Yields/components/YieldActionModal'
import { useYieldBalances } from '@/react-queries/queries/yieldxyz/useYieldBalances'
import {
  selectFirstAccountIdByChainId,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldEnterExitProps = {
  yieldItem: AugmentedYieldDto
}

const percentOptions = [0.25, 0.5, 0.75, 1]

export const YieldEnterExit = ({ yieldItem }: YieldEnterExitProps) => {
  const translate = useTranslate()
  const location = useLocation()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const initialTab = useMemo(() => {
    if (location.pathname.endsWith('/exit')) return 1
    if (location.pathname.endsWith('/enter')) return 0
    return 0
  }, [location.pathname])

  const [tabIndex, setTabIndex] = useState(initialTab)
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'enter' | 'exit'>('enter')

  const { chainId } = yieldItem
  const accountId = useAppSelector(state =>
    chainId ? selectFirstAccountIdByChainId(state, chainId) : undefined,
  )
  const address = accountId ? fromAccountId(accountId).account : undefined

  const inputToken = yieldItem.inputTokens[0]
  const inputTokenAssetId = inputToken?.assetId

  const inputTokenBalance = useAppSelector(state =>
    inputTokenAssetId && accountId
      ? selectPortfolioCryptoPrecisionBalanceByFilter(state, {
          assetId: inputTokenAssetId,
          accountId,
        })
      : '0',
  )

  const { data: balances } = useYieldBalances({
    yieldId: yieldItem.id,
    address: address ?? '',
    chainId,
  })

  const extractBalance = (type: YieldBalanceType) =>
    balances?.find((b: AugmentedYieldBalance) => b.type === type)
  const activeBalance = extractBalance(YieldBalanceType.Active)
  const withdrawableBalance = extractBalance(YieldBalanceType.Withdrawable)
  const exitBalance = activeBalance?.amount ?? withdrawableBalance?.amount ?? '0'

  const handlePercentClick = useCallback(
    (percent: number) => {
      const balance = tabIndex === 0 ? inputTokenBalance : exitBalance
      const percentAmount = parseFloat(balance) * percent
      setCryptoAmount(percentAmount.toString())
    },
    [inputTokenBalance, exitBalance, tabIndex],
  )

  const handleMaxClick = useCallback(async () => {
    await Promise.resolve()
    const balance = tabIndex === 0 ? inputTokenBalance : exitBalance
    setCryptoAmount(balance)
  }, [inputTokenBalance, exitBalance, tabIndex])

  const handleEnterClick = useCallback(() => {
    setModalAction('enter')
    setIsModalOpen(true)
  }, [])

  const handleExitClick = useCallback(() => {
    setModalAction('exit')
    setIsModalOpen(true)
  }, [])

  return (
    <>
      <Box
        bg={cardBg}
        borderRadius='xl'
        shadow='sm'
        border='1px solid'
        borderColor={borderColor}
        overflow='hidden'
      >
        <Tabs
          index={tabIndex}
          onChange={setTabIndex}
          isFitted
          variant='enclosed'
          borderBottomWidth={0}
        >
          <TabList mb='0' borderBottom='1px solid' borderColor={borderColor} bg='blackAlpha.200'>
            <Tab
              _selected={{
                color: 'blue.400',
                bg: cardBg,
                borderBottomColor: cardBg,
                borderTopColor: 'blue.400',
                borderTopWidth: 2,
              }}
              _focus={{ boxShadow: 'none' }}
              fontWeight='bold'
              py={4}
              borderBottomWidth='1px'
              borderRadius={0}
              borderTopWidth='2px'
              borderTopColor='transparent'
              isDisabled={!yieldItem.status.enter}
              opacity={!yieldItem.status.enter ? 0.5 : 1}
            >
              {translate('yieldXYZ.enter')}
            </Tab>
            <Tab
              _selected={{
                color: 'blue.400',
                bg: cardBg,
                borderBottomColor: cardBg,
                borderTopColor: 'blue.400',
                borderTopWidth: 2,
              }}
              _focus={{ boxShadow: 'none' }}
              fontWeight='bold'
              py={4}
              borderBottomWidth='1px'
              borderRadius={0}
              borderTopWidth='2px'
              borderTopColor='transparent'
              isDisabled={!yieldItem.status.exit}
              opacity={!yieldItem.status.exit ? 0.5 : 1}
            >
              {translate('yieldXYZ.exit')}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={8}>
              <Flex direction='column' gap={2}>
                <AssetInput
                  accountId={accountId}
                  assetId={inputTokenAssetId ?? ''}
                  assetSymbol={inputToken?.symbol ?? ''}
                  assetIcon={yieldItem.metadata.logoURI}
                  cryptoAmount={cryptoAmount}
                  showFiatAmount={false}
                  balance={inputTokenBalance}
                  percentOptions={percentOptions}
                  onChange={setCryptoAmount}
                  onPercentOptionClick={handlePercentClick}
                  onMaxClick={handleMaxClick}
                />

                <Button
                  colorScheme='blue'
                  size='lg'
                  width='full'
                  height='56px'
                  fontSize='lg'
                  isDisabled={!yieldItem.status.enter || !cryptoAmount}
                  onClick={handleEnterClick}
                  _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                >
                  {translate('yieldXYZ.enter')}
                </Button>
              </Flex>
            </TabPanel>

            <TabPanel p={8}>
              <Flex direction='column' gap={2}>
                <AssetInput
                  accountId={accountId}
                  assetId={inputTokenAssetId ?? ''}
                  assetSymbol={yieldItem.token.symbol}
                  assetIcon={yieldItem.metadata.logoURI}
                  cryptoAmount={cryptoAmount}
                  showFiatAmount={false}
                  balance={exitBalance}
                  percentOptions={percentOptions}
                  onChange={setCryptoAmount}
                  onPercentOptionClick={handlePercentClick}
                  onMaxClick={handleMaxClick}
                />

                <Button
                  colorScheme='blue'
                  size='lg'
                  width='full'
                  height='56px'
                  fontSize='lg'
                  isDisabled={!yieldItem.status.exit || !cryptoAmount}
                  onClick={handleExitClick}
                  _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
                >
                  {translate('yieldXYZ.exit')}
                </Button>
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <YieldActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        yieldItem={yieldItem}
        action={modalAction}
        amount={cryptoAmount}
        assetSymbol={modalAction === 'enter' ? inputToken?.symbol ?? '' : yieldItem.token.symbol}
      />
    </>
  )
}
