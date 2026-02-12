import { app } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Get icons directory path
function getIconsDirectory(): string {
  return join(app.getPath('userData'), 'icons')
}

// Ensure icons directory exists
async function ensureIconsDirectory(): Promise<void> {
  const iconsDir = getIconsDirectory()
  try {
    await fs.access(iconsDir)
  } catch {
    await fs.mkdir(iconsDir, { recursive: true })
  }
}

// Save uploaded icon and return filename
export async function saveCustomIcon(base64Data: string): Promise<string> {
  await ensureIconsDirectory()

  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Image, 'base64')

  // Generate unique filename
  const filename = `${uuidv4()}.png`
  const filepath = join(getIconsDirectory(), filename)

  // Save file
  await fs.writeFile(filepath, buffer)

  return filename
}

// Get full path to custom icon
export function getCustomIconPath(filename: string): string {
  return join(getIconsDirectory(), filename)
}

// Delete custom icon file
export async function deleteCustomIcon(filename: string): Promise<void> {
  const filepath = join(getIconsDirectory(), filename)
  try {
    await fs.unlink(filepath)
  } catch (error) {
    console.error('Failed to delete custom icon:', error)
  }
}
