import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FEATURE_AREAS,
  FEATURE_AREA_LABELS,
  RATINGS,
  type Competitor,
  type FeatureArea,
  type Rating,
} from '../domain/competitor';
import {
  emptyFormValues,
  toFormValues,
  validate,
  type CompetitorFormValues,
  type FormErrors,
} from '../domain/competitor-form';

interface CompetitorFormProps {
  mode: 'create' | 'edit';
  /** The record being edited; required (and only used) when `mode === 'edit'`. */
  initial?: Competitor;
  /** Called with valid values; the caller persists + closes on success. */
  onSubmit: (values: CompetitorFormValues) => void;
  onClose: () => void;
  submitting: boolean;
  /** A persist failure to surface inline; the dialog stays open. */
  error: string | null;
}

/**
 * Add/edit competitor form as a native `<dialog>` modal (M7, FR-5/FR-6). Thin:
 * it holds controlled field state and runs `validate` for inline errors, but the
 * value→competitor conversion + persistence live in the caller (`App`) over the
 * pure `competitor-form` + `competitors-api` modules. Website is read-only on
 * edit — changing it would change the id, which the API rejects.
 */
export default function CompetitorForm({
  mode,
  initial,
  onSubmit,
  onClose,
  submitting,
  error,
}: CompetitorFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<CompetitorFormValues>(() =>
    mode === 'edit' && initial ? toFormValues(initial) : emptyFormValues(),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  // Open as a true modal (focus trap + backdrop) once mounted.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const setRating = (area: FeatureArea, rating: Rating) =>
    setValues((v) => ({ ...v, features: { ...v.features, [area]: rating } }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  };

  const isEdit = mode === 'edit';

  return (
    <dialog ref={dialogRef} className="form-dialog" onClose={onClose} onCancel={onClose}>
      <form className="competitor-form" onSubmit={handleSubmit}>
        <h2>{isEdit ? 'Edit competitor' : 'Add competitor'}</h2>

        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            aria-invalid={errors.name !== undefined}
            autoFocus={!isEdit}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label className="field">
          <span>Website</span>
          <input
            type="url"
            value={values.website}
            onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
            readOnly={isEdit}
            aria-invalid={errors.website !== undefined}
          />
          {isEdit ? (
            <span className="field-hint">
              The website is the record’s identity — delete and re-create to change it.
            </span>
          ) : (
            errors.website && <span className="field-error">{errors.website}</span>
          )}
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          />
        </label>

        <fieldset className="field-features">
          <legend>Feature ratings</legend>
          {FEATURE_AREAS.map((area) => (
            <label key={area} className="field-rating">
              <span>{FEATURE_AREA_LABELS[area]}</span>
              <select
                value={values.features[area]}
                onChange={(e) => setRating(area, e.target.value as Rating)}
              >
                {RATINGS.map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
