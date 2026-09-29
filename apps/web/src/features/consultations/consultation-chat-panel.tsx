'use client';

import { MESSAGE_BODY_MAX_LENGTH, SessionState } from '@doksabahay/shared';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

import { useConsultationMessages, useSendConsultationMessage } from './use-consultation-messages';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Chat panel for the consultation workspace. Locked until the doctor starts
 * the consultation (`IN_PROGRESS`) — matching `ConsultationMessagesService`'s
 * own gate — then stays open for both reading and sending; once
 * `COMPLETED`, history remains visible but sending is disabled. Falls back
 * to polling while `connected` (the shared socket's state) is `false`.
 */
export function ConsultationChatPanel({
  appointmentId,
  sessionState,
  connected,
}: {
  appointmentId: string;
  sessionState: SessionState;
  connected: boolean;
}) {
  const { user } = useAuth();
  const unlocked = sessionState === SessionState.IN_PROGRESS || sessionState === SessionState.COMPLETED;
  const canSend = sessionState === SessionState.IN_PROGRESS;
  const messages = useConsultationMessages(appointmentId, unlocked, !connected);
  const send = useSendConsultationMessage();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.data]);

  if (!unlocked) {
    return (
      <p className="text-sm text-muted-foreground">
        Chat unlocks once the doctor starts the consultation.
      </p>
    );
  }

  const submit = (): void => {
    const body = draft.trim();
    if (!body || send.isPending) {
      return;
    }
    send.mutate({ appointmentId, body }, { onSuccess: () => setDraft('') });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {messages.isPending ? <p className="text-sm text-muted-foreground">Loading messages…</p> : null}
      {messages.isError ? <FormAlert>{messages.error.message}</FormAlert> : null}

      <div
        ref={listRef}
        className="flex max-h-80 min-h-32 flex-col gap-2 overflow-y-auto rounded-lg border p-3"
      >
        {messages.data && messages.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : null}
        {messages.data?.map((message) => {
          const isOwn = message.senderId === user?.id;
          return (
            <div key={message.id} className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm break-words',
                  isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {message.body}
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
            </div>
          );
        })}
      </div>

      {send.error ? <FormAlert>{send.error.message}</FormAlert> : null}

      {canSend ? (
        <div className="flex gap-2">
          <Textarea
            value={draft}
            maxLength={MESSAGE_BODY_MAX_LENGTH}
            rows={2}
            placeholder="Type a message…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button type="button" onClick={submit} disabled={send.isPending || draft.trim().length === 0}>
            Send
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          This consultation has ended. The chat is now read-only.
        </p>
      )}
    </div>
  );
}
