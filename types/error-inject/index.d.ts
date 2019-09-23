import { Stream } from "stream"

declare function inject(stream: Stream, error: (error: Error) => void): Stream

export = inject