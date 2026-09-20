import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { mediaUrl, safeUrl } from '@/lib/media'
import { Button } from './ui/button'
import { IconButton } from './IconButton'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
export default function Score({ uri, title }: { uri: string; title: string }) {
  const container = useRef<HTMLDivElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const anchor = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const currentZoom = useRef(1)
  const [width, setWidth] = useState(600),
    [zoom, setZoom] = useState(1),
    [pages, setPages] = useState(0),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0)
  const url = mediaUrl(uri),
    pdf = /\.pdf(?:$|\?)/i.test(uri)
  const maxZoom = pdf ? 2 : 3
  const changeZoom = (value: number, clientX?: number, clientY?: number) => {
    const bounds = paper.current?.getBoundingClientRect()
    if (bounds && clientX !== undefined && clientY !== undefined)
      anchor.current = { clientX, clientY, x: (clientX - bounds.left) / currentZoom.current, y: (clientY - bounds.top) / currentZoom.current }
    const next = Math.min(maxZoom, Math.max(1, value))
    currentZoom.current = next
    setZoom(next)
  }
  useLayoutEffect(() => {
    const point = anchor.current, bounds = paper.current?.getBoundingClientRect()
    if (point && bounds && scroll.current) {
      scroll.current.scrollLeft += bounds.left + point.x * zoom - point.clientX
      scroll.current.scrollTop += bounds.top + point.y * zoom - point.clientY
      anchor.current = null
    }
  }, [zoom])
  const releasePointer = (id: number) => {
    pointers.current.delete(id)
    pinch.current = null
  }
  useEffect(() => {
    currentZoom.current = 1
    setZoom(1)
    setError(false)
    setPages(0)
    pointers.current.clear()
    pinch.current = null
    if (scroll.current) { scroll.current.scrollTop = 0; scroll.current.scrollLeft = 0 }
  }, [uri])
  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(entries =>
      setWidth(Math.max(240, entries[0].contentRect.width - (matchMedia('(max-width: 1023px)').matches ? 0 : 24))),
    )
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={container} className={`score-container ${pdf ? 'score-pdf' : 'score-image'}`}>
      <div className="score-zoom">
        <IconButton
          label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => changeZoom(zoom - 0.25)}
        >
          <ZoomOut />
        </IconButton>
        <button className="zoom-value" aria-label="Reset zoom" onClick={() => changeZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <IconButton
          label="Zoom in"
          disabled={zoom >= maxZoom}
          onClick={() => changeZoom(zoom + 0.25)}
        >
          <ZoomIn />
        </IconButton>
      </div>
      <div className="score-scroll" ref={scroll}
        onPointerDown={event => {
          if ((event.target as HTMLElement).closest('button, a')) return
          if (event.pointerType === 'mouse' && event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()]
            pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: currentZoom.current }
          }
        }}
        onPointerMove={event => {
          const previous = pointers.current.get(event.pointerId)
          if (!previous) return
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()]
            const distance = Math.hypot(a.x - b.x, a.y - b.y)
            changeZoom(pinch.current.zoom * distance / Math.max(1, pinch.current.distance), (a.x + b.x) / 2, (a.y + b.y) / 2)
          } else if (pointers.current.size === 1) {
            event.currentTarget.scrollLeft -= event.clientX - previous.x
            event.currentTarget.scrollTop -= event.clientY - previous.y
          }
        }}
        onPointerUp={event => releasePointer(event.pointerId)}
        onPointerCancel={event => releasePointer(event.pointerId)}
        onLostPointerCapture={event => releasePointer(event.pointerId)}
        onDoubleClick={event => changeZoom(zoom === 1 ? 2 : 1, event.clientX, event.clientY)}
      >
        {!uri ? (
          <div className="empty-state">
            <p>No sheet music</p>
          </div>
        ) : error || !url ? (
          <div className="empty-state" role="alert">
            <h2>Unable to load sheet music</h2>
            <p>Check your connection, then try again.</p>
            <Button
              onClick={() => {
                setError(false)
                setRetry(n => n + 1)
              }}
            >
              <RotateCcw />
              Retry
            </Button>
            {safeUrl(uri) && (
              <a href={safeUrl(uri)} target="_blank" rel="noreferrer">
                Open original sheet music
              </a>
            )}
          </div>
        ) : (
          <div ref={paper} className="score-paper" style={{ width: width * zoom }} key={`${uri}-${retry}`}>
            {pdf ? (
              <Document
                file={url}
                onLoadSuccess={({ numPages }) => setPages(numPages)}
                onLoadError={() => setError(true)}
                loading={
                  <p className="loading" role="status">
                    loading sheet music…
                  </p>
                }
              >
                {Array.from({ length: pages }, (_, i) => (
                  <Page
                    key={i}
                    pageNumber={i + 1}
                    width={width * zoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderError={() => setError(true)}
                  />
                ))}
              </Document>
            ) : (
              <img
                src={url}
                alt={`Sheet music for ${title}`}
                onError={() => setError(true)}
                draggable={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
