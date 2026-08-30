import EntryListPage from "@/components/EntryListPage";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;
  return <EntryListPage selectedTeamId={team} />;
}
