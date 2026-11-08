/**
 * A verse's link-preview image (1200 x 630 PNG) in the reader's light theme: the reference, the
 * verse in the share card's Literata, and the translation and the site's name at the foot, as the
 * share card (lib/read/share.ts) sets them. Drawn with satori and resvg, in the fonts
 * scripts/fonts.sh cuts for it.
 */
import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?url';
import { read } from '$app/server';
import { SITE_NAME } from '#lib/config.js';
import { imageFit } from '#lib/read/seo/verse.js';
import { ICONS } from '#lib/read/ui/icons.js';
import interMedium from './fonts/inter-medium.ttf?url';
import interSemibold from './fonts/inter-semibold.ttf?url';
import literata from './fonts/literata-heading.ttf?url';

export const WIDTH = 1200;
export const HEIGHT = 630;

/** The light theme's colours (read/tokens.css) and its ink accent. */
const PAPER = '#ffffff';
const INK = '#1c1d21';
const INK_2 = '#6e6f76';
const INK_3 = '#a0a1a8';
const ACCENT = '#2d4a9e';

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: 'normal' };

let ready: Promise<Font[]> | undefined;

function start(): Promise<Font[]> {
	ready ??= (async () => {
		// Once per process (a module reloaded in development finds it done already).
		await initWasm(await read(resvgWasm).arrayBuffer()).catch((e: unknown) => {
			if (!String(e).includes('Already initialized')) throw e;
		});
		const font = async (asset: string, name: string, weight: Font['weight']): Promise<Font> => ({
			name,
			data: await read(asset).arrayBuffer(),
			weight,
			style: 'normal'
		});
		return Promise.all([
			font(literata, 'Literata', 400),
			font(interMedium, 'Inter', 500),
			font(interSemibold, 'Inter', 600)
		]);
	})().catch((e: unknown) => {
		ready = undefined;
		throw e;
	});
	return ready;
}

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown> } };
const h = (type: string, style: Record<string, unknown>, children?: unknown, props: Record<string, unknown> = {}): Node => ({
	type,
	props: { style, children, ...props }
});

const book = () => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="${INK_3}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS.book.body}</svg>`;
	return h('img', { width: 26, height: 26, marginRight: 10 }, undefined, {
		src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
		width: 26,
		height: 26
	});
};

export interface ImageText {
	/** "John 3:16". */
	reference: string;
	/** "King James Version (KJV)". */
	translation: string;
	/** The verse's words exactly as the translation has them, or null to name the reference only. */
	text: string | null;
}

/** The layout satori draws (exported for tests). */
export function tree(t: ImageText): Node {
	const fit = t.text === null ? null : imageFit(t.text);
	const body = fit
		? h(
				'div',
				{ display: 'flex', width: '100%', fontFamily: 'Literata', fontSize: fit.size, lineHeight: `${fit.lineHeight}px`, color: INK },
				fit.text
			)
		: h('div', { display: 'flex', flexDirection: 'column' }, [
				h('div', { display: 'flex', fontFamily: 'Literata', fontSize: 96, lineHeight: '112px', color: INK }, t.reference),
				h(
					'div',
					{ display: 'flex', marginTop: 24, fontFamily: 'Inter', fontWeight: 500, fontSize: 32, color: INK_2 },
					`Read it in the ${t.translation} on ${SITE_NAME}`
				)
			]);
	// The margins are the frame's own box: satori adds a box's padding to its size.
	return h('div', { width: WIDTH, height: HEIGHT, display: 'flex', position: 'relative', background: PAPER }, [
		h(
			'div',
			{
				position: 'absolute',
				top: 64,
				right: 80,
				bottom: 60,
				left: 80,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between'
			},
			[
				h(
					'div',
					{ display: 'flex', height: 32, fontFamily: 'Inter', fontWeight: 600, fontSize: 26, letterSpacing: 3, color: ACCENT },
					fit ? t.reference.toUpperCase() : ''
				),
				h('div', { display: 'flex', flexGrow: 1, width: '100%', alignItems: 'center', overflow: 'hidden', margin: '24px 0' }, body),
				h(
					'div',
					{ display: 'flex', height: 32, justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Inter', fontSize: 24 },
					[
						h('div', { display: 'flex', fontWeight: 500, color: INK_2 }, t.translation),
						h('div', { display: 'flex', alignItems: 'center', fontWeight: 600, color: INK_3 }, [book(), SITE_NAME])
					]
				)
			]
		)
	]);
}

export async function verseImage(t: ImageText): Promise<Uint8Array> {
	const fonts = await start();
	// satori takes React-shaped elements; these plain objects are that shape.
	const svg = await satori(tree(t) as Parameters<typeof satori>[0], { width: WIDTH, height: HEIGHT, fonts });
	return new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
}
