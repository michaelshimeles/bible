import { error } from '@sveltejs/kit';
import { core } from '#lib/read/core.js';
import { findPassage } from '#lib/read/seo/passage.js';
import { verseImage } from '#lib/server/og/image.js';
import type { RequestHandler } from './$types';

/**
 * A verse's or passage's link-preview image, /og/kjv/john/3/16.png beside /read/kjv/john/3/16:
 * drawn on request (one for every verse of seven translations would be far too many to build) and
 * kept by the CDN. A licensed translation's (the NLT's) names the passage only, never its words.
 */
export const prerender = false;

export const GET: RequestHandler = async ({ params }) => {
	const m = /^(.+)\.png$/.exec(params.file);
	const p = m && (await findPassage(await core(), { ...params, verse: m[1] }));
	if (!p) error(404, 'No such verse');
	const name = p.info.name.includes(`(${p.info.abbrev})`) ? p.info.name : `${p.info.name} (${p.info.abbrev})`;
	const png = await verseImage({ reference: p.label, translation: name, text: p.text });
	return new Response(png as Uint8Array<ArrayBuffer>, {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=86400, s-maxage=31536000'
		}
	});
};
