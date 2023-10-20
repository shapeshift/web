import { ExternalLinkIcon } from '@chakra-ui/icons'
import { IconButton, Link } from '@chakra-ui/react'

const externalLinkIcon = <ExternalLinkIcon />

export const ExternalLinkButton = ({ href, ariaLabel }: { href: string; ariaLabel?: string }) => (
  <Link href={href} isExternal>
    <IconButton
      icon={externalLinkIcon}
      variant='ghost'
      size='small'
      aria-label={ariaLabel ?? ''}
      p={2}
      colorScheme='gray'
    />
  </Link>
)
