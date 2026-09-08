import { redirect } from "next/navigation";

/**
 * ToDoはカレンダー画面に統合された。
 * 古いブックマーク・リンクから来た場合もカレンダーへ流す。
 */
export default function TodosPage() {
  redirect("/calendar");
}
