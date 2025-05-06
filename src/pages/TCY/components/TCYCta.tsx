import { Alert, AlertDescription, AlertTitle, Button, Stack } from '@chakra-ui/react'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'

const margin = { base: 4, md: 0 }

export const TCYCta = () => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  return (
    <Alert status='info' m={margin} width='auto'>
      <AssetIcon assetId={tcyAssetId} />
      <Stack spacing={0} ml={4}>
        <AlertTitle>{translate('TCY.cta.title')}</AlertTitle>
        <AlertDescription>
          <RawText color='text.subtle'>{translate('TCY.cta.body')}</RawText>
        </AlertDescription>
      </Stack>
      <Button ml='auto' flexShrink={0} onClick={handleClick}>
        {translate('TCY.cta.button')}
      </Button>
    </Alert>
  )
}
