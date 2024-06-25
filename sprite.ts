import { $ } from "bun"
import { mkdirSync, rmSync } from "fs"
import { parseArgs } from "util"

// Width of a single thumbnail in seconds
const thumbWidth = 320
// Height of a single Thumbnail in seconds
const thumbHeight = 180
// Time interval between thumbnails in seconds
const thumbInterval = 10
// Rows in sprites
const spriteRows = 10
// Cols in sprites
const spriteCols = 10
// ffmpeg pattern for the thumnails images
const thumbnailsPattern = "thumbs/%04d.png"
// ffmpeg pattern for the sprite images
const spritesPattern = "sprites/%03d.jpg"

async function getVideoDuration(inputPath: string) {
  const s =
    await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath}`.text()
  return Math.ceil(Number.parseFloat(s))
}

async function generateThumbnails(inputPath: string) {
  rmSync("thumbs/", { recursive: true, force: true })
  mkdirSync("thumbs/")
  await $`ffmpeg -hwaccel cuda -i ${inputPath} -vf fps=1/${thumbInterval} -s ${thumbWidth}x${thumbHeight} ${thumbnailsPattern}`.quiet()
}

async function generateSprites() {
  rmSync("sprites/", { recursive: true, force: true })
  mkdirSync("sprites/")
  await $` ffmpeg -i ${thumbnailsPattern} -filter_complex tile=${spriteRows}x${spriteCols} -q:v 2 ${spritesPattern}`.quiet()
}

type Thumbnail = { start: number; end: number; file: number; startX: number; startY: number }

function generateThumbInfo(videoDuration: number) {
  const thumbnailCount = Math.floor(videoDuration / thumbInterval)
  const thumbnailsPerSprite = spriteRows * spriteCols
  const spriteFileCount = Math.ceil(thumbnailCount / thumbnailsPerSprite)

  console.log("thumbs total:", thumbnailCount)
  console.log("thumbs per sprite:", thumbnailsPerSprite)
  console.log("sprites:", spriteFileCount)

  const thumbs: Array<Thumbnail> = []

  for (let sprite = 0; sprite < spriteFileCount; sprite++) {
    let time = sprite * thumbnailsPerSprite * thumbInterval
    for (let row = 0; row < spriteRows; row++) {
      for (let col = 0; col < spriteCols; col++) {
        if (thumbs.length === thumbnailCount) break
        thumbs.push({
          start: time,
          end: (time += 10),
          file: sprite + 1,
          startX: col * thumbWidth,
          startY: row * thumbHeight,
        })
      }
    }
  }

  return thumbs
}

function secondsToTimestamp(duration: number, withMillis = true): string {
  return new Date(duration * 1000).toISOString().slice(11, withMillis ? 23 : 19)
}

function padNumber(n: number, p = 2): string {
  return String(n).padStart(p, "0")
}

function getThumbUrl(thumb: Thumbnail) {
  return `sprites/${padNumber(thumb.file, 3)}.jpg#xywh=${thumb.startX},${
    thumb.startY
  },${thumbWidth},${thumbHeight}`
}

function generateVTT(thumbs: Array<Thumbnail>): string {
  let vtt = "WEBVTT"
  for (const thumb of thumbs) {
    vtt += `\n\n${secondsToTimestamp(thumb.start)} --> ${secondsToTimestamp(thumb.end)}\n`
    vtt += getThumbUrl(thumb)
  }
  return vtt
}

type JSONCue = { startTime: number; endTime: number; text: string }

function generateJSON(thumbs: Array<Thumbnail>): Array<JSONCue> {
  return thumbs.map((t) => ({ startTime: t.start, endTime: t.end, text: getThumbUrl(t) }))
}

const { positionals } = parseArgs({
  args: Bun.argv.slice(2),
  strict: true,
  allowPositionals: true,
})

if (positionals.length === 0) {
  throw new Error("Please provide path to input file")
}

const path = positionals[0]

const duration = await getVideoDuration(path)
console.log("Video duration (s):", duration)
console.log("Generating thumbnails, this will take a few minutes")
await generateThumbnails(path)
console.log("Generating thumbnail sprites")
await generateSprites()
console.log("Generating thumbnails VTT and JSON files")
const thumbs = generateThumbInfo(duration)
const vtt = generateVTT(thumbs)
await Bun.write("thumbnails.vtt", vtt)
const json = generateJSON(thumbs)
await Bun.write("thumbnails.json", JSON.stringify(json))

console.log("Done!")
