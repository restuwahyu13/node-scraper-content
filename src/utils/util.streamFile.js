const { createWriteStream } = require('fs')
const { resolve } = require('path')

exports.streamFile = ({ nameFile, content, pathFile, extFile }) => {
	const writeStream = createWriteStream(
		resolve(process.cwd(), `../../contents/${pathFile}/${pathFile}-${nameFile}-${Date.now()}.${extFile}`)
	)
		.on('finish', () => console.log('write file stream compelete'))
		.on('error', () => console.log('write file stream failed'))

	writeStream.write(content, (error) => {
		if (error) return new Error(error)
	})

	writeStream.end()
}
