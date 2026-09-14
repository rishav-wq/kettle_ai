import { Button } from "@/components/ui";
import { T } from "@/components/bilingual";

export const metadata = { title: "Offline" };

/**
 * What the installed app shows with no connection.
 *
 * It says plainly that videos need a connection, because the honest answer is
 * better than a spinner. Lessons stream and cannot be stored for later; if
 * offline viewing ever becomes a promise, paid videos have to move to a
 * provider that allows downloads.
 */
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center gap-5 bg-ground px-7 text-center lg:gap-6">
      <span aria-hidden className="text-[2.4rem] leading-none">📶</span>
      <h1 className="text-[1.5rem] font-bold leading-tight">
        <T hi="अभी connection नहीं है" en="No connection right now" />
      </h1>
      <p className="max-w-[32ch] leading-relaxed text-ink-2">
        <T
          hi="वीडियो के लिए connection चाहिए। जैसे ही आप वापस online होंगे, यह पेज फिर चलने लगेगा।"
          en="Videos need a connection. This page will work again as soon as you are back online."
        />
      </p>
      <div className="w-full max-w-[320px] pt-2">
        <Button href="/learn" full size="lg">
          <T hi="फिर कोशिश कीजिए" en="Try again" />
        </Button>
      </div>
    </main>
  );
}
