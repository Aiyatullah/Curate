import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { systemDesigns } from "@/lib/db/schema";
import { DesignStudio } from "@/components/DesignStudio";

export const dynamic = "force-dynamic";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (Number.isNaN(numId)) notFound();

  const [d] = await db
    .select()
    .from(systemDesigns)
    .where(eq(systemDesigns.id, numId));
  if (!d) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/design" className="text-xs text-text-faint hover:text-text-dim">
          ← Studio
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{d.prompt}</h1>
      </div>
      <DesignStudio
        prompt={d.prompt}
        designId={d.id}
        initial={{
          requirements: d.requirements ?? "",
          scaleEstimates: d.scaleEstimates ?? "",
          dataModel: d.dataModel ?? "",
          apiDesign: d.apiDesign ?? "",
          highLevelDesign: d.highLevelDesign ?? "",
          deepDives: d.deepDives ?? "",
          tradeoffs: d.tradeoffs ?? "",
        }}
        initialReview={d.review}
      />
    </div>
  );
}
