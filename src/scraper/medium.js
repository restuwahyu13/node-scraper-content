const puppeteer = require('puppeteer')
const { puppeteerPlugin } = require('../utils/util.puppeteer')
const { streamFile } = require('../utils/util.streamFile')
const { screenshot } = require('../utils/util.screenShoot')

const scrapperContents = async (page) => {
	/**
	 * @description GET ALL DATE POST CONTENT
	 */

	await page.waitForSelector('.js-postListHandle .ui-caption time', { timeout: 50000 })
	const datePostContents = await page.evaluate(() => {
		const datePost = []
		const datePostLists = document.querySelectorAll('.js-postListHandle .ui-caption time', { timeout: 50000 })
		datePostLists.forEach((element) => datePost.push(element.getAttribute('datetime')))
		return datePost
	})

	/**
	 * @description GET ALL AUTHORS CONTENT
	 */

	await page.waitForSelector('.js-postListHandle .postMetaInline .u-accentColor--textDarken', { timeout: 50000 })
	const authorContents = await page.evaluate(() => {
		const authors = []
		const authorsLists = document.querySelectorAll('.js-postListHandle .postMetaInline .u-accentColor--textDarken')
		authorsLists.forEach((element) => authors.push(element.innerText))
		return authors
	})

	/**
	 * @description GET ALL AVATARS CONTENT
	 */

	await page.waitForSelector('.js-postListHandle .postMetaInline-avatar img', { timeout: 50000 })
	const avatarContents = await page.evaluate(() => {
		const avatars = []
		const avatarsLists = document.querySelectorAll('.js-postListHandle .postMetaInline-avatar img')
		avatarsLists.forEach((element) => avatars.push(element.src))
		return avatars
	})

	/**
	 * @description GET ALL TITLES CONTENT
	 */

	await page.waitForSelector('.js-postListHandle .section-inner h3', { timeout: 50000 })
	const titleContents = await page.evaluate(() => {
		const titles = []
		const titlesLists = document.querySelectorAll('.js-postListHandle .section-inner h3')
		titlesLists.forEach((element) => titles.push(element.innerText))
		return titles
	})

	/**
	 * @description GET ALL THUMBNAILS CONTENT
	 */

	await page.waitForSelector('.js-postListHandle .section-inner img', { timeout: 50000 })
	const thumbnailsContents = await page.evaluate(() => {
		const thumbnails = []
		const thumbnailsLists = document.querySelectorAll('.js-postListHandle .section-inner img')
		thumbnailsLists.forEach((element) => element.src != '' && thumbnails.push(element.src))
		return thumbnails
	})

	/**
	 * @description GET ALL LIKES CONTENT
	 */

	await page.waitForSelector('.js-postListHandle .u-floatLeft .u-background', { timeout: 50000 })
	const likeContents = await page.evaluate(() => {
		const likes = []
		const likesLists = document.querySelectorAll('.js-postListHandle .u-floatLeft .u-background')
		likesLists.forEach((element) => likes.push(element.innerText))
		return likes
	})

	return {
		datePosts: datePostContents,
		authors: authorContents,
		avatars: avatarContents,
		titles: titleContents,
		thumbnails: thumbnailsContents,
		likes: likeContents
	}
}

const scraperRunner = async () => {
	try {
		/**
		 * @description init all plugin puppeteer middleware
		 */

		puppeteerPlugin.stealthPlugin()
		puppeteerPlugin.adblokerAds()
		puppeteerPlugin.anonymizeUserAgent()

		/**
		 * @description SETUP PUPPETEER
		 */

		const browser = await puppeteer.launch({
			headless: false,
			args: ['--no-sandbox', '--allow-third-party-modules', '--start-maximized'],
			slowMo: 10
		})

		const context = await browser.createIncognitoBrowserContext()
		const page = await context.newPage()
		await page.setBypassCSP(true)
		await page.setRequestInterception(true)
		await page.on('request', (req) => {
			if (!req.isNavigationRequest()) {
				req.continue()
				return
			}

			const headers = req.headers()
			headers['Access-Control-Allow-Origins'] = '*'
			headers['Accept'] = 'application/json'
			headers['Accept-Encoding'] = 'gzip, br'
			headers['Content-Type'] = 'application/json'
			headers['Cache-Control'] = 'no-cache'
			headers['User-Agent'] = 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:15.0) Gecko/20100101 Firefox/15.0.1'

			req.continue({ ...headers })
		})
		await page.setViewport({ width: 1024, height: 600 })
		await page.goto('https://medium.com/search', { waitUntil: 'networkidle2' })

		/**
		 * @description GOTO MEDIUM SEARCH CONTENT
		 */

		await page.waitForSelector('.js-searchInput')
		await page.focus('.js-searchInput')
		await page.type('.js-searchInput', 'react', { delay: 100 })
		await page.keyboard.press(String.fromCharCode(13))

		/**
		 * @description GOTO MEDIUM SEARCH CONTENT SCROLL
		 */

		const scrollDelay = await page.evaluate(() => Math.floor(Math.random(document.body.scrollHeight / 2) * 1000))
		const scrollDown = Math.floor(Math.random(120 / 2) * 1000)

		await page.waitForSelector('.js-postListHandle', { timeout: 50000 })
		await puppeteerPlugin.autoScrollDown(page, 200, scrollDelay)
		await Promise.race([
			await puppeteerPlugin.pendingXHR(page).waitForAllXhrFinished(),
			new Promise((resolve) => setTimeout(resolve, scrollDelay))
		])

		/**
		 * @description GET ALL LINK CONTENT
		 */

		await page.waitForSelector('.js-postListHandle .postArticle-content a', { timeout: 50000 })
		const contens = await scrapperContents(page)
		const linkContents = await page.evaluate(() => {
			const links = []
			const linksList = document.querySelectorAll('.js-postListHandle .postArticle-content a')
			linksList.forEach((element) => links.push(element.href))
			return links
		})

		/**
		 * @description CREATE JSON FOR ALL MEDIUM CONTENT
		 */

		streamFile({
			nameFile: 'example',
			content: JSON.stringify({
				datePosts: contens.datePosts,
				authors: contens.authors,
				avatars: contens.avatars,
				titles: contens.titles,
				thumbnails: contens.thumbnails,
				likes: contens.likes,
				links: linkContents
			}),
			pathFile: 'medium',
			extFile: 'json'
		})

		/**
		 * @description SCREENSHOOT CONTENT AND COUNT CONTENT SCRAPE
		 */

		console.log('scrape content count:' + linkContents.length)
		await screenshot(page, '../../screenshoot')

		/**
		 * @description CLOSE BROWSER AFTER SCRAPE
		 */
		await browser.close()
	} catch (err) {
		console.log(`'Puppeteer Error Detencted -> ${err}'`)
	}
}

scraperRunner()
