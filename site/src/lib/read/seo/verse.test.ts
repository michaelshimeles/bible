import { beforeAll, describe, expect, it } from 'vitest';
import { BOOKS } from '../books';
import { Core } from '../core';
import { translationBytes, wasmBytes } from '../node';
import * as wasm from '../wasm/bible.js';
import { findPassage } from './passage';
import { capacity, imageFit, imagePath, parseVerseSpan, passageMeta, passagePath, spanLabel } from './verse';

const JOHN_3 = BOOKS.find((b) => b.name === 'John')!.firstChapter + 2;
const JOHN_3_16 = 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';

describe('parseVerseSpan', () => {
	it('reads a verse and a passage', () => {
		expect(parseVerseSpan('16')).toEqual({ from: 16, to: 16 });
		expect(parseVerseSpan('16-18')).toEqual({ from: 16, to: 18 });
	});

	it('refuses anything else', () => {
		for (const bad of ['', '0', '016', '18-16', '16-16', '16–18', '16-', '-16', '16-18-20', 'a', '1000', '16,18', ' 16'])
			expect(parseVerseSpan(bad), bad).toBeNull();
	});
});

describe('labels and addresses', () => {
	it('labels a verse and a passage', () => {
		expect(spanLabel('John 3', { from: 16, to: 16 })).toBe('John 3:16');
		expect(spanLabel('Psalm 23', { from: 1, to: 6 })).toBe('Psalm 23:1–6');
	});

	it("links a selection's verses, first to last, in the first one's chapter", () => {
		const at = (verse: number, index = JOHN_3) => ({ index, verse });
		expect(passagePath(BOOKS, 'kjv', [at(16)])).toBe('/read/kjv/john/3/16');
		expect(passagePath(BOOKS, 'asv', [at(18), at(16), at(17)])).toBe('/read/asv/john/3/16-18');
		expect(passagePath(BOOKS, 'kjv', [at(16), at(20)])).toBe('/read/kjv/john/3/16-20');
		expect(passagePath(BOOKS, 'nlt', [at(36), at(1, JOHN_3 + 1)])).toBe('/read/nlt/john/3/36');
		expect(passagePath(BOOKS, 'kjv', [])).toBeNull();
	});

	it("puts the image beside the page's address", () => {
		expect(imagePath('/read/kjv/john/3/16-18')).toBe('/og/kjv/john/3/16-18.png');
	});
});

describe('passageMeta', () => {
	it("leads with the reference and quotes the verse's words exactly", () => {
		const m = passageMeta({ label: 'John 3:16', abbrev: 'KJV', name: 'King James Version', text: JOHN_3_16 });
		expect(m.ogTitle).toBe('John 3:16 (KJV)');
		expect(m.description).toBe(JOHN_3_16);
		expect(m.title).toBe('John 3:16 KJV – "For God so loved the…" | Simply My Bible');
	});

	it('cuts a long passage at a word, with an ellipsis', () => {
		const text = `${JOHN_3_16} `.repeat(4).trim();
		const m = passageMeta({ label: 'John 3:16–19', abbrev: 'KJV', name: 'King James Version', text });
		expect(m.description.length).toBeLessThanOrEqual(300);
		expect(m.description.endsWith('…')).toBe(true);
		expect(text.startsWith(m.description.slice(0, -1))).toBe(true);
	});

	it("names a licensed translation's passage without its words", () => {
		const m = passageMeta({ label: 'John 3:16', abbrev: 'NLT', name: 'New Living Translation', text: null });
		expect(m).toEqual({
			title: 'John 3:16 NLT | Simply My Bible',
			ogTitle: 'John 3:16 (NLT)',
			description: 'Read John 3:16 in the New Living Translation (NLT) on Simply My Bible.'
		});
	});
});

describe('imageFit', () => {
	it('sets a short verse large and whole', () => {
		const fit = imageFit('Jesus wept.');
		expect(fit).toEqual({ size: 64, lineHeight: 90, text: 'Jesus wept.' });
	});

	it('steps down for a longer verse and cuts only what still will not fit', () => {
		expect(imageFit(JOHN_3_16).size).toBeLessThan(64);
		expect(imageFit(JOHN_3_16).text).toBe(JOHN_3_16);
		const long = `${JOHN_3_16} `.repeat(10).trim();
		const fit = imageFit(long);
		expect(fit.size).toBe(32);
		expect(fit.text.length).toBeLessThanOrEqual(capacity(32));
		expect(fit.text.endsWith('…')).toBe(true);
		expect(long.startsWith(fit.text.slice(0, -1))).toBe(true);
	});
});

describe('findPassage', () => {
	let c: Core;
	beforeAll(() => {
		wasm.initSync({ module: wasmBytes() });
		c = new Core(async (id) => translationBytes(id));
	});
	const at = (translation: string, verse: string, book = 'john', chapter = '3') => findPassage(c, { translation, book, chapter, verse });

	it("finds a bundled translation's verse, as it has it", async () => {
		const p = (await at('kjv', '16'))!;
		expect(p.label).toBe('John 3:16');
		expect(p.text).toBe(JOHN_3_16);
		expect(p.path).toBe('/read/kjv/john/3/16');
		expect(p.indexed).toBe(true);
	});

	it('finds a passage and a verse with no prerendered page, kept out of search', async () => {
		const p = (await at('kjv', '16-17'))!;
		expect(p.label).toBe('John 3:16–17');
		expect(p.text?.startsWith(`${JOHN_3_16} For God sent not his Son`)).toBe(true);
		expect(p.indexed).toBe(false);
		const asv = (await at('asv', '16'))!;
		expect(asv.info.abbrev).toBe('ASV');
		expect(asv.indexed).toBe(false);
	});

	it("never reads a licensed translation's words", async () => {
		const p = (await at('nlt', '16'))!;
		expect(p.info.abbrev).toBe('NLT');
		expect(p.text).toBeNull();
		expect(p.verses).toEqual([]);
	});

	it('finds nothing an address does not name', async () => {
		expect(await at('kjv', '37')).toBeNull();
		expect(await at('kjv', '36-37')).toBeNull();
		expect(await at('nlt', '37')).toBeNull();
		expect(await at('kjv', '16', 'john', '22')).toBeNull();
		expect(await at('kjv', '16', 'jhn')).toBeNull();
		expect(await at('esv', '16')).toBeNull();
		expect(await at('kjv', '18-16')).toBeNull();
	});
});
