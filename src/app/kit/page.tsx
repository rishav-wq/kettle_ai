import { Button, Card, LessonRow, Rule, Tile } from "@/components/ui";
import { BookIcon, ChatIcon, HeartIcon, PersonIcon, PlayIcon, SearchIcon, ShieldIcon, StarIcon } from "@/components/icons";
import { KitInteractive } from "./interactive";

export const metadata = { title: "Component kit", robots: { index: false } };

/**
 * Every reusable piece on one page. Not linked from the product; it exists so a
 * change to a component is checked here once rather than on six screens.
 */
export default function KitPage() {
  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-2">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-violet">Kettle · component kit</span>
        <h1 className="text-[1.8rem] font-bold">Violet on near-white</h1>
        <p className="text-ink-2">Cards, pills, and one gradient reserved for headers and the closing call to action.</p>
      </header>

      <Kit title="Buttons">
        <div className="flex flex-col gap-3">
          <Button full size="lg">Primary, large</Button>
          <Button full>Primary</Button>
          <Button full variant="soft">Soft</Button>
          <Button full variant="ghost">Ghost</Button>
          <div className="grad rounded-card p-4">
            <Button variant="onGrad" full>On a gradient</Button>
          </div>
        </div>
      </Kit>

      <Kit title="Icons">
        <div className="flex flex-wrap gap-3">
          {[BookIcon, StarIcon, HeartIcon, PersonIcon, SearchIcon, PlayIcon, ShieldIcon, ChatIcon].map((Icon, i) => (
            <span key={i} className="grid h-12 w-12 place-items-center rounded-[16px] bg-paper text-violet shadow-s">
              <Icon className="h-6 w-6" />
            </span>
          ))}
        </div>
      </Kit>

      <Kit title="Lesson rows">
        <div className="flex flex-col gap-2.5">
          <LessonRow index={1} title="What AI is, in plain words" meta="4 min · Watched" done href="#" />
          <LessonRow index={2} title="Make your question clear" meta="7 min · 3 min left" progress={0.42} current href="#" />
          <LessonRow index={3} title="Is the answer right?" meta="6 min" href="#" />
          <LessonRow index={4} title="Ask by voice, not typing" meta="8 min · Gold" locked href="#" />
        </div>
      </Kit>

      <Kit title="Tiles">
        <div className="grid grid-cols-2 gap-4">
          <Tile href="#" image="/art/spot-a-scam.svg" title="Spot a scam call" meta="5 min" badge="Free" />
          <Tile href="#" image="/art/plan-a-pooja.svg" title="Plan a pooja" meta="4 min" />
        </div>
      </Kit>

      <Kit title="Card">
        <Card className="flex flex-col gap-2 p-5">
          <Rule />
          <h3 className="text-[1.1rem] font-bold">A white card</h3>
          <p className="text-[0.92rem] text-ink-2">The pink rule marks where a card&apos;s content begins.</p>
        </Card>
      </Kit>

      <KitInteractive />
    </main>
  );
}

function Kit({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[1.05rem] font-bold">{title}</h2>
      {children}
    </section>
  );
}
