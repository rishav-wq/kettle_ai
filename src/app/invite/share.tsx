"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { T } from "@/components/bilingual";
import { ChatIcon } from "@/components/icons";

/**
 * Sharing is the growth loop, and for this audience the loop runs on WhatsApp.
 */
export function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const link = typeof window === "undefined" ? "" : `${window.location.origin}/i/${code}`;
  const message = `I have started learning AI on Kettle, in short videos. Have a look, the first four lessons are free: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${code} — ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col items-center gap-2 px-5 py-7">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-ink-3">
          <T hi="आपका code" en="Your code" />
        </span>
        {/* data-referral-code is what the smoke test reads, so the check does not
            break every time the styling changes. */}
        <p data-referral-code={code} className="text-[2rem] font-bold leading-none tracking-[0.14em] text-violet">
          {code}
        </p>
      </Card>

      <Button full size="lg" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")}>
        <ChatIcon className="h-5 w-5" />
        <T hi="WhatsApp पर भेजिए" en="Send on WhatsApp" />
      </Button>
      <Button full variant="soft" onClick={() => void copy()}>
        {copied ? <T hi="कॉपी हो गया" en="Copied" /> : <T hi="code कॉपी कीजिए" en="Copy the code" />}
      </Button>
    </div>
  );
}
