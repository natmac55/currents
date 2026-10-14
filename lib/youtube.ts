/** YouTube Shorts use /shorts/ URLs in the Atom feed; longform uses /watch?v=. */
export function isYouTubeShort(link: string): boolean {
  try {
    const url = new URL(link)
    const host = url.hostname.replace(/^www\./, "")
    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") {
      return false
    }
    return url.pathname.startsWith("/shorts/")
  } catch {
    return /youtube\.com\/shorts\//i.test(link)
  }
}

export function isYouTubeFeedUrl(feedUrl: string): boolean {
  try {
    const url = new URL(feedUrl)
    const host = url.hostname.replace(/^www\./, "")
    return (
      (host === "youtube.com" || host === "m.youtube.com") &&
      url.pathname.includes("/feeds/videos.xml")
    )
  } catch {
    return false
  }
}
