import { useColorModeValue } from '@chakra-ui/system'
import { getColor } from '@chakra-ui/theme-tools'
import { theme } from 'theme/theme'

export const GraphLoading = () => {
  const speed = '0.8s'
  const startColor = useColorModeValue('gray.100', 'gray.600')
  const endColor = useColorModeValue('white', 'gray.700')

  const start = getColor(theme, startColor)
  const end = getColor(theme, endColor)

  const bgColor = useColorModeValue('white', 'gray.785')
  const bg = getColor(theme, bgColor)

  return (
    <>
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 766 300'>
        <defs>
          <linearGradient id='linear-gradient'>
            <stop offset='0%' stop-color={end} />
            <stop offset='33%' stop-color={end} />
            <stop offset='50%' stop-color={start} />
            <stop offset='67%' stop-color={end} />
            <stop offset='100%' stop-color={end} />
            <animateTransform
              attributeName='gradientTransform'
              type='translate'
              from='-1 0'
              to='1 0'
              begin='0s'
              dur='2s'
              repeatCount='indefinite'
            />
          </linearGradient>
          <linearGradient id='area' x1='50%' y1='-104.497044%' x2='50%' y2='85.1203676%'>
            <stop offset='0%' stop-color={start} />
            <stop offset='100%' stop-color={bg} />
          </linearGradient>
        </defs>
        <g fill='none' fillRule='evenodd' className='graph-example'>
          <path
            d='m0 113.767 7.192-6.25c22.34-19.411 56.186-17.038 75.598 5.302a53.587 53.587 0 0 1 5.674 7.869l6.671 11.279c9.695 16.391 30.842 21.82 47.234 12.125a34.482 34.482 0 0 0 9.869-8.774l11.766-15.436c7.005-9.19 20.134-10.96 29.323-3.955a20.922 20.922 0 0 1 5.279 5.913l.267.46c6.449 11.452 20.96 15.508 32.41 9.06a23.796 23.796 0 0 0 5.37-4.13l48.116-49.39c12.445-12.776 32.89-13.043 45.665-.598a32.293 32.293 0 0 1 6.85 9.734l3.073 6.743c5.291 11.604 18.987 16.722 30.59 11.431a23.092 23.092 0 0 0 8.864-7.115l.298-.404c9.31-12.933 27.342-15.87 40.275-6.56a28.854 28.854 0 0 1 6.44 6.396l42.863 58.668c14.744 20.182 43.058 24.59 63.24 9.846a45.256 45.256 0 0 0 11.053-11.583l11.582-17.517c8.396-12.699 25.497-16.187 38.196-7.79a27.565 27.565 0 0 1 8.252 8.512l.282.466c9.637 16.323 30.682 21.742 47.004 12.105a34.321 34.321 0 0 0 6.208-4.689l.6-.585c11.97-11.869 31.295-11.787 43.165.182a30.522 30.522 0 0 1 6.211 9.08l12.08 27.14c6.306 14.167 22.903 20.54 37.071 14.235a28.08 28.08 0 0 0 11.054-8.817l.315-.429V300H0V113.767Z'
            fill='url(#area)'
            className='graph-area'
          />
          <path
            d='m0 113.767 7.192-6.25c22.34-19.411 56.186-17.038 75.598 5.302a53.587 53.587 0 0 1 5.674 7.869l6.671 11.279c9.695 16.391 30.842 21.82 47.234 12.125a34.482 34.482 0 0 0 9.869-8.774l11.766-15.436c7.005-9.19 20.134-10.96 29.323-3.955a20.922 20.922 0 0 1 5.546 6.374c6.449 11.451 20.96 15.507 32.41 9.059a23.796 23.796 0 0 0 5.37-4.13l48.116-49.39c12.445-12.776 32.89-13.043 45.665-.598a32.293 32.293 0 0 1 6.85 9.734l3.073 6.743c5.291 11.604 18.987 16.722 30.59 11.431a23.092 23.092 0 0 0 9.162-7.52c9.31-12.932 27.342-15.869 40.275-6.558a28.854 28.854 0 0 1 6.44 6.395l42.863 58.668c14.744 20.182 43.058 24.59 63.24 9.846a45.256 45.256 0 0 0 11.053-11.583l11.582-17.517c8.396-12.699 25.497-16.187 38.196-7.79a27.565 27.565 0 0 1 8.534 8.978c9.637 16.323 30.682 21.742 47.004 12.105a34.321 34.321 0 0 0 6.717-5.183l.091-.09c11.97-11.87 31.295-11.788 43.165.181a30.522 30.522 0 0 1 6.211 9.08l12.08 27.14c6.306 14.167 22.903 20.54 37.071 14.235A28.08 28.08 0 0 0 766 186.29'
            strokeWidth='2'
            stroke='url(#linear-gradient)'
            className='graph-line'
          />
        </g>
      </svg>
      <style type='text/css'>
        {`
          @keyframes areaLoader {
            0% {
              stop-color: ${start}
            }
            to {
              stop-color: ${end}
            }
          }
          .graph-area {
            opacity: 1;
          }
          .area-start {
            stop-color: ${start}
            animation: areaLoader ${speed} linear infinite alternate;
          }
          .area-end {
            stop-color: ${end}
          }
         `}
      </style>
    </>
  )
}
