import type { Handle } from '@sveltejs/kit/hooks';
import * as bundled from '#lib/read/bundled.js';
import { serveCoreFiles } from '#lib/read/core.js';

// A verse rendered on request reads the core's files bundled with the server (core.ts).
serveCoreFiles(bundled);

const reader = (path: string) =>
	['/read', '/topics', '/ark-of-the-covenant'].some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Reader pages (and the topic and object pages, set like them) carry the reader's default
 * appearance in the HTML; app.html swaps in the saved one.
 */
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: reader(event.url.pathname)
			? ({ html }) =>
					html
						.replace('<html lang="en">', '<html lang="en" data-read data-theme="light" data-accent="ink">')
						.replace('content="#0a0a0b"', 'content="#ffffff"')
			: undefined
	});
