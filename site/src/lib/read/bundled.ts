/**
 * The core's files for the pages rendered on request (a passage, a verse with no prerendered page,
 * a verse's preview image): the copies the build bundles with the server, read through SvelteKit's
 * `read`. While building, core.ts reads them from disk instead (node.ts). hooks.server.ts hands
 * these to the core, so that SvelteKit counts the files among the server's assets.
 */
import { read } from '$app/server';
import wasmAsset from './wasm/bible_bg.wasm?url';

const TRANSLATIONS = import.meta.glob<string>('../../../../data/translations/*.bbl', {
	query: '?url',
	import: 'default',
	eager: true
});

const bytes = async (asset: string) => new Uint8Array(await read(asset).arrayBuffer());

export const wasmBytes = () => bytes(wasmAsset);

export function translationBytes(id: string): Promise<Uint8Array> {
	const asset = TRANSLATIONS[`../../../../data/translations/${id}.bbl`];
	if (!asset) throw new Error(`no translation ${id}`);
	return bytes(asset);
}
