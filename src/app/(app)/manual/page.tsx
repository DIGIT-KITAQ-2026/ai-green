import EntryListPage from "@/components/EntryListPage";

export default async function ManualPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;
  return (
    <EntryListPage
      type="manual"
      newHref="/manual/new"
      detailBasePath="/manual"
      selectedTeamId={team}
    />
  );
}
