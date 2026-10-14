import { Suspense } from "react";
import { ArchiveView } from "@/components/archive/ArchiveView";
import { fetchArchiveTickets, fetchReference } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PAID_KEY } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Archive · Starsound Service Board" };

export default async function ArchivePage() {
  const supabase = await createClient();
  const reference = await fetchReference(supabase);
  const paid = reference.columns.find((c) => c.key === PAID_KEY);
  const tickets = paid ? await fetchArchiveTickets(supabase, paid.id) : [];
  return (
    <Suspense fallback={null}>
      <ArchiveView reference={reference} initialTickets={tickets} />
    </Suspense>
  );
}
