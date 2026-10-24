const AVATAR_SIZE = 256
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const AVATAR_ACCEPT = ACCEPTED_TYPES.join(',')

/**
 * Turns the chosen file into a small square data URL (256x256, centered crop,
 * WebP). Resizing here keeps the avatar in a few KB, so it fits in the mock
 * database stored in localStorage.
 */
export async function avatarFromFile(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Use uma imagem PNG, JPG ou WebP.')
  if (file.size > MAX_FILE_BYTES) throw new Error('A imagem precisa ter no máximo 5 MB.')

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível ler essa imagem.')
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = AVATAR_SIZE
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()

  const webp = canvas.toDataURL('image/webp', 0.85)
  // Browsers without WebP encoding silently answer with PNG: JPEG stays small.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}
