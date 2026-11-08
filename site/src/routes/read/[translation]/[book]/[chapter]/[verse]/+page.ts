import { error } from '@sveltejs/kit';
import { building } from '$app/env';
import { bookSlug, chapterPath, versePath } from '#lib/read/books.js';
import { CHAPTERS, chapterLabel, core, type Core, type VerseContent } from '#lib/read/core.js';
import { crumbs } from '#lib/read/seo/meta.js';
import { verseHref, versePages } from '#lib/read/seo/pages.js';
import { findPassage } from '#lib/read/seo/passage.js';
import { imagePath, passageMeta } from '#lib/read/seo/verse.js';
import { topicName, topicPath, topicsWith } from '#lib/topics/index.js';
import type { EntryGenerator, PageLoad } from './$types';

/**
 * A verse with the two before and after it, in every translation: a plain page, no app. The KJV's,
 * BSB's and WEB's single verses are prerendered (seo/meta.ts VERSE_PAGES). Every other address a
 * link can name, a passage (/read/kjv/john/3/16-18), a verse of the other four translations or of
 * the NLT, is rendered when it's asked for, so its link preview shows the verse too. Those pages
 * are kept out of search results. The load is universal, not a server load, only so the build
 * writes no __data.json beside each page (with no client-side rendering nothing would fetch it).
 */
export const prerender = 'auto';
export const csr = false;

export const entries: EntryGenerator = async () =>
	(await versePages(await core())).map(({ translation, book, chapter, verse }) => ({
		translation,
		book: bookSlug(book),
		chapter: String(chapter),
		verse: String(verse)
	}));

const CONTEXT = 2;

/** The verse before or after one, across chapters, in a translation (null at either end). */
function step(c: Core, id: string, index: number, at: number, by: -1 | 1) {
	let verses = c.verses(id, index);
	let i = at + by;
	while (i < 0 || i >= verses.length) {
		index += by;
		if (index < 0 || index >= CHAPTERS) return null;
		verses = c.verses(id, index);
		i = by < 0 ? verses.length - 1 : 0;
	}
	return { index, verse: verses[i].number };
}

export const load: PageLoad = async ({ params, setHeaders }) => {
	const c = await core();
	const p = await findPassage(c, params);
	if (!p) error(404, 'No such verse');
	// Rendered on request: the text never changes between deployments.
	if (!building) setHeaders({ 'cache-control': 'public, max-age=3600, s-maxage=86400' });

	const { info, index, label, span } = p;
	const id = info.id;
	const single = span.from === span.to;
	const trail = crumbs(info, p.book, p.chapter, single ? span.from : undefined);
	if (!single) trail.push({ name: `${span.from}–${span.to}`, path: p.path });
	const meta = {
		...passageMeta({ label, abbrev: info.abbrev, name: info.name, text: p.text }),
		path: p.path,
		crumbs: trail,
		image: imagePath(p.path),
		imageAlt: p.text === null ? `${label} (${info.abbrev})` : `${label} (${info.abbrev}): ${p.text}`,
		noindex: !p.indexed
	};
	const chapter = { label: chapterLabel(index), href: chapterPath(c.books, id, index, span.from) };

	// The NLT's words are read live in the reader and never put in a page (TRANSLATIONS.md): its
	// page names the passage and opens the reader at it.
	if (p.text === null) {
		return { kind: 'licensed' as const, meta, label, info, chapter };
	}

	const translations = await Promise.all(c.bundled.map((t) => c.load(t)));
	const verses = c.verses(id, index);
	// By number: each call to the core makes its verses afresh.
	const chosen = new Set(p.verses.map((v) => v.number));
	const near = (v: VerseContent) => ({
		number: v.number,
		runs: v.runs,
		href: versePath(c.books, id, index, v.number),
		current: chosen.has(v.number)
	});
	const link = (to: { index: number; verse: number } | null) =>
		to && {
			label: `${chapterLabel(to.index)}:${to.verse}`,
			href: versePath(c.books, id, to.index, to.verse)
		};
	const passageHref = (t: string) =>
		single ? verseHref(c.books, t, index, span.from) : `${chapterPath(c.books, t, index)}/${params.verse}`;

	return {
		kind: 'text' as const,
		meta,
		label,
		info,
		verses: p.verses.map((v) => ({ number: v.number, title: v.title, runs: v.runs })),
		chapter,
		context: verses.slice(Math.max(0, p.at.from - CONTEXT), p.at.to + CONTEXT + 1).map(near),
		prev: link(step(c, id, index, p.at.from, -1)),
		next: link(step(c, id, index, p.at.to, 1)),
		// This translation first, then the others in the reader's order. Theirs link to their own
		// verse page (or passage), or to the verse in its chapter when they have none.
		others: [info, ...translations.filter((t) => t.id !== id)].map((t) => {
			const vs = p.refs.map((r) => c.verse(t.id, r)).filter((v) => v !== null);
			const kept = vs.filter((v, i) => vs.findIndex((w) => w.number === v.number) === i);
			return {
				id: t.id,
				abbrev: t.abbrev,
				name: t.name,
				verses: kept.map((v) => ({ number: v.number, runs: v.runs })),
				href: kept.length ? passageHref(t.id) : chapterPath(c.books, t.id, index)
			};
		}),
		topics: single ? (await topicsWith(p.refs[0])).map((t) => ({ name: topicName(t), href: topicPath(t.slug) })) : [],
		copy: c.copyText(id, p.refs, 'reference') ?? `${p.text} — ${label} (${info.abbrev})`,
		// Opens the Mac app at the verse: its bible:// links take a reference as the jump field does.
		app: `bible://${encodeURI(`${chapterLabel(index)}:${params.verse}`)}?translation=${id}`
	};
};
