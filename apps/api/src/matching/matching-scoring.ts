/**
 * Pure, deterministic symptom-to-specialization scoring. No database access,
 * no `Math.random`, no `Date.now()` — same input always produces the same
 * `{ urgent, specializations }` output (see `matching-scoring.spec.ts`'s
 * determinism test). Fetching the symptoms/keywords/specializations this
 * runs over, and looking up doctors for the result, is `MatchingService`'s
 * job.
 */

/** A selected symptom with the specialization rules that apply to it. */
export interface ScoredSymptomInput {
  id: string;
  name: string;
  isRedFlag: boolean;
  rules: { specializationId: string; weight: number }[];
}

/** A `MatchingKeyword` row. `specializationId` is null for red-flag-only keywords. */
export interface KeywordInput {
  phrase: string;
  specializationId: string | null;
  weight: number;
  isRedFlag: boolean;
}

/** A specialization id -> name lookup, used to render results and break ties. */
export interface SpecializationLookupInput {
  id: string;
  name: string;
}

/** One symptom name or matched phrase that contributed to a specialization's score. */
export interface MatchExplanationEntry {
  type: 'symptom' | 'phrase';
  label: string;
  weight: number;
}

/** One ranked specialization suggestion. */
export interface SpecializationScore {
  specializationId: string;
  name: string;
  score: number;
  explanation: MatchExplanationEntry[];
}

export interface ScoreMatchInput {
  selectedSymptoms: ScoredSymptomInput[];
  /** Free-text description, not yet normalized. */
  description: string | undefined;
  /** All `MatchingKeyword` rows to test the description against. */
  keywords: KeywordInput[];
  specializations: SpecializationLookupInput[];
  /** The resolved id of the "General Practice" specialization, if it exists. */
  generalPracticeSpecializationId: string | undefined;
}

export interface MatchResult {
  urgent: boolean;
  specializations: SpecializationScore[];
}

const MAX_RESULTS = 3;

/**
 * Lowercases, strips punctuation (keeping letters, digits and whitespace)
 * and collapses whitespace, so keyword phrases can be matched on word
 * boundaries regardless of the original punctuation/casing.
 */
export function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns the keywords whose `phrase` occurs in `normalizedDescription` on
 * word boundaries — e.g. the phrase "rash" matches "a rash on my arm" but
 * not "brash", since there is no word boundary between "b" and "r". Each
 * matching keyword is returned once, regardless of how many times its
 * phrase occurs. `normalizedDescription` must already be normalized (see
 * {@link normalizeDescription}); phrases are assumed already lowercase (the
 * DB enforces this with a CHECK constraint).
 */
export function matchKeywordPhrases(
  normalizedDescription: string,
  keywords: KeywordInput[],
): KeywordInput[] {
  if (!normalizedDescription) return [];
  return keywords.filter((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword.phrase).replace(/ /g, '\\s+')}\\b`, 'u');
    return pattern.test(normalizedDescription);
  });
}

function addExplanation(
  explanations: Map<string, MatchExplanationEntry[]>,
  specializationId: string,
  entry: MatchExplanationEntry,
): void {
  const list = explanations.get(specializationId);
  if (list) {
    list.push(entry);
  } else {
    explanations.set(specializationId, [entry]);
  }
}

/**
 * Scores specializations against the selected symptoms and free-text
 * description, ranks them, and detects urgency.
 *
 * 1. Each selected symptom adds its `SymptomSpecializationRule.weight` to
 *    that rule's specialization.
 * 2. The description is normalized and matched against every keyword phrase
 *    on word boundaries; each matched phrase with a `specializationId` adds
 *    its `weight` once (not once per occurrence).
 * 3. `urgent` is true if any selected symptom or matched phrase is a red flag.
 * 4. Specializations are ranked by score descending, tie-broken by name
 *    ascending, keeping the top 3 with `score > 0`. If none score above 0,
 *    falls back to a single "General Practice" result (score 0, no
 *    explanation) when {@link ScoreMatchInput.generalPracticeSpecializationId}
 *    is given.
 */
export function scoreMatch(input: ScoreMatchInput): MatchResult {
  const scores = new Map<string, number>();
  const explanations = new Map<string, MatchExplanationEntry[]>();
  let urgent = false;

  for (const symptom of input.selectedSymptoms) {
    if (symptom.isRedFlag) urgent = true;
    for (const rule of symptom.rules) {
      scores.set(rule.specializationId, (scores.get(rule.specializationId) ?? 0) + rule.weight);
      addExplanation(explanations, rule.specializationId, {
        type: 'symptom',
        label: symptom.name,
        weight: rule.weight,
      });
    }
  }

  const normalized = normalizeDescription(input.description ?? '');
  for (const keyword of matchKeywordPhrases(normalized, input.keywords)) {
    if (keyword.isRedFlag) urgent = true;
    if (!keyword.specializationId) continue;
    scores.set(
      keyword.specializationId,
      (scores.get(keyword.specializationId) ?? 0) + keyword.weight,
    );
    addExplanation(explanations, keyword.specializationId, {
      type: 'phrase',
      label: keyword.phrase,
      weight: keyword.weight,
    });
  }

  const nameById = new Map(input.specializations.map((s) => [s.id, s.name]));
  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .map(([specializationId, score]) => ({
      specializationId,
      name: nameById.get(specializationId) ?? specializationId,
      score,
      explanation: explanations.get(specializationId) ?? [],
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_RESULTS);

  if (ranked.length === 0 && input.generalPracticeSpecializationId) {
    const id = input.generalPracticeSpecializationId;
    return {
      urgent,
      specializations: [
        {
          specializationId: id,
          name: nameById.get(id) ?? 'General Practice',
          score: 0,
          explanation: [],
        },
      ],
    };
  }

  return { urgent, specializations: ranked };
}
