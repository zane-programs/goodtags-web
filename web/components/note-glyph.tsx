import { mdiMusicAccidentalFlat, mdiMusicAccidentalSharp } from '@mdi/js'
import { Icon } from './ui/icon'

// Font Awesome Free 6 letter glyphs, matching native NoteButton. CC BY 4.0.
// https://github.com/FortAwesome/Font-Awesome; see public/licenses/font-awesome.txt.
const letters = {
  a: {
    viewBox: '0 0 384 512',
    path: 'M221.5 51.7C216.6 39.8 204.9 32 192 32s-24.6 7.8-29.5 19.7l-120 288-40 96c-6.8 16.3 .9 35 17.2 41.8s35-.9 41.8-17.2L93.3 384l197.3 0 31.8 76.3c6.8 16.3 25.5 24 41.8 17.2s24-25.5 17.2-41.8l-40-96-120-288zM264 320l-144 0 72-172.8L264 320z',
  },
  b: {
    viewBox: '0 0 320 512',
    path: 'M64 32C28.7 32 0 60.7 0 96L0 256 0 416c0 35.3 28.7 64 64 64l128 0c70.7 0 128-57.3 128-128c0-46.5-24.8-87.3-62-109.7c18.7-22.3 30-51 30-82.3c0-70.7-57.3-128-128-128L64 32zm96 192l-96 0L64 96l96 0c35.3 0 64 28.7 64 64s-28.7 64-64 64zM64 288l96 0 32 0c35.3 0 64 28.7 64 64s-28.7 64-64 64L64 416l0-128z',
  },
  c: {
    viewBox: '0 0 384 512',
    path: 'M329.1 142.9c-62.5-62.5-155.8-62.5-218.3 0s-62.5 163.8 0 226.3s155.8 62.5 218.3 0c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3c-87.5 87.5-221.3 87.5-308.8 0s-87.5-229.3 0-316.8s221.3-87.5 308.8 0c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0z',
  },
  d: {
    viewBox: '0 0 384 512',
    path: 'M0 96C0 60.7 28.7 32 64 32l96 0c123.7 0 224 100.3 224 224s-100.3 224-224 224l-96 0c-35.3 0-64-28.7-64-64L0 96zm160 0L64 96l0 320 96 0c88.4 0 160-71.6 160-160s-71.6-160-160-160z',
  },
  e: {
    viewBox: '0 0 320 512',
    path: 'M64 32C28.7 32 0 60.7 0 96L0 256 0 416c0 35.3 28.7 64 64 64l224 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 416l0-128 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 224 64 96l224 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 32z',
  },
  f: {
    viewBox: '0 0 320 512',
    path: 'M64 32C28.7 32 0 60.7 0 96L0 256 0 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 224 64 96l224 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L64 32z',
  },
  g: {
    viewBox: '0 0 448 512',
    path: 'M224 96C135.6 96 64 167.6 64 256s71.6 160 160 160c77.4 0 142-55 156.8-128L256 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l144 0c25.8 0 49.6 21.4 47.2 50.6C437.8 389.6 341.4 480 224 480C100.3 480 0 379.7 0 256S100.3 32 224 32c57.4 0 109.7 21.6 149.3 57c13.2 11.8 14.3 32 2.5 45.2s-32 14.3-45.2 2.5C302.3 111.4 265 96 224 96z',
  },
} as const
/**
 * NoteButton.tsx: the key's letter as a Font Awesome glyph at 70% of the button size, with a
 * Material accidental overlapping its right edge.
 */
export function NoteGlyph({ note, size = 40 }: { note: string; size?: number }) {
  const letter = letters[note[0]?.toLowerCase() as keyof typeof letters]
  if (!letter) return null
  const glyph = size * 0.7
  const accidental =
    note[1] === '#' ? mdiMusicAccidentalSharp : note[1] === 'b' ? mdiMusicAccidentalFlat : null
  return (
    <span
      aria-hidden="true"
      className="relative grid place-content-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox={letter.viewBox} fill="currentColor" style={{ height: glyph }}>
        <path d={letter.path} />
      </svg>
      {accidental && (
        <Icon
          path={accidental}
          size={glyph}
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: glyph * 0.85 }}
        />
      )}
    </span>
  )
}
