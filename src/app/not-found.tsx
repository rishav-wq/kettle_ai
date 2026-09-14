import { Button } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { T } from "@/components/bilingual";

/**
 * The default 404 is unstyled and looks like a crash. This one looks like the
 * product and offers the one route that is always useful.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center gap-5 bg-ground px-7 text-center lg:gap-6">
      <Wordmark href="/" size="sm" className="text-violet" />
      <h1 className="text-[1.6rem] font-bold leading-tight">
        <T hi="वह पेज नहीं मिला" en="We could not find that page" />
      </h1>
      <p className="max-w-[32ch] leading-relaxed text-ink-2">
        <T
          hi="पता बदल गया होगा, या link अधूरा रह गया होगा। नीचे से कोर्स देखिए।"
          en="The address may have changed, or the link may be incomplete. Try the courses below."
        />
      </p>
      <div className="flex w-full max-w-[320px] flex-col gap-2.5 pt-2">
        <Button href="/learn" full size="lg">
          <T hi="कोर्स देखिए" en="See the courses" />
        </Button>
        <Button href="/help" variant="soft" full>
          <T hi="मदद लीजिए" en="Get help" />
        </Button>
      </div>
    </main>
  );
}
