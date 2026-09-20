import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { mediaUrl } from '@/lib/media'
import { Spinner } from './ui/spinner'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const MAX_ZOOM = 2

/** The native viewer's own failure view (SheetMusic.tsx); its colors are deliberately off-theme. */
function LoadError({ uri, onRetry }: { uri: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex h-full flex-col items-center justify-center p-5 text-center font-[system-ui]"
    >
      <span className="text-[48px] leading-none">⚠️</span>
      <h2 className="mt-4 text-[18px] leading-6 font-semibold text-native-ink">
        Unable to load sheet music
      </h2>
      <p className="mt-2 px-5 text-[14px] leading-5 break-all text-native-ink-muted">{uri}</p>
      <p className="px-5 text-[14px] leading-5 text-native-ink-muted">
        Check your network connection and try again
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 cursor-pointer rounded-[3px] bg-native-accent px-6 py-2 font-[system-ui] text-[17px] text-white outline-none focus-visible:ring-3 focus-visible:ring-ring active:opacity-70"
      >
        Retry
      </button>
    </div>
  )
}

/**
 * SheetMusic.tsx. Fits the score to the width; PDFs stack pages with a 16px gap, images
 * center vertically. There are no zoom buttons: pinch (or ctrl-scroll / double-tap) zooms up
 * to 2x around the gesture, and a plain tap is reported so the screen can wake its controls.
 */
export default function SheetMusic({ uri, onTap }: { uri: string; onTap: () => void }) {
  const scroll = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const anchor = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const zoomRef = useRef(1)
  const moved = useRef(false)
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  // Pages re-render sharply once a zoom gesture settles; mid-gesture the bitmap just scales.
  const [renderZoom, setRenderZoom] = useState(1)
  const [pages, setPages] = useState(0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const url = mediaUrl(uri)
  const pdf = /\.pdf(?:$|\?)/i.test(uri)

  const zoomTo = (value: number, clientX: number, clientY: number) => {
    const bounds = paper.current?.getBoundingClientRect()
    if (bounds)
      anchor.current = {
        clientX,
        clientY,
        x: (clientX - bounds.left) / zoomRef.current,
        y: (clientY - bounds.top) / zoomRef.current,
      }
    zoomRef.current = Math.min(MAX_ZOOM, Math.max(1, value))
    setZoom(zoomRef.current)
  }
  // Keep the point under the fingers stationary as the paper grows.
  useLayoutEffect(() => {
    const point = anchor.current
    const bounds = paper.current?.getBoundingClientRect()
    if (!point || !bounds || !scroll.current) return
    scroll.current.scrollLeft += bounds.left + point.x * zoom - point.clientX
    scroll.current.scrollTop += bounds.top + point.y * zoom - point.clientY
    anchor.current = null
  }, [zoom])
  useEffect(() => {
    const timer = setTimeout(() => setRenderZoom(zoom > 1.25 ? 2 : 1), 250)
    return () => clearTimeout(timer)
  }, [zoom])
  useEffect(() => {
    zoomRef.current = 1
    setZoom(1)
    setFailed(false)
    setPages(0)
    scroll.current?.scrollTo(0, 0)
  }, [uri])
  useEffect(() => {
    if (!scroll.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(scroll.current)
    return () => observer.disconnect()
  }, [])
  // Trackpad pinch arrives as ctrl+wheel; it must be non-passive to stop the page zooming.
  useEffect(() => {
    const element = scroll.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      zoomTo(zoomRef.current * Math.exp(-event.deltaY / 100), event.clientX, event.clientY)
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [])

  const release = (id: number) => {
    pointers.current.delete(id)
    pinch.current = null
  }
  return (
    <div
      ref={scroll}
      data-testid="sheet-music"
      className="relative min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-score"
      onPointerDown={event => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        moved.current = pointers.current.size > 1
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]
          pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current }
        }
      }}
      onPointerMove={event => {
        const previous = pointers.current.get(event.pointerId)
        if (!previous) return
        if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 8)
          moved.current = true
        if (pointers.current.size !== 2 || !pinch.current) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        const [a, b] = [...pointers.current.values()]
        zoomTo(
          (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
            Math.max(1, pinch.current.distance),
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
        )
      }}
      onPointerUp={event => release(event.pointerId)}
      onPointerCancel={event => release(event.pointerId)}
      onClick={() => !moved.current && onTap()}
      onDoubleClick={event =>
        zoomTo(zoomRef.current > 1 ? 1 : MAX_ZOOM, event.clientX, event.clientY)
      }
    >
      {!uri ? (
        <p className="p-5 text-center text-body-md">No sheet music</p>
      ) : failed || !url ? (
        <LoadError
          uri={uri}
          onRetry={() => {
            setFailed(false)
            setAttempt(n => n + 1)
          }}
        />
      ) : (
        <div
          ref={paper}
          key={`${uri}-${attempt}`}
          data-loaded={pdf ? pages > 0 : undefined}
          className="flex min-h-full flex-col justify-center"
          style={{ width: width * zoom || undefined }}
        >
          {pdf ? (
            width > 0 && (
              <Document
                file={url}
                className="flex flex-col gap-4 [&_canvas]:!h-auto [&_canvas]:!w-full"
                onLoadSuccess={({ numPages }) => setPages(numPages)}
                onLoadError={() => setFailed(true)}
                error={<span />}
                loading={
                  <div role="status" className="flex flex-col items-center py-20">
                    <Spinner />
                    <p className="mt-4 text-body-md">loading pdf...</p>
                  </div>
                }
              >
                {Array.from({ length: pages }, (_, index) => (
                  <Page
                    key={index}
                    pageNumber={index + 1}
                    width={width * renderZoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderError={() => setFailed(true)}
                  />
                ))}
              </Document>
            )
          ) : (
            <img
              src={url}
              alt=""
              draggable={false}
              onError={() => setFailed(true)}
              className="w-full object-contain shadow-[0_0_1px_1px_#eee]"
            />
          )}
        </div>
      )}
    </div>
  )
}
