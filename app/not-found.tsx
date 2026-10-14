import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-display text-sm tracking-[0.2em] text-moss uppercase">
        Field Notes
      </p>
      <h1 className="mt-4 font-display text-4xl text-ink sm:text-5xl">
        Note not found
      </h1>
      <p className="mt-4 max-w-md font-body text-lg text-ink/70">
        That slug is not in the posts module. Try the index or subscribe to the
        feed for what still exists.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          render={<Link href="/" />}
          className="h-10 rounded-md bg-ink px-5 text-paper hover:bg-ink/90"
        >
          Back home
        </Button>
        <Button
          variant="outline"
          render={<Link href="/feed.xml" />}
          className="h-10 rounded-md border-ink/20 bg-transparent px-5 text-ink hover:bg-ink/5"
        >
          Open feed
        </Button>
      </div>
    </main>
  );
}
