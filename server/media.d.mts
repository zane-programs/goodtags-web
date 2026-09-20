import type { IncomingMessage, ServerResponse } from 'node:http'
export function mediaHandler(req: IncomingMessage, res: ServerResponse): Promise<void>
export function allowedMediaUrl(value: unknown): URL | null
