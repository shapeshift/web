import { Box, Button, Flex, ModalCloseButton, Textarea } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { requestStoreReview } from '../context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useModal } from '../hooks/useModal/useModal'
import { useSendDiscordWebhook } from '../hooks/useSendDiscordWebhook'
import { isMobile } from '../lib/globals'
import { getMixPanel } from '../lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '../lib/mixpanel/types'
import { captureExceptionWithContext } from '../utils/sentry/helpers'
import { FoxIcon } from './Icons/FoxIcon'
import { Dialog } from './Modal/components/Dialog'
import { StarRating } from './StarRating/StarRating'
import { Text } from './Text'

import { useNotificationToast } from '@/hooks/useNotificationToast'

const FEEDBACK_DISCORD_CHANNEL_URI =
  'https://discord.com/api/webhooks/1405155259898265620/AvtQbvanqdqjjf-DFq0tn_qfwFUiwLxkF7YeUqWKf-tpuittEeStLgxPMXrbOaPtItWk'

// const getRatingColor = (rating: number): number => {
//   switch (rating) {
//     case 1:
//       return 0xff0000 // Red
//     case 2:
//       return 0xff6600 // Orange
//     case 3:
//       return 0xffcc00 // Yellow
//     case 4:
//       return 0x00cc00 // Light Green
//     case 5:
//       return 0x00ff00 // Green
//     default:
//       return 0x808080 // Gray
//   }
// }

// const getRatingText = (rating: number): string => {
//   switch (rating) {
//     case 1:
//       return 'Very Poor'
//     case 2:
//       return 'Poor'
//     case 3:
//       return 'Average'
//     case 4:
//       return 'Good'
//     case 5:
//       return 'Excellent'
//     default:
//       return 'Not Rated'
//   }
// }

export const RatingModal = () => {
  const { isOpen, close } = useModal('rating')
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const translate = useTranslate()
  const { isPending, isSuccess } = useSendDiscordWebhook({
    uri: FEEDBACK_DISCORD_CHANNEL_URI,
  })
  const mixpanel = useMemo(() => getMixPanel(), [])

  const isFiveStarRating = useMemo(() => rating === 5, [rating])
  const showFeedbackForm = useMemo(() => rating > 0 && rating < 5, [rating])
  const toast = useNotificationToast()

  const handleRatingChange = useCallback(
    async (newRating: number) => {
      if (newRating === 5) {
        // Track 5-star rating in MixPanel
        mixpanel?.track(MixPanelEvent.FiveStarRating, {
          platform: isMobile ? 'Mobile App' : 'Web App',
        })

        if (isMobile) {
          try {
            const hasSentReview = await requestStoreReview()

            if (hasSentReview) {
              toast({
                title: translate('common.feedbackSubmitted'),
                description: translate('common.thankYouForYourFeedback'),
                status: 'success',
              })
            }
          } catch (error) {
            // Capture error to Sentry if store review fails
            captureExceptionWithContext(error, {
              tags: {
                feature: 'rating-modal',
                action: 'request-store-review',
              },
              extra: {
                platform: 'mobile',
                rating: newRating,
              },
              level: 'error',
            })

            console.error('Failed to request store review:', error)

            // Still show success message to user - the rating was recorded
            toast({
              title: translate('common.feedbackSubmitted'),
              description: translate('common.thankYouForYourFeedback'),
              status: 'success',
            })
          }
          close()
          return
        }

        toast({
          title: translate('common.feedbackSubmitted'),
          description: translate('common.thankYouForYourFeedback'),
          status: 'success',
        })
        close()
      }

      // Remove me when we get back the feedback gathering feature on
      toast({
        title: translate('common.feedbackSubmitted'),
        description: translate('common.thankYouForYourFeedback'),
        status: 'success',
      })
      close()

      setRating(newRating)
    },
    [close, toast, translate, mixpanel],
  )

  const handleFeedbackChange = useCallback((value: string) => {
    setFeedback(value)
  }, [])

  // const handleSubmit = useCallback(() => {
  // We disabled that for now as we need a proxy to send the feedback to the Discord webhook
  // using authentication so we ensure the feedback is coming from a legitimate user
  // const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
  // const ratingText = getRatingText(rating)
  // const color = getRatingColor(rating)
  // const embed = {
  //   title: `New User Feedback Received`,
  //   description: `A user has provided feedback about their experience with ShapeShift.`,
  //   color,
  //   fields: [
  //     {
  //       name: '📊 Rating',
  //       value: `${stars} (${rating}/5)\n**${ratingText}**`,
  //       inline: true,
  //     },
  //     {
  //       name: '📝 Feedback',
  //       value: feedback,
  //       inline: false,
  //     },
  //     {
  //       name: '📱 Platform',
  //       value: isMobile ? 'Mobile App' : 'Web App',
  //       inline: true,
  //     },
  //     {
  //       name: '🕒 Submitted',
  //       value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
  //       inline: true,
  //     },
  //   ],
  // }
  // sendFeedback({
  //   embeds: [embed],
  //   username: 'ShapeShift Feedback Bot',
  //   avatar_url: 'https://shapeshift.com/favicon.ico',
  // })
  // }, [])

  const handleMaybeLater = useCallback(() => {
    close()
  }, [close])

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: translate('common.feedbackSubmitted'),
        description: translate('common.thankYouForYourFeedback'),
        status: 'success',
        position: isMobile ? 'top' : 'bottom-right',
      })
      close()
    }
  }, [isSuccess, close, toast, translate])

  const getButtonText = useMemo(() => {
    if (isFiveStarRating) return 'common.leaveUsAReview'
    if (showFeedbackForm) return 'common.sendFeedback'
    return 'common.leaveUsAReview'
  }, [isFiveStarRating, showFeedbackForm])

  const isButtonDisabled = useMemo(() => {
    if (isFiveStarRating) return false
    if (showFeedbackForm) return !feedback.trim()
    return true
  }, [isFiveStarRating, showFeedbackForm, feedback])

  return (
    <Dialog isOpen={isOpen} onClose={close} height='auto'>
      <Box p={4} pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom) + 16px)'>
        {!isMobile && <ModalCloseButton />}
        <Flex justify='center' align='center' h='100%' flexDir='column' mb={4}>
          <Flex
            bg='blue.500'
            height='60px'
            width='64px'
            borderRadius='10'
            align='center'
            justify='center'
            mb={2}
          >
            <FoxIcon boxSize='32px' />
          </Flex>
          <Text translation='common.howWasYourExperience' color='text.primary' fontWeight='bold' />

          <Box mt={6}>
            <StarRating rating={rating} onRatingChange={handleRatingChange} />
          </Box>
        </Flex>

        {showFeedbackForm && (
          <Box mt={6}>
            <Textarea
              placeholder={translate('common.letUsKnowHowWeCanImprove')}
              value={feedback}
              onChange={e => handleFeedbackChange(e.target.value)}
              size='lg'
              minH='120px'
              resize='vertical'
              bg={isMobile ? 'background.surface.base.default' : undefined}
              borderColor='border.base'
            />
          </Box>
        )}

        <Box mt={10} gap={3}>
          {showFeedbackForm && (
            <Button
              variant='solid'
              colorScheme='blue'
              size='lg'
              width='full'
              isDisabled={isButtonDisabled}
              isLoading={isPending}
              mb={2}
            >
              <Text translation={getButtonText} color='white' />
            </Button>
          )}

          <Button
            variant='solid'
            colorScheme='gray'
            size='lg'
            width='full'
            onClick={handleMaybeLater}
          >
            <Text translation='common.maybeLater' color='text.primary' />
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
