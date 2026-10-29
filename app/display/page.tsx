import { LobbyDisplay } from "@/components/display/LobbyDisplay";

export const metadata = { title: "Lobby display · Starsound Service Board" };

/** Public, view-only board for the lobby TV. The key in the URL is checked by the database. */
export default async function DisplayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const key = typeof params.key === "string" ? params.key.trim() : "";
  return <LobbyDisplay displayKey={key} />;
}
