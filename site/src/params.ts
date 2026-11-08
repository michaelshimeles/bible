import { defineParams } from '@sveltejs/kit/params';

// Node loads this file on its own while building, so it can't import from #lib.
export const params = defineParams({
	/** Shaped like a book in the reader's URLs ("john", "1-corinthians"); the route checks it's one. */
	book: (param) => (/^(?:[1-3]-)?[a-z]+(?:-[a-z]+)*$/.test(param) ? param : undefined),
	/** A chapter or verse number. */
	number: (param) => (/^[1-9]\d*$/.test(param) ? param : undefined),
	/** A verse, or a passage in one chapter ("16-18"): seo/verse.ts `parseVerseSpan` checks it runs forwards. */
	verses: (param) => (/^[1-9]\d*(?:-[1-9]\d*)?$/.test(param) ? param : undefined)
});
