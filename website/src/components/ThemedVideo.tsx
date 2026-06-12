import { useEffect, useRef, useState } from 'react'
import { readTheme, subscribe, type Theme } from './theme'

interface Props {
  name: string
  className?: string
  /** Shot name (from /shots/{theme}/) to use as the poster. Defaults to home. */
  posterShot?: string
}

export function ThemedVideo({ name, className, posterShot = 'home' }: Props) {
  const [theme, setTheme] = useState<Theme>('light')
  const videoRef = useRef<HTMLVideoElement>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    setTheme(readTheme())
    return subscribe((next) => {
      if (videoRef.current) timeRef.current = videoRef.current.currentTime
      setTheme(next)
    })
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onReady = () => {
      if (timeRef.current > 0) {
        el.currentTime = timeRef.current
      }
    }
    el.addEventListener('loadeddata', onReady, { once: true })
    return () => el.removeEventListener('loadeddata', onReady)
  }, [theme])

  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const src = `${base}/${name}-${theme}.webm`
  const poster = `${base}/shots/${theme}/${posterShot}.png`

  return (
    <video
      ref={videoRef}
      key={theme}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={poster}
      className={className}
    >
      <source src={src} type="video/webm" />
    </video>
  )
}
