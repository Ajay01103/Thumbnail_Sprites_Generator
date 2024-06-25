import "@vidstack/react/player/styles/default/theme.css"
import "@vidstack/react/player/styles/default/layouts/video.css"

import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react"
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default"

export default function Home() {
  const textTracks = [
    [
      {
        src: "https://files.vidstack.io/sprite-fight/subs/english.vtt",
        label: "English",
        language: "en-US",
        kind: "subtitles",
        type: "vtt",
        default: true,
      },
      {
        src: "https://files.vidstack.io/sprite-fight/subs/spanish.vtt",
        label: "Spanish",
        language: "es-ES",
        kind: "subtitles",
        type: "vtt",
      },
      {
        src: "https://files.vidstack.io/sprite-fight/chapters.vtt",
        language: "en-US",
        kind: "chapters",
        type: "vtt",
        default: true,
      },
    ],
  ]
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <MediaPlayer
        title="Sprite Fight"
        src="https://files.vidstack.io/sprite-fight/hls/stream.m3u8"
      >
        <MediaProvider>
          <Poster className="vds-poster" />
          {textTracks.map((track) => (
            //@ts-ignore
            <Track
              {...track}
              key={track.src}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout
          thumbnails="/thumbnails.vtt"
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
    </main>
  )
}
