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
import { chainIdToFeeAssetId } from '@shapeshiftoss/utils'
import { useQueryClient } from '@tanstack/react-query'
import { isEmpty, uniq } from 'lodash'
import { memo, useCallback, useMemo, useState } from 'react'
import { IoMdRefresh } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { RawText, Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isSome } from '@/lib/utils'
import { accountIdToFeeAssetId } from '@/lib/utils/accounts'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectAssets, selectPortfolioErroredAccountIds } from '@/state/slices/selectors'
import { useAppDispatch } from '@/state/store'

const warningIcon = <WarningIcon />
const idMdRefreshIcon = <IoMdRefresh />

export const DegradedStateBanner = memo(() => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const footerBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const buttonBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const assets = useSelector(selectAssets)
  const erroredAccountIds = useSelector(selectPortfolioErroredAccountIds)
  const { degradedChainIds, isFetching: isDiscoverAccountsFetching } = useDiscoverAccounts()
  const { isSnapInstalled } = useIsSnapInstalled()
  const { deviceId } = useWallet().state
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const erroredChainIds = useMemo(() => {
    const erroredChains = uniq(
      degradedChainIds.filter(isSome).reduce(
        (acc, chainId) => {
          if (!chainId) return acc

          const feeAssetId = assets[chainIdToFeeAssetId(chainId)]

          if (!feeAssetId) return acc

          acc.push({
            name: feeAssetId.networkName ?? feeAssetId.name,
            icon: feeAssetId.networkIcon ?? feeAssetId.icon,
          })

          return acc
        },
        [] as { name: string | undefined; icon: string | undefined }[],
      ),
    )

    return {
      names: erroredChains.map(chain => chain.name),
      icons: erroredChains.map(chain => chain.icon),
    }
  }, [degradedChainIds, assets])

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
        return assets[feeAssetId]?.networkIcon ?? assets[feeAssetId]?.icon ?? ''
      }),
    )
    return { names, icons }
  }, [assets, erroredAccountIds])

  const erroredChains = useMemo(() => {
    return {
      names: uniq([...erroredChainIds.names, ...erroredAccounts.names]),
      icons: uniq([...erroredChainIds.icons, ...erroredAccounts.icons]),
    }
  }, [erroredChainIds, erroredAccounts.names, erroredAccounts.icons])

  const handleOpen = useCallback(() => setIsOpen(true), [])
  const handleClose = useCallback(() => setIsOpen(false), [])

  const handleRetry = useCallback(() => {
    degradedChainIds.forEach(chainId => {
      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts', { deviceId, isSnapInstalled }, chainId],
      })
    })

    if (erroredAccountIds.length > 0) {
      dispatch(
        portfolioApi.endpoints.getAccountsBatch.initiate(
          { accountIds: erroredAccountIds },
          { forceRefetch: true },
        ),
      )
    }
  }, [dispatch, erroredAccountIds, deviceId, isSnapInstalled, degradedChainIds, queryClient])

  const renderIcons = useMemo(() => {
    return (
      <Flex gap={2} flexWrap='wrap'>
        {erroredChains.icons.map((icon, index) => (
          <Tag
            key={`account-icon-${index}`}
            py={1}
            height='auto'
            alignItems='center'
            fontSize='sm'
            gap={2}
          >
            <LazyLoadAvatar src={icon} size='2xs' />
            <RawText>{erroredChains.names[index]}</RawText>
          </Tag>
        ))}
      </Flex>
    )
  }, [erroredChains])

  if (!erroredChains?.names?.length) return null

  return (
    <Popover isOpen={isOpen} onOpen={handleOpen} onClose={handleClose}>
      <PopoverTrigger>
        <IconButton
          variant='ghost-filled'
          colorScheme='yellow'
          aria-label={translate('common.degradedState')}
          icon={warningIcon}
        />
      </PopoverTrigger>
      {isOpen && (
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
              leftIcon={idMdRefreshIcon}
              onClick={handleRetry}
              size='sm'
              borderRadius='lg'
              width='full'
              isLoading={isDiscoverAccountsFetching}
            >
              {translate('errorPage.cta')}
            </Button>
          </PopoverFooter>
        </PopoverContent>
      )}
    </Popover>
  )
})
