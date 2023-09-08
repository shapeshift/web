import { WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  IconButton,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { entries, isEmpty, uniq } from 'lodash'
import { useCallback, useMemo } from 'react'
import { IoMdRefresh } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText, Text } from 'components/Text'
import { portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssets, selectPortfolioLoadingStatusGranular } from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

export const DegradedStateBanner = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const footerBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const buttonBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const portfolioLoadingStatusGranular = useSelector(selectPortfolioLoadingStatusGranular)
  const assets = useSelector(selectAssets)

  const erroredAccountIds = useMemo(() => {
    return entries(portfolioLoadingStatusGranular).reduce<AccountId[]>(
      (acc, [accountId, accountState]) => {
        accountState === 'error' && acc.push(accountId)
        return acc
      },
      [],
    )
  }, [portfolioLoadingStatusGranular])

  const erroredAccounts = useMemo(() => {
    const initial = { names: [], icons: [] }
    if (isEmpty(assets)) return initial
    if (!erroredAccountIds.length) return initial // yay
    // we can have multiple accounts with the same name, dont show 'Bitcoin, Bitcoin, Bitcoin'
    const names = uniq(
      erroredAccountIds.map((accountId: AccountId) => {
        const feeAssetId = accountIdToFeeAssetId(accountId ?? '') ?? ''
        return assets[feeAssetId]?.networkName ?? assets[feeAssetId]?.name ?? ''
      }),
    )
    const icons = uniq(
      erroredAccountIds.map((accountId: AccountId) => {
        const feeAssetId = accountIdToFeeAssetId(accountId ?? '') ?? ''
        return assets[feeAssetId]?.icon ?? assets[feeAssetId]?.icon ?? ''
      }),
    )
    return { names, icons }
  }, [assets, erroredAccountIds])

  const handleRetry = useCallback(() => {
    erroredAccountIds.forEach(accountId =>
      dispatch(
        portfolioApi.endpoints.getAccount.initiate(
          { accountId, upsertOnFetch: true },
          { forceRefetch: true },
        ),
      ),
    )
  }, [dispatch, erroredAccountIds])

  const renderIcons = useMemo(() => {
    return (
      <Flex gap={2} flexWrap='wrap'>
        {erroredAccounts.icons.map((icon, index) => (
          <Tag
            key={`account-icon-${index}`}
            py={1}
            height='auto'
            alignItems='center'
            fontSize='sm'
            gap={2}
          >
            <LazyLoadAvatar src={icon} size='2xs' />
            <RawText>{erroredAccounts.names[index]}</RawText>
          </Tag>
        ))}
      </Flex>
    )
  }, [erroredAccounts])

  if (!erroredAccounts?.names?.length) return null

  return (
    <Popover>
      <PopoverTrigger>
        <IconButton
          variant='ghost-filled'
          colorScheme='yellow'
          aria-label='Degraded State'
          icon={<WarningIcon />}
        />
      </PopoverTrigger>
      <PopoverContent overflow='hidden'>
        <PopoverCloseButton />
        <PopoverHeader fontWeight='bold' borderWidth={0} pt={4} px={4} pb={2}>
          <Text translation='common.degradedState' />
        </PopoverHeader>
        <PopoverBody display='flex' flexDir='column' gap={4} px={4} pb={4} pt={0}>
          <Text color='text.subtle' translation='common.accountError' />
          {renderIcons}
        </PopoverBody>
        <PopoverFooter borderWidth={0} bg={footerBg} p={4}>
          <Button
            bg={buttonBg}
            leftIcon={<IoMdRefresh />}
            onClick={handleRetry}
            size='sm'
            borderRadius='lg'
            width='full'
          >
            {translate('errorPage.cta')}
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  )
}
