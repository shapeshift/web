import type { CardProps } from '@chakra-ui/react'
import { Button, Card, CardBody, Divider, Flex, Icon, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { TbAlertTriangle } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from '@/state/store'

type SpamWarningBannerProps = {
  assetId: AssetId
} & CardProps

export const SpamWarningBanner: React.FC<SpamWarningBannerProps> = ({ assetId, ...cardProps }) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const handleReportAsNotSpam = useCallback(() => {
    dispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
  }, [assetId, dispatch])

  return (
    <Card
      color='black'
      bg='yellow.500'
      border='1px solid'
      rounded='lg'
      borderColor='yellow.600'
      {...cardProps}
    >
      <CardBody padding={0}>
        <Stack>
          <Flex alignItems='center' gap={2} mb={2}>
            <Icon as={TbAlertTriangle} fontSize='2xl' />
            <RawText fontWeight='medium' fontSize='sm'>
              {translate('assets.spam.warning')}
            </RawText>
          </Flex>
          <Divider />
          <Button
            size='sm'
            width='full'
            borderRadius='none'
            colorScheme='black'
            variant='ghost'
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
