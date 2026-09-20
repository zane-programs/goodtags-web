import type { Database, SqlValue } from 'sql.js'
import type { SearchParams, SearchResult, Tag } from './types'
export function rows(db: Database, sql: string, args: SqlValue[] = []): Record<string, SqlValue>[] {
  const statement = db.prepare(sql)
  try {
    statement.bind(args)
    const result = []
    while (statement.step()) result.push(statement.getAsObject())
    return result
  } finally {
    statement.free()
  }
}
export function search(db: Database, params: SearchParams): SearchResult {
  const conditions: string[] = [],
    args: SqlValue[] = []
  const query = params.query?.replace(/[^a-zA-Z0-9]/g, ' ').trim() || ''
  const id = params.id ?? (/^\d+$/.test(query) ? Number(query) : undefined)
  if (params.ids) {
    conditions.push(params.ids.length ? `id IN (${params.ids.map(() => '?').join(',')})` : '0')
    args.push(...params.ids)
  }
  if (query) {
    if (id !== undefined) {
      conditions.push('title LIKE ?')
      args.push(`%${query}%`)
    } else {
      conditions.push('(id IN (SELECT rowid FROM tags_fts WHERE tags_fts MATCH ?) OR title LIKE ?)')
      args.push(`${query}*`, `%${query}%`)
    }
  }
  if (params.collection && params.collection !== 'All') {
    conditions.push('collection = ?')
    args.push(params.collection)
  }
  if (params.parts) {
    conditions.push('parts = ?')
    args.push(params.parts)
  }
  if (params.sheetMusic) conditions.push("sheet_music_alt IS NOT NULL AND sheet_music_alt != ''")
  if (params.learningTracks) conditions.push('id IN (SELECT tag_id FROM tracks)')
  let where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
  // Native search gives an exact ID match priority even when other filters exclude it.
  if (id !== undefined) {
    where = ` WHERE id = ?${conditions.length ? ` OR (${conditions.join(' AND ')})` : ''}`
    args.unshift(id)
  }
  const total = Number(rows(db, `SELECT count(*) AS count FROM tags${where}`, args)[0].count)
  const order = params.random
    ? 'RANDOM()'
    : {
        alpha: 'title COLLATE NOCASE, id',
        downloads: 'downloaded DESC, id',
        newest: 'posted DESC, id DESC',
        id: 'id',
      }[params.sort || 'alpha']
  const tagRows = rows(db, `SELECT * FROM tags${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [
    ...args,
    params.limit ?? 99,
    params.offset ?? 0,
  ])
  const tags: Tag[] = tagRows.map(row => ({
    id: Number(row.id),
    title: String(row.title || ''),
    aka: String(row.alt_title || ''),
    arranger: String(row.arranger || ''),
    key: String(row.key || ''),
    lyrics: String(row.lyrics || ''),
    collection: String(row.collection || ''),
    downloaded: Number(row.downloaded || 0),
    parts: Number(row.parts || 0),
    posted: String(row.posted || ''),
    uri: String(row.sheet_music_alt || ''),
    quartet: String(row.quartet || ''),
    quartetUrl: String(row.quartet_url || ''),
    tracks: rows(db, 'SELECT * FROM tracks WHERE tag_id = ?', [row.id]).map(t => ({
      part: t.part as Tag['tracks'][number]['part'],
      url: String(t.url),
      fileType: String(t.file_type),
    })),
    videos: rows(db, 'SELECT * FROM videos WHERE tag_id = ?', [row.id]).map(v => ({
      code: String(v.code),
      sungBy: String(v.sung_by || ''),
    })),
  }))
  return { tags, total }
}
export function validateDatabase(db: Database) {
  if (Number(rows(db, 'SELECT version FROM schema')[0]?.version) !== 1)
    throw new Error('Unsupported catalog version')
  if (Number(rows(db, 'SELECT count(*) AS count FROM tags')[0]?.count) < 5000)
    throw new Error('Incomplete catalog')
  const checks = rows(db, 'PRAGMA quick_check').map(row => row.quick_check)
  // Some published native snapshots contain a stale derived FTS index. Rebuild only
  // that index in memory; never accept damage to the canonical tables.
  if (
    checks.length &&
    checks.every(message => message === 'malformed inverted index for FTS4 table main.tags_fts')
  ) {
    db.run("INSERT INTO tags_fts(tags_fts) VALUES ('rebuild')")
  }
  const verified = rows(db, 'PRAGMA quick_check')
  if (verified.length !== 1 || verified[0].quick_check !== 'ok') throw new Error('Invalid catalog')
  search(db, { query: 'love', learningTracks: true, limit: 1 })
}
