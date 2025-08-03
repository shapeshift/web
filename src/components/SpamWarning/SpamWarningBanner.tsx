import { WarningIcon } from '@chakra-ui/icons'
import { Button, Card, CardBody, Flex, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from '@/state/store'

const warningIcon = <WarningIcon />

type SpamWarningBannerProps = {
  assetId: AssetId
}

export const SpamWarningBanner: React.FC<SpamWarningBannerProps> = ({ assetId }) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const handleReportAsNotSpam = useCallback(() => {
    dispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
  }, [assetId, dispatch])

  return (
    <Card
      borderRadius='lg'
      bg='yellow.500'
      color='black'
      border='1px solid'
      borderColor='yellow.600'
      mb={4}
    >
      <CardBody px={4} py={3}>
        <Stack spacing={3}>
          <Flex alignItems='center' gap={2}>
            {warningIcon}
            <RawText fontWeight='medium' fontSize='sm'>
              {translate('assets.spamWarning.message')}
            </RawText>
          </Flex>
          <Button
            size='sm'
            colorScheme='blackAlpha'
            variant='solid'
            onClick={handleReportAsNotSpam}
            alignSelf='flex-start'
          >
            {translate('common.reportAsNotSpam')}
          </Button>
        </Stack>
      </CardBody>
    </Card>
  )
}

