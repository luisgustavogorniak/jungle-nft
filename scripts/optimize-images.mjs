// Generates the WebP variants used by the app from the original artworks.
//   design-assets/nfts/<name>.png  ->  src/assets/nfts/<name>-480.webp (cards, thumbnails)
//                                      src/assets/nfts/<name>-960.webp (hero, detail)
// Run with `npm run assets:optimize` after adding or changing an original.
import { mkdir, readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = 'design-assets/nfts'
const OUTPUT_DIR = 'src/assets/nfts'
const WIDTHS = [480, 960]

await mkdir(OUTPUT_DIR, { recursive: true })
for (const file of await readdir(SOURCE_DIR)) {
  if (extname(file).toLowerCase() !== '.png') continue
  const name = basename(file, extname(file))
  for (const width of WIDTHS) {
    const output = join(OUTPUT_DIR, `${name}-${width}.webp`)
    const info = await sharp(join(SOURCE_DIR, file)).resize({ width }).webp({ quality: 80 }).toFile(output)
    console.log(`${output}  ${(info.size / 1024).toFixed(0)} KB`)
  }
}
