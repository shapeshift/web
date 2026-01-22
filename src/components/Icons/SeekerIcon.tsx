import { createIcon } from '@chakra-ui/react'

// Solana Seeker wallet icon
export const SeekerIcon = createIcon({
  displayName: 'SeekerIcon',
  path: (
    <svg viewBox='0 0 128 128' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient
          id='seeker-gradient'
          x1='0%'
          y1='0%'
          x2='100%'
          y2='100%'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#9945FF' />
          <stop offset='50%' stopColor='#14F195' />
          <stop offset='100%' stopColor='#00D1FF' />
        </linearGradient>
      </defs>
      <circle cx='64' cy='64' r='60' fill='url(#seeker-gradient)' />
      <path
        d='M94.5 55.5L64 86L33.5 55.5L40.5 48.5L64 72L87.5 48.5L94.5 55.5Z'
        fill='white'
      />
      <path d='M94.5 42L64 72.5L33.5 42L40.5 35L64 58.5L87.5 35L94.5 42Z' fill='white' />
    </svg>
  ),
  viewBox: '0 0 128 128',
})
