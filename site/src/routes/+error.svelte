<!--
	A page that isn't there (a verse an address doesn't name, /read/kjv/john/3/99): the site's own
	title, description and link preview, kept out of search results.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { NAME, SITE_NAME, SITE_URL } from '#lib/config.js';

	const missing = $derived(page.status === 404);
	const title = $derived(`${missing ? 'Page not found' : 'Something went wrong'} | ${SITE_NAME}`);
	const description =
		'A very fast, native Bible reader for the Mac. Beautifully typeset, searchable as you type, with highlights, notes and bookmarks kept on your computer.';
	const image = `${SITE_URL}/og.jpg`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content="noindex" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={SITE_NAME} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={SITE_NAME} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>

<main>
	<h1>{missing ? 'Page not found' : 'Something went wrong'}</h1>
	<p>{missing ? 'There’s nothing at this address.' : 'This page couldn’t be shown.'}</p>
	<p><a href="/read">Open the reader</a> · <a href="/">{NAME} for the Mac</a></p>
</main>

<style>
	main {
		max-width: 32rem;
		margin: 20vh auto;
		padding: 0 24px;
		font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
		color: #1c1d21;
		line-height: 1.5;
	}

	h1 {
		font-size: 28px;
		margin-bottom: 8px;
	}

	a {
		color: #2d4a9e;
	}
</style>
