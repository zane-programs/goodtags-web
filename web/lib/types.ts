export type Sort = 'alpha' | 'downloads' | 'newest' | 'id'
export type Part = 'AllParts' | 'Tenor' | 'Lead' | 'Bari' | 'Bass'
export interface Tag {
  id: number
  title: string
  aka: string
  arranger: string
  key: string
  lyrics: string
  collection: string
  downloaded: number
  parts: number
  posted: string
  uri: string
  quartet: string
  quartetUrl: string
  tracks: { part: Part; fileType: string; url: string }[]
  videos: { code: string; sungBy: string }[]
}
export interface SearchParams {
  id?: number
  ids?: number[]
  query?: string
  collection?: string
  parts?: number
  sheetMusic?: boolean
  learningTracks?: boolean
  sort?: Sort
  offset?: number
  limit?: number
  random?: boolean
}
export interface SearchResult {
  tags: Tag[]
  total: number
}
export interface Library {
  version: 1
  favorites: { id: number; addedDate: string }[]
  labels: { name: string; ids: number[] }[]
  history: number[]
  options: { serifs: boolean; keepAwake: boolean; showStatusBar: boolean }
  selectedPart: Part
  welcomed: boolean
}
export const emptyLibrary = (): Library => ({
  version: 1,
  favorites: [],
  labels: [],
  history: [],
  options: { serifs: true, keepAwake: true, showStatusBar: false },
  selectedPart: 'AllParts',
  welcomed: false,
})
