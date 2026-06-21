"use client";

import { useState } from "react";
import { Archive, CircleCheck, Users } from "lucide-react";
import { archiveTrip, completeTrip } from "@/lib/actions/trips";
import { inviteTripMember } from "@/lib/actions/invitations";
import type { TripStatus } from "@/lib/db/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

export function TripCardActions({
  tripId,
  memberCount,
  tripStatus = "planning",
}: {
  tripId: string;
  memberCount: number;
  tripStatus?: TripStatus;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const canComplete = tripStatus === "planning" || tripStatus === "active";

  return (
    <>
      <div className="grid w-full gap-3">
        <ButtonLink className="min-h-12 w-full text-sm" href={`/trips/${tripId}/overview`}>Open</ButtonLink>
        <Button
          className="min-h-11 w-full border-slate-400/70 bg-white/55 text-sm shadow-none hover:bg-white/80 dark:bg-white/10"
          type="button"
          variant="secondary"
          onClick={() => setInviteOpen(true)}
        >
          <Users size={16} /> Invite People
        </Button>
        {canComplete ? (
          <form
            action={completeTrip.bind(null, tripId)}
            onSubmit={(event) => {
              if (!window.confirm("Complete this trip? It will become read-only.")) {
                event.preventDefault();
              }
            }}
          >
            <Button className="min-h-11 w-full text-sm shadow-none" type="submit" variant="secondary">
              <CircleCheck size={16} />
              Complete Trip
            </Button>
          </form>
        ) : null}
        <form
          action={archiveTrip.bind(null, tripId)}
          onSubmit={(event) => {
            if (!window.confirm("Archive this trip? You can restore it later from Archived.")) {
              event.preventDefault();
            }
          }}
        >
          <Button className="mx-auto min-h-10 px-4 text-sm shadow-none" type="submit" variant="ghost" aria-label="Archive trip">
            <Archive size={16} />
            Archive
          </Button>
        </form>
      </div>

      <IOSBottomSheet open={inviteOpen} title="Invite People" onClose={() => setInviteOpen(false)}>
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">{memberCount} current member(s)</p>
        <form action={inviteTripMember.bind(null, tripId)} className="grid gap-4">
          <Field label="Email"><Input name="email" type="email" required placeholder="friend@example.com" /></Field>
          <Field label="Role">
            <Select name="role" defaultValue="viewer">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </Select>
          </Field>
          <Button type="submit">Send Invite</Button>
        </form>
      </IOSBottomSheet>
    </>
  );
}
