export const AVATAR_SIZES = {
  '2xs': '1rem',
  xs: '1.5rem',
  sm: '2rem',
  md: '2.5rem',
  lg: '3.5rem',
  xl: '4rem',
  '2xl': '5rem',
} as const

export type AvatarSize = keyof typeof AVATAR_SIZES

export const AvatarStyle = {
  sizes: {
    md: {
      container: {
        '--avatar-size': AVATAR_SIZES.md,
      },
    },
    lg: {
      container: {
        '--avatar-size': AVATAR_SIZES.lg,
      },
    },
  },
  defaultProps: {
    size: 'md',
    variant: 'elevated',
  },
}
