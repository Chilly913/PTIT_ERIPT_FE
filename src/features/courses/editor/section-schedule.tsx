"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { courseMessages as m } from "../messages";
import type { Section } from "../types";
import { fromLocalInput, toLocalInput } from "../utils";

const t = m.curriculum;

/** Sets when learners may start (and stop) opening the lessons of one section. */
export function SectionScheduleDialog({ section, onClose, onSaved }: { section: Section; onClose: () => void; onSaved: (s: { opens_at: string | null; closes_at: string | null }) => void }) {
  const [opens, setOpens] = useState(toLocalInput(section.opens_at));
  const [closes, setCloses] = useState(toLocalInput(section.closes_at));
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api.put(`/sections/${section.id}`, { opens_at: fromLocalInput(opens), closes_at: fromLocalInput(closes) }),
    onSuccess: () => {
      onSaved({ opens_at: fromLocalInput(opens), closes_at: fromLocalInput(closes) });
      onClose();
    },
    onError: (e) => setError(isApiError(e) ? e.errors?.closes_at?.[0] ?? e.message : m.common.loadError),
  });
  function submit() {
    setError(null);
    if (opens && closes && new Date(closes) <= new Date(opens)) return setError(m.info.scheduleInvalid);
    save.mutate();
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={t.scheduleTitle(section.title)}
      description={t.scheduleHint}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{m.common.cancel}</Button>
          <Button onClick={submit} loading={save.isPending}>{m.common.save}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label={t.sectionOpens}><DateTimePicker value={opens} onChange={(v) => setOpens(v)} /></Field>
        <Field label={t.sectionCloses}><DateTimePicker value={closes} onChange={(v) => setCloses(v)} /></Field>
        {(opens || closes) && <button type="button" className="text-sm font-medium text-primary underline underline-offset-2" onClick={() => { setOpens(""); setCloses(""); }}>{t.scheduleClear}</button>}
      </div>
    </Dialog>
  );
}
