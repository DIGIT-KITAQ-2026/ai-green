import EntryListPage from "@/components/EntryListPage";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; error?: string }>;
}) {
  const { team, error } = await searchParams;
  return <EntryListPage selectedTeamId={team} error={error} />;
}
