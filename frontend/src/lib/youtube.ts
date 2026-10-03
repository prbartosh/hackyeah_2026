export function youtubeId(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/]+)/)
        id = m?.[1] ?? null
      }
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null
  } catch {
    return null
  }
}
