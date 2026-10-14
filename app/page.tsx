import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllPosts } from "@/lib/posts";

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function Home() {
  const posts = getAllPosts();

  return (
    <>
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-16 pt-28 sm:justify-center sm:pb-24 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-field" />
          <div className="absolute -left-1/4 top-[-10%] h-[55vmin] w-[55vmin] rounded-full bg-moss/25 blur-3xl animate-drift" />
          <div className="absolute -right-1/5 bottom-[-5%] h-[45vmin] w-[45vmin] rounded-full bg-clay/30 blur-3xl animate-drift-slow" />
          <div className="absolute inset-0 opacity-[0.35] mix-blend-multiply [background-image:radial-gradient(circle_at_1px_1px,oklch(0.35_0.04_145_/_0.35)_1px,transparent_0)] [background-size:22px_22px]" />
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <p className="animate-fade-up font-display text-5xl leading-none tracking-tight text-ink sm:text-7xl md:text-8xl">
            Field Notes
          </p>
          <h1 className="animate-fade-up animation-delay-1 mt-6 max-w-xl font-display text-2xl leading-snug text-ink/90 text-balance sm:text-3xl">
            Short engineering notes, dated and readable in any feed reader.
          </h1>
          <p className="animate-fade-up animation-delay-2 mt-4 max-w-md font-body text-lg leading-relaxed text-ink/65">
            A small publishing surface with a real RSS 2.0 feed that mirrors
            every note on this site.
          </p>
          <div className="animate-fade-up animation-delay-3 mt-8 flex flex-wrap gap-3">
            <Button
              render={<a href="/feed.xml" />}
              className="h-11 rounded-md bg-ink px-6 font-body text-base text-paper hover:bg-ink/90"
            >
              Subscribe via RSS
            </Button>
            <Button
              variant="outline"
              render={<a href="#notes" />}
              className="h-11 rounded-md border-ink/25 bg-paper/40 px-6 font-body text-base text-ink backdrop-blur-sm hover:bg-paper/70"
            >
              Browse notes
            </Button>
          </div>
        </div>
      </section>

      <section
        id="notes"
        className="relative border-t border-ink/10 bg-paper/55 px-6 py-20 backdrop-blur-[2px] sm:py-28"
      >
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Latest notes
          </h2>
          <p className="mt-3 max-w-lg font-body text-base text-ink/60">
            Same titles and dates as the feed — open a note or subscribe once.
          </p>

          <ul className="mt-12 space-y-0 divide-y divide-ink/10">
            {posts.map((post, index) => (
              <li
                key={post.slug}
                className="animate-fade-up group py-8 first:pt-0"
                style={{ animationDelay: `${0.05 * index + 0.1}s` }}
              >
                <Link
                  href={`/notes/${post.slug}`}
                  className="block outline-none focus-visible:ring-2 focus-visible:ring-moss/50 focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
                >
                  <time
                    dateTime={post.date}
                    className="font-body text-sm text-ink/50"
                  >
                    {formatDisplayDate(post.date)}
                  </time>
                  <h3 className="mt-2 font-display text-2xl text-ink transition-colors group-hover:text-moss sm:text-[1.75rem]">
                    {post.title}
                  </h3>
                  <p className="mt-2 max-w-2xl font-body text-base leading-relaxed text-ink/65">
                    {post.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-ink/10 px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 font-body text-sm text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <span>Field Notes</span>
          <a
            href="/feed.xml"
            className="text-moss underline-offset-4 hover:text-ink hover:underline"
          >
            /feed.xml
          </a>
        </div>
      </footer>
    </>
  );
}
