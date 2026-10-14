import { resolveFeedUrl } from "@/lib/resolve-feed-url"

export async function POST(request: Request) {
  let body: { url?: string }
  try {
    body = (await request.json()) as { url?: string }
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const url = body.url?.trim()
  if (!url) {
    return Response.json({ error: "Provide a url" }, { status: 400 })
  }

  try {
    const resolved = await resolveFeedUrl(url)
    return Response.json(resolved)
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not resolve that URL",
      },
      { status: 400 }
    )
  }
}
