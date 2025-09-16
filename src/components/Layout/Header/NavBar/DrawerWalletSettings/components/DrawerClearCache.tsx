import { Box, Button, Flex, Icon, Stack, Tooltip } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'
import { reloadWebview } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from '@/lib/globals'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistory, txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { persistor, useAppDispatch, useAppSelector } from '@/state/store'

const ClearCacheButton = ({
  label,
  tooltipText,
  onClick,
}: {
  label: string
  tooltipText: string
  onClick: () => void
}) => {
  return (
    <Button width='full' justifyContent='flexStart' pl={8} variant='ghost' onClick={onClick}>
      <Flex alignItems='center' textAlign='left'>
        <Flex ml={4}>
          <RawText>{label}</RawText>
          <Tooltip label={tooltipText}>
            <Box ml={1}>
              <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
            </Box>
          </Tooltip>
        </Flex>
      </Flex>
    </Button>
  )
}

export const DrawerClearCache = () => {
  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')
  const dispatch = useAppDispatch()
  const requestedAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const translate = useTranslate()
  const { disconnect } = useWallet()

  const handleClearCacheClick = useCallback(async () => {
    try {
      // First disconnect the wallet so the mobile users won't be asked for a password because of the WalletProvider effects
      if (isMobileApp) {
        disconnect()
      }
      // clear store
      await persistor.purge()
      // reload the page
      isMobileApp ? reloadWebview() : window.location.reload()
    } catch (e) {}
  }, [disconnect])

  const handleClearTxHistory = useCallback(() => {
    dispatch(txHistory.actions.clear())
    dispatch(txHistoryApi.util.resetApiState())

    if (isLazyTxHistoryEnabled) return

    requestedAccountIds.forEach(requestedAccountId =>
      dispatch(txHistoryApi.endpoints.getAllTxHistory.initiate(requestedAccountId)),
    )
  }, [dispatch, requestedAccountIds, isLazyTxHistoryEnabled])

  return (
    <Stack width='full' p={0} spacing={2}>
      <ClearCacheButton
        label={translate('modals.settings.clearCache')}
        tooltipText={translate('modals.settings.clearCacheTooltip')}
        onClick={handleClearCacheClick}
      />
      <ClearCacheButton
        label={translate('modals.settings.clearTxHistory')}
        tooltipText={translate('modals.settings.clearTxHistoryTooltip')}
        onClick={handleClearTxHistory}
      />
    </Stack>
  )
}
