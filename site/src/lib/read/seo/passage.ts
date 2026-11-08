/**
 * The verse or passage an address names (/read/kjv/john/3/16, /read/asv/john/3/16-18), looked up
 * for its page and its preview image alike, so the two never disagree.
 */
import { bookOf, chapterFromPath, chapterPath } from '../books';
import { chapterLabel, chapterVerses, type Book, type Core, type TranslationInfo, type VerseContent, type VerseRef } from '../core';
import { NLT_ID, NLT_INFO } from '../nlt';
import { runsText, VERSE_PAGES } from './meta';
import { parseVerseSpan, spanLabel, type VerseSpan } from './verse';

/** Translations a passage's address can name and whose words are never put in a page or image. */
export const LICENSED = [NLT_ID];

export interface Passage {
	info: TranslationInfo;
	/** The chapter's index (0–1188). */
	index: number;
	book: Book;
	/** The chapter in its book, from 1. */
	chapter: number;
	span: VerseSpan;
	refs: VerseRef[];
	/** "John 3:16", "John 3:16–18". */
	label: string;
	/** The page's address. */
	path: string;
	/** Whether the page is one of the prerendered verse pages search engines are given. */
	indexed: boolean;
	/** The verses, as the translation has them: none for a licensed translation. */
	verses: VerseContent[];
	/** Their words joined, exactly as the translation has them; null for a licensed translation. */
	text: string | null;
	/** Where in the chapter's verses the first and last verse are (bundled translations). */
	at: { from: number; to: number };
}

/** The passage, or null when the address names no translation, chapter or verses that exist. */
export async function findPassage(
	c: Core,
	params: { translation: string; book: string; chapter: string; verse: string }
): Promise<Passage | null> {
	const id = params.translation;
	const index = chapterFromPath(c.books, params.book, params.chapter);
	const span = parseVerseSpan(params.verse);
	const licensed = LICENSED.includes(id);
	if (index === null || !span || !(licensed || c.bundled.includes(id))) return null;
	const book = bookOf(c.books, index);
	const chapter = index - book.firstChapter + 1;
	const base = {
		index,
		book,
		chapter,
		span,
		label: spanLabel(chapterLabel(index), span),
		path: `${chapterPath(c.books, id, index)}/${params.verse}`,
		refs: Array.from({ length: span.to - span.from + 1 }, (_, i) => ({ book: book.index, chapter, verse: span.from + i }))
	};
	if (licensed) {
		if (span.to > chapterVerses(index)) return null;
		return { ...base, info: NLT_INFO, indexed: false, verses: [], text: null, at: { from: -1, to: -1 } };
	}
	const info = await c.load(id);
	const all = c.verses(id, index);
	// A verse joined to the next (numberEnd) holds both numbers.
	const holds = (n: number) => (v: VerseContent) => v.number <= n && n <= Math.max(v.number, v.numberEnd);
	const from = all.findIndex(holds(span.from));
	const to = all.findIndex(holds(span.to));
	if (from < 0 || to < 0) return null;
	const verses = all.slice(from, to + 1);
	return {
		...base,
		info,
		indexed: VERSE_PAGES.includes(id) && span.from === span.to,
		verses,
		text: verses.map((v) => runsText(v.runs)).join(' '),
		at: { from, to }
	};
}
