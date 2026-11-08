/**
 * A verse's or a passage's address, its link preview and the image that goes with it: the parts
 * with no core in them, so they can be tested alone. The page (routes/read/[translation]/[book]/
 * [chapter]/[verse]) and the image (routes/og) look the passage up with passage.ts.
 */
import { SITE_NAME } from '#lib/config.js';
import { chapterPath } from '../books';
import type { Book } from '../core';
import { clip, verseTitle } from './meta';

/** Verses from `from` to `to` in one chapter; the same number twice for a single verse. */
export interface VerseSpan {
	from: number;
	to: number;
}

/**
 * The verse part of an address: "16", or "16-18" for a passage. A range runs forwards and names
 * two different verses; anything else (leading zeros, "18-16", "16-16", "16–18") is no verse.
 */
export function parseVerseSpan(param: string): VerseSpan | null {
	const m = /^([1-9]\d{0,2})(?:-([1-9]\d{0,2}))?$/.exec(param);
	if (!m) return null;
	const from = Number(m[1]);
	const to = m[2] ? Number(m[2]) : from;
	if (m[2] && to <= from) return null;
	return { from, to };
}

/** "16" or "16-18": the span as an address writes it. */
export const spanParam = (s: VerseSpan) => (s.to > s.from ? `${s.from}-${s.to}` : String(s.from));

/** "John 3:16" or "John 3:16–18", from the chapter's label ("John 3", "Psalm 23"). */
export const spanLabel = (chapter: string, s: VerseSpan) =>
	s.to > s.from ? `${chapter}:${s.from}–${s.to}` : `${chapter}:${s.from}`;

/**
 * The address of a verse or passage, /read/kjv/john/3/16 or /read/kjv/john/3/16-18: the verses
 * from the first to the last of the chapter the first is in (a selection across chapters links
 * its first chapter's part).
 */
export function passagePath(books: Book[], translation: string, verses: { index: number; verse: number }[]): string | null {
	if (!verses.length) return null;
	const index = Math.min(...verses.map((v) => v.index));
	const numbers = verses.filter((v) => v.index === index).map((v) => v.verse);
	const span = { from: Math.min(...numbers), to: Math.max(...numbers) };
	return `${chapterPath(books, translation, index)}/${spanParam(span)}`;
}

/** The preview image's address beside a passage's page: /og/kjv/john/3/16-18.png. */
export const imagePath = (pagePath: string) => `${pagePath.replace(/^\/read\//, '/og/')}.png`;

export interface PassageMeta {
	/** The page's <title>, for search results. */
	title: string;
	/** What a link preview leads with: "John 3:16 (KJV)". */
	ogTitle: string;
	description: string;
}

/**
 * A passage's title and description. `text` is the passage's words exactly as the translation has
 * them, or null for a licensed translation whose words are never put in a page (the NLT): its
 * preview then names the reference and the translation only.
 */
export function passageMeta(p: { label: string; abbrev: string; name: string; text: string | null }): PassageMeta {
	const ogTitle = `${p.label} (${p.abbrev})`;
	if (p.text === null) {
		return {
			title: `${p.label} ${p.abbrev} | ${SITE_NAME}`,
			ogTitle,
			description: `Read ${p.label} in the ${p.name} (${p.abbrev}) on ${SITE_NAME}.`
		};
	}
	return { title: verseTitle(p.label, p.abbrev, p.text), ogTitle, description: clip(p.text, 300) };
}

/** The preview image's verse box (1200 x 630 less its margins, the label and the footer). */
export const IMAGE_TEXT = { width: 1040, height: 360 };

/** Literata's average letter width and the line height, in ems: a cautious guess at how text wraps. */
const LETTER = 0.52;
const LINE = 1.4;
const SIZES = [64, 56, 48, 42, 36, 32];

/** How many characters fit the verse box at a size, by that guess. */
export const capacity = (size: number) =>
	Math.floor(IMAGE_TEXT.width / (LETTER * size)) * Math.floor(IMAGE_TEXT.height / (LINE * size));

/**
 * The verse's size on the image: the largest that holds all of it, or the smallest with the text
 * cut short at a word, ending in "…".
 */
export function imageFit(text: string): { size: number; lineHeight: number; text: string } {
	const t = text.replace(/\s+/g, ' ').trim();
	const size = SIZES.find((s) => capacity(s) >= t.length) ?? SIZES[SIZES.length - 1];
	return { size, lineHeight: Math.round(size * LINE), text: clip(t, capacity(size)) };
}
