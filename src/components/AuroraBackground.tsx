import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import SimplexNoise from 'simplex-noise'

const rayCount = 300
const rayPropCount = 8
const rayPropsLength = rayCount * rayPropCount
const baseLength = 300
const rangeLength = 300
const baseSpeed = 0.08
const rangeSpeed = 0.1
const baseWidth = 10
const rangeWidth = 100
const baseHue = 170
const rangeHue = 125
const baseTTL = 100
const rangeTTL = 100
const noiseStrength = 180
const xOff = 0.0015
const yOff = 0.0015
const zOff = 0.0015

const { abs, round, random } = Math
const rand = (n: number) => n * random()
const fadeInOut = (t: number, m: number) => {
  let hm = 0.5 * m
  return abs(((t + hm) % m) - hm) / hm
}

const canvasStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  filter: 'blur(10px)',
  zIndex: 1,
}

export const AuroraBackground: React.FC = props => {
  const canvasRefB = useRef(null)

  useEffect(() => {
    let center = [0, 0]
    let tick: number
    let simplex: SimplexNoise
    let rayProps: Float32Array
    let animationFrameId: number
    const canvasA = document.createElement('canvas')
    const canvasB: HTMLCanvasElement = canvasRefB.current as unknown as HTMLCanvasElement
    const ctxA = canvasA.getContext('2d') as unknown as CanvasRenderingContext2D
    const ctxB = canvasB.getContext('2d') as unknown as CanvasRenderingContext2D

    const setup = () => {
      resize()
      initRays()
      draw()
    }

    const initRays = () => {
      tick = 0
      simplex = new SimplexNoise()
      rayProps = new Float32Array(rayPropsLength)

      for (let i = 0; i < rayPropsLength; i += rayPropCount) {
        initRay(i)
      }
    }

    const initRay = (i: number) => {
      let length, x, y1, y2, n, life, ttl, width, speed, hue

      length = baseLength + rand(rangeLength)
      x = rand(canvasA.width)
      y1 = center[1] + noiseStrength
      y2 = center[1] + noiseStrength - length
      n = simplex.noise3D(x * xOff, y1 * yOff, tick * zOff) * noiseStrength
      y1 += n
      y2 += n
      life = 0
      ttl = baseTTL + rand(rangeTTL)
      width = baseWidth + rand(rangeWidth)
      speed = baseSpeed + rand(rangeSpeed) * (round(rand(1)) ? 1 : -1)
      hue = baseHue + rand(rangeHue)

      rayProps.set([x, y1, y2, life, ttl, width, speed, hue], i)
    }

    const drawRays = () => {
      for (let i = 0; i < rayPropsLength; i += rayPropCount) {
        updateRay(i)
      }
    }

    const updateRay = (i: number) => {
      let i2 = 1 + i,
        i3 = 2 + i,
        i4 = 3 + i,
        i5 = 4 + i,
        i6 = 5 + i,
        i7 = 6 + i,
        i8 = 7 + i
      let x, y1, y2, life, ttl, width, speed, hue

      x = rayProps[i]
      y1 = rayProps[i2]
      y2 = rayProps[i3]
      life = rayProps[i4]
      ttl = rayProps[i5]
      width = rayProps[i6]
      speed = rayProps[i7]
      hue = rayProps[i8]

      drawRay(x, y1, y2, life, ttl, width, hue)

      x += speed
      life++

      rayProps[i] = x
      rayProps[i4] = life
      ;(checkBounds(x) || life > ttl) && initRay(i)
    }

    const drawRay = (
      x: number,
      y1: number,
      y2: number,
      life: number,
      ttl: number,
      width: number,
      hue: number,
    ) => {
      let gradient

      gradient = ctxA.createLinearGradient(x, y1, x, y2)
      gradient.addColorStop(0, `hsla(${hue},100%,65%,0)`)
      gradient.addColorStop(0.5, `hsla(${hue},100%,65%,${fadeInOut(life, ttl)})`)
      gradient.addColorStop(1, `hsla(${hue},100%,65%,0)`)

      ctxA.save()
      ctxA.beginPath()
      ctxA.strokeStyle = gradient
      ctxA.lineWidth = width
      ctxA.moveTo(x, y1)
      ctxA.lineTo(x, y2)
      ctxA.stroke()
      ctxA.closePath()
      ctxA.restore()
    }

    const checkBounds = (x: number) => {
      return x < 0 || x > canvasA.width
    }

    const resize = () => {
      const { innerWidth, innerHeight } = window

      canvasA.width = innerWidth
      canvasA.height = innerHeight

      ctxA.drawImage(canvasB, 0, 0)

      canvasB.width = innerWidth
      canvasB.height = innerHeight

      ctxB.drawImage(canvasA, 0, 0)

      center[0] = 0.5 * canvasA.width
      center[1] = 0.5 * canvasA.height
    }

    const renderCanvas = () => {
      ctxB.save()
      // ctxB.filter = "blur(12px)";
      ctxB.globalCompositeOperation = 'source-in'
      ctxB.drawImage(canvasA, 0, 0)
      ctxB.restore()
    }

    const draw = () => {
      tick++
      ctxA.clearRect(0, 0, canvasA.width, canvasA.height)
      ctxB.fillRect(0, 0, canvasB.width, canvasA.height)
      ctxA.globalAlpha = 0.2

      drawRays()
      renderCanvas()

      const isFirefox = window.navigator.userAgent.toLowerCase().includes('firefox')
      // firefox performs poorly, disable animation
      if (!isFirefox) animationFrameId = window.requestAnimationFrame(draw)
    }
    setup()

    window.addEventListener('resize', resize)

    return () => {
      animationFrameId && window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div>
      <canvas ref={canvasRefB} style={canvasStyle} {...props} />
    </div>
  )
}
