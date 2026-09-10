"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function selectTeamAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teamId = String(formData.get("teamId") ?? "");
  const supabase = await createClient();

  const { data: team } = teamId
    ? await supabase.from("teams").select("id").eq("id", teamId).maybeSingle()
    : { data: null };

  if (!team) {
    redirect(`/onboarding/team?error=${encodeURIComponent("所属を選択してください")}`);
  }

  await supabase.from("profiles").update({ team_id: team!.id }).eq("id", user!.id);

  redirect("/");
}
