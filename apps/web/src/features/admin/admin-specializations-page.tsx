'use client';

import type { Specialization } from '@doksabahay/shared';
import { useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  useAdminSpecializations,
  useCreateSpecialization,
  useDeleteSpecialization,
  useUpdateSpecialization,
} from './use-admin-specializations';

interface FormState {
  name: string;
  slug: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '' };

function CreateSpecializationForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const create = useCreateSpecialization();

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(form, { onSuccess: () => setForm(EMPTY_FORM) });
      }}
      className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3"
    >
      <h2 className="font-medium sm:col-span-3">Add specialization</h2>
      {create.isError ? (
        <div className="sm:col-span-3">
          <FormAlert>{create.error.message}</FormAlert>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-spec-name">Name</Label>
        <Input
          id="new-spec-name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-spec-slug">Slug</Label>
        <Input
          id="new-spec-slug"
          placeholder="e.g. internal-medicine"
          value={form.slug}
          onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-3">
        <Label htmlFor="new-spec-description">Description</Label>
        <Textarea
          id="new-spec-description"
          rows={2}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          required
        />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </form>
  );
}

function SpecializationRow({ specialization }: { specialization: Specialization }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: specialization.name,
    slug: specialization.slug,
    description: specialization.description,
  });
  const update = useUpdateSpecialization();
  const remove = useDeleteSpecialization();

  if (editing) {
    return (
      <tr className="border-b">
        <td className="px-4 py-2" colSpan={3}>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate(
                { id: specialization.id, input: form },
                { onSuccess: () => setEditing(false) },
              );
            }}
            className="flex flex-col gap-2"
          >
            {update.isError ? <FormAlert>{update.error.message}</FormAlert> : null}
            <div className="flex flex-wrap gap-2">
              <Input
                aria-label="Name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="max-w-48"
              />
              <Input
                aria-label="Slug"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                className="max-w-48"
              />
            </div>
            <Textarea
              aria-label="Description"
              rows={2}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="px-4 py-2 align-top">
        <p className="font-medium">{specialization.name}</p>
        <p className="text-xs text-muted-foreground">{specialization.slug}</p>
      </td>
      <td className="px-4 py-2 align-top text-muted-foreground">{specialization.description}</td>
      <td className="px-4 py-2 align-top">
        <div className="flex flex-col gap-1">
          {remove.isError ? <p className="text-xs text-destructive">{remove.error.message}</p> : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(specialization.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/** `/admin/specializations`: full CRUD over the specialization catalog. */
export function AdminSpecializationsPage() {
  const specializations = useAdminSpecializations();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-muted-foreground">
          Specializations used by doctor profiles and symptom matching.
        </p>
      </div>

      <CreateSpecializationForm />

      {specializations.isPending ? <PageLoading label="Loading specializations…" /> : null}
      {specializations.isError ? (
        <PageError
          message={specializations.error.message}
          onRetry={() => void specializations.refetch()}
        />
      ) : null}
      {specializations.data && specializations.data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No specializations yet</p>
          <p className="text-sm text-muted-foreground">Add one above.</p>
        </div>
      ) : null}

      {specializations.data && specializations.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {specializations.data.map((specialization) => (
                <SpecializationRow key={specialization.id} specialization={specialization} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
