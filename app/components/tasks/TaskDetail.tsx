"use client";

import { useState } from "react";
import { Timer, Trash2, X } from "lucide-react";
import { deleteTask, updateTask, type Priority, type Task, type TaskList } from "@/app/lib/stores/tasks";
import { timerActions } from "@/app/context/TimerContext";
import { Modal } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Field";
import { RichText } from "../ui/RichText";
import { Subtasks } from "./Subtasks";
import { Button, IconButton } from "../ui/Button";
import { Segmented } from "../ui/Segmented";
import { PRIORITY_COLOR, PRIORITY_LABEL, TaskCheck } from "./TaskRow";

export function TaskDetail({ task, lists, onClose }: { task: Task | null; lists: TaskList[]; onClose: () => void }) {
  // Keep showing the last task while the sheet animates out.
  const [shown, setShown] = useState(task);
  if (task && task !== shown) setShown(task);
  const t = task ?? shown;

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title="Task"
      footer={
        t && (
          <>
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                deleteTask(t.id);
                onClose();
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
            {!t.done && (
              <Button
                variant="soft"
                onClick={() => {
                  timerActions.setTask(t.id);
                  timerActions.start();
                  onClose();
                }}
              >
                <Timer className="size-4" /> Focus
              </Button>
            )}
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </>
        )
      }
    >
      {t && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="pt-2.5">
              <TaskCheck task={t} />
            </div>
            <Input
              value={t.title}
              onChange={(e) => updateTask(t.id, { title: e.target.value })}
              className="text-[17px] font-bold"
              aria-label="Title"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Due date">
              <div className="flex gap-2">
                <Input type="date" value={t.due ?? ""} onChange={(e) => updateTask(t.id, { due: e.target.value || null })} />
                {t.due && (
                  <IconButton label="Clear date" variant="secondary" onClick={() => updateTask(t.id, { due: null })}>
                    <X />
                  </IconButton>
                )}
              </div>
            </Field>
            <Field label="List">
              <Select value={t.listId} onChange={(e) => updateTask(t.id, { listId: e.target.value })}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Priority">
            <Segmented<string>
              value={String(t.priority)}
              onChange={(v) => updateTask(t.id, { priority: Number(v) as Priority })}
              options={[0, 1, 2, 3].map((p) => ({
                value: String(p),
                label: (
                  <>
                    <span className="size-2 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
                    {PRIORITY_LABEL[p]}
                  </>
                ),
              }))}
              className="w-full"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg-2">Subtasks</span>
            <Subtasks task={t} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-fg-2">Notes</span>
            <RichText key={t.id} value={t.notes} onChange={(html) => updateTask(t.id, { notes: html })} />
          </div>
        </div>
      )}
    </Modal>
  );
}
