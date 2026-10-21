export type VideoSource =
  | { kind: "youtube"; embed: string }
  | { kind: "vimeo"; embed: string }
  | { kind: "file"; src: string }
  | { kind: "none" };

const YT = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i;
const VIMEO = /^(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)(?:\/([\w]+))?/i;

/** Classifies a lesson video URL: privacy-friendly embeds for YouTube/Vimeo, `<video>` for everything else. */
export function parseVideoSource(url: string | null | undefined): VideoSource {
  const u = (url ?? "").trim();
  if (!u) return { kind: "none" };
  const yt = YT.exec(u);
  if (yt) return { kind: "youtube", embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  const vm = VIMEO.exec(u);
  if (vm) return { kind: "vimeo", embed: `https://player.vimeo.com/video/${vm[1]}?dnt=1${vm[2] ? `&h=${vm[2]}` : ""}` };
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("/")) return { kind: "file", src: u };
  return { kind: "none" };
}

export function isPdf(url: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(url);
}

export function isHttpUrl(url: string | null | undefined): boolean {
  return !!url && /^https?:\/\//i.test(url.trim());
}
