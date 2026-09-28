'use client';

import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DoctorSummaryCard } from '@/features/doctors/doctor-summary-card';
import { cn } from '@/lib/utils';

import { useSuggestMatch } from './use-suggest-match';
import { useSymptoms } from './use-symptoms';

type Step = 'symptoms' | 'description' | 'results';

const DISCLAIMER = 'Suggestions are not a diagnosis.';

/**
 * `/patient/find-care`: a 3-step wizard — pick symptoms, add an optional
 * description, then see ranked specialization + doctor suggestions from
 * `POST /matching/suggest`. If the response is `urgent`, an emergency banner
 * is shown above the results.
 */
export function FindCarePage() {
  const symptoms = useSymptoms();
  const suggestMatch = useSuggestMatch();

  const [step, setStep] = useState<Step>('symptoms');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState('');

  function toggleSymptom(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function submit(): void {
    suggestMatch.mutate(
      { symptomIds: [...selectedIds], description: description.trim() || undefined },
      { onSuccess: () => setStep('results') },
    );
  }

  function startOver(): void {
    setSelectedIds(new Set());
    setDescription('');
    suggestMatch.reset();
    setStep('symptoms');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Find care</h1>
        <p className="text-muted-foreground">
          Tell us what&rsquo;s going on and we&rsquo;ll suggest specializations and doctors.
        </p>
      </div>

      {step === 'symptoms' ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">What symptoms are you experiencing?</h2>

          {symptoms.isPending ? <PageLoading label="Loading symptoms…" /> : null}
          {symptoms.isError ? (
            <PageError message={symptoms.error.message} onRetry={() => void symptoms.refetch()} />
          ) : null}

          {symptoms.data && symptoms.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No symptoms are available right now.</p>
          ) : null}

          {symptoms.data?.map((group) => (
            <div key={group.category} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">{group.category}</h3>
              <div className="flex flex-wrap gap-2">
                {group.symptoms.map((symptom) => {
                  const selected = selectedIds.has(symptom.id);
                  return (
                    <button
                      key={symptom.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleSymptom(symptom.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input hover:bg-muted',
                      )}
                    >
                      {symptom.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{selectedIds.size} selected</p>
            <Button type="button" onClick={() => setStep('description')} disabled={!symptoms.data}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'description' ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Anything else? (optional)</h2>
          <Textarea
            rows={5}
            maxLength={1000}
            placeholder="Describe what you're feeling in your own words…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {suggestMatch.isError ? (
            <p className="text-sm text-destructive">{suggestMatch.error.message}</p>
          ) : null}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setStep('symptoms')}>
              Back
            </Button>
            <Button type="button" onClick={submit} disabled={suggestMatch.isPending}>
              {suggestMatch.isPending ? 'Finding suggestions…' : 'Get suggestions'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'results' && suggestMatch.data ? (
        <div className="flex flex-col gap-6">
          {suggestMatch.data.urgent ? (
            <Alert variant="destructive">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>This may be a medical emergency</AlertTitle>
              <AlertDescription>
                If you or someone else is experiencing a medical emergency, contact your local
                emergency services immediately. Do not wait for an online consultation.
              </AlertDescription>
            </Alert>
          ) : null}

          <p className="text-sm text-muted-foreground">{DISCLAIMER}</p>

          {suggestMatch.data.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              We couldn&rsquo;t find a specific suggestion. Consider general practice.
            </p>
          ) : null}

          {suggestMatch.data.results.map((result) => (
            <div
              key={result.specializationId}
              className="flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{result.name}</h3>
                {result.score > 0 ? <Badge variant="secondary">Score {result.score}</Badge> : null}
              </div>

              {result.explanation.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {result.explanation.map((entry, index) => (
                    <Badge key={`${entry.type}-${entry.label}-${index}`} variant="outline">
                      {entry.label} (+{entry.weight})
                    </Badge>
                  ))}
                </div>
              ) : null}

              {result.doctors.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.doctors.map((doctor) => (
                    <DoctorSummaryCard key={doctor.id} doctor={doctor} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bookable doctors right now.</p>
              )}
            </div>
          ))}

          <div>
            <Button type="button" variant="outline" onClick={startOver}>
              Start over
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
