import { createTodoAction } from "@/app/actions/todos";
import SubmitButton from "./SubmitButton";

/** ToDoの追加フォーム。期限は任意。 */
export default function TodoQuickAdd({
  from,
  withDueDate = true,
}: {
  from: string;
  withDueDate?: boolean;
}) {
  return (
    <form action={createTodoAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="from" value={from} />
      <input
        name="title"
        required
        placeholder="やることを追加…"
        aria-label="やること"
        className="field-input min-w-0 flex-1 basis-48 py-2 text-sm"
      />
      {withDueDate && (
        <input
          type="date"
          name="dueDate"
          aria-label="期限（任意）"
          className="field-input w-auto shrink-0 py-2 text-sm"
        />
      )}
      <SubmitButton
        pendingLabel="追加中…"
        className="btn-secondary shrink-0 px-5 py-2 text-sm"
      >
        追加
      </SubmitButton>
    </form>
  );
}
