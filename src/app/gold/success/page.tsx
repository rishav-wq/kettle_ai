import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { SuccessSheet } from "./sheet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kettle Gold" };

export default async function SuccessPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/signin");

  // If the webhook already landed, the celebration is immediate. Otherwise the
  // client polls for it, because the browser often gets back before the webhook.
  return <SuccessSheet name={viewer.name} alreadyGold={viewer.state === "gold"} />;
}
