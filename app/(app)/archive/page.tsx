import { Suspense } from "react";
import { ArchiveView } from "@/components/archive/ArchiveView";
import { fetchArchiveTickets, fetchDeletedTickets, fetchReference } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PAID_KEY } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Archive · Starsound Service Board" };

export default async function ArchivePage() {
  const supabase = await createClient();
  const reference = await fetchReference(supabase);
  const paid = reference.columns.find((c) => c.key === PAID_KEY);
  const [tickets, deleted] = await Promise.all([paid ? fetchArchiveTickets(supabase, paid.id) : Promise.resolve([]), fetchDeletedTickets(supabase)]);
  return (
    <Suspense fallback={null}>
      <ArchiveView reference={reference} initialTickets={tickets} initialDeleted={deleted} />
    </Suspense>
  );
}
