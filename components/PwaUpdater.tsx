'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    __pwaRefreshing?: boolean
  }
}

type Props = {
  className?: string
}

export default function PwaUpdater({ className = '' }: Props) {
  const [supported, setSupported] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState<string>('初始化中…')
  const [swVersion, setSwVersion] = useState<string>('')
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    if (!('serviceWorker' in navigator)) {
      setStatus('此裝置不支援更新機制')
      return
    }

    setSupported(true)

    const onControllerChange = () => {
      if (window.__pwaRefreshing) return
      window.__pwaRefreshing = true
      setStatus('已套用新版本，重新載入中…')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    registerAndInit().catch((error) => {
      console.error('SW register/init failed:', error)
      setStatus('更新機制初始化失敗')
    })

    return () => {
      mountedRef.current = false
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  async function registerAndInit() {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })

    setStatus('更新機制已啟用')

    await registration.update()

    if (registration.waiting) {
      setStatus('發現新版本，套用中…')
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            setStatus('新版本已下載，切換中…')
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          } else {
            setStatus('已安裝更新機制')
          }
        }
      })
    })

    await readVersionFromSW()
  }

  async function readVersionFromSW() {
    if (!navigator.serviceWorker.controller) return

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_VERSION') {
        setSwVersion(event.data.version)
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)

    navigator.serviceWorker.controller.postMessage({
      type: 'GET_VERSION',
    })

    window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }, 1500)
  }

  async function handleCheckUpdate() {
    if (!('serviceWorker' in navigator)) return

    try {
      setIsChecking(true)
      setStatus('檢查更新中…')

      const registration = await navigator.serviceWorker.getRegistration()

      if (!registration) {
        setStatus('尚未註冊更新機制，請重新整理後再試')
        return
      }

      await registration.update()

      if (registration.waiting) {
        setStatus('發現新版本，套用中…')
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        return
      }

      setStatus('目前已是最新版本')
      await readVersionFromSW()
    } catch (error) {
      console.error('Check update failed:', error)
      setStatus('檢查更新失敗')
    } finally {
      if (mountedRef.current) {
        setIsChecking(false)
      }
    }
  }

  if (!supported) return null

  return (
    <div
      className={`w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">版本更新</div>
          <div className="break-all text-xs text-white/70">
            {status}
            {swVersion ? ` ｜ SW ${swVersion}` : ''}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheckUpdate}
          disabled={isChecking}
          className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {isChecking ? '檢查中…' : '檢查更新'}
        </button>
      </div>
    </div>
  )
}