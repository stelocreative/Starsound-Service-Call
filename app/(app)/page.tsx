import { Suspense } from "react";
import { Board } from "@/components/board/Board";
import { fetchBoardData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const supabase = await createClient();
  const data = await fetchBoardData(supabase);
  return (
    <Suspense fallback={null}>
      <Board initial={data} />
    </Suspense>
  );
}
