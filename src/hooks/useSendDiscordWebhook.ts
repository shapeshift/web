import { useMutation } from '@tanstack/react-query'
import axios from 'axios'

type DiscordEmbed = {
  title?: string
  description?: string
  color?: number
  fields?: {
    name: string
    value: string
    inline?: boolean
  }[]
  footer?: {
    text: string
    icon_url?: string
  }
  timestamp?: string
  thumbnail?: {
    url: string
  }
}

type DiscordWebhookPayload = {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

type UseSendDiscordWebhookProps = {
  uri: string
}

export const useSendDiscordWebhook = ({ uri }: UseSendDiscordWebhookProps) => {
  const {
    mutate: sendFeedback,
    isPending,
    isError,
    isSuccess,
    error,
  } = useMutation({
    mutationFn: (payload: DiscordWebhookPayload) => {
      return axios(uri, {
        method: 'POST',
        data: payload,
      })
    },
  })

  return { sendFeedback, isPending, isError, error, isSuccess }
}
