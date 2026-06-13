"use client";

import { useState } from "react";
import { Archive, Users } from "lucide-react";
import { archiveTrip } from "@/lib/actions/trips";
import { inviteTripMember } from "@/lib/actions/invitations";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

export function TripCardActions({ tripId, memberCount }: { tripId: string; memberCount: number }) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="grid w-full gap-2 sm:min-w-72 sm:grid-cols-2">
        <ButtonLink className="sm:col-span-2" href={`/trips/${tripId}/overview`}>Open</ButtonLink>
        <Button type="button" variant="secondary" onClick={() => setInviteOpen(true)}>
          <Users size={16} /> Invite People
        </Button>
        <form action={archiveTrip.bind(null, tripId)}>
          <Button className="w-full" type="submit" variant="ghost">
            <Archive size={16} /> Archive
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
