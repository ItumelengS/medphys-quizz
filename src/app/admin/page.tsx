import { createServiceClient } from "@/lib/supabase/server";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createServiceClient();

  const [sectionsRes, questionsRes] = await Promise.all([
    supabase.from("sections").select("*").order("sort_order"),
    supabase.from("questions").select("*").order("id"),
  ]);

  return (
    <AdminDashboard
      sections={sectionsRes.data || []}
      initialQuestions={questionsRes.data || []}
    />
  );
}
