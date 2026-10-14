import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Note not found · Field Notes" };
  }
  return {
    title: `${post.title} · Field Notes`,
    description: post.summary,
  };
}

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    notFound();
  }

  return (
    <article className="relative mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-24">
      <nav className="animate-fade-up mb-10">
        <Button
          variant="link"
          render={<Link href="/" />}
          className="h-auto px-0 font-body text-sm text-moss hover:text-ink"
        >
          ← Field Notes
        </Button>
      </nav>

      <header className="animate-fade-up animation-delay-1">
        <time
          dateTime={post.date}
          className="font-body text-sm tracking-wide text-ink/55"
        >
          {formatDisplayDate(post.date)}
        </time>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink text-balance sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 font-body text-lg leading-relaxed text-ink/70">
          {post.summary}
        </p>
      </header>

      <div className="animate-fade-up animation-delay-2 mt-10 space-y-5 border-t border-ink/10 pt-10">
        {post.body.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="font-body text-lg leading-relaxed text-ink/85"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
