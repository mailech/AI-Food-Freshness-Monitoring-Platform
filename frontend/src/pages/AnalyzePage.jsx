/**
 * Food analysis workflow — the platform's flagship page.
 *
 * Steps: select batch → upload image → enter storage context → analyse →
 * animated progress → results (score, category, confidence, spoilage, shelf
 * life, storage score, health score) → recommendations.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { analysisApi, batchApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useDebounced, useDocumentTitle } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  ProgressSteps,
  ScoreRing,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '../components/ui';
import {
  AIAnalysisPanel,
  IndicatorList,
  ProtectedImage,
  RecommendationList,
  ScoreExplanation,
  ShelfLifeCard,
} from '../components/domain';
import { ScoreComponentRadar } from '../charts';
import {
  Camera,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import {
  categoryIcon,
  formatDate,
  formatPercent,
  formatQuantity,
  titleise,
} from '../utils/format';

const STEPS = ['Select product', 'Upload image', 'Storage details', 'Analyse', 'Results'];

const PIPELINE_STAGES = [
  'Validating and decoding the image',
  'Resizing and normalising illumination',
  'Segmenting the food region',
  'Extracting colour statistics',
  'Extracting texture descriptors',
  'Detecting spoilage indicators',
  'Classifying freshness',
  'Predicting remaining shelf life',
  'Scoring and generating recommendations',
];

/* --------------------------------------------------------------- step 1 */
function BatchPicker({ onSelect, selected }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 350);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    batchApi
      .list({ q: debounced || undefined, page_size: 12, sort_by: 'created_at', sort_dir: 'desc' })
      .then((data) => !cancelled && setBatches(data.items))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="space-y-3">
      <Field label="Search your batches" htmlFor="batch-search">
        <Input
          id="batch-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Product name, batch number, location…"
        />
      </Field>

      {error && <ErrorState error={error} />}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-content-tertiary">
          <Spinner size="sm" /> Loading batches…
        </div>
      ) : batches.length ? (
        <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {batches.map((batch) => (
            <li key={batch.id}>
              <button
                type="button"
                onClick={() => onSelect(batch)}
                className={clsx(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                  selected?.id === batch.id
                    ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.07)] ring-2 ring-[rgb(var(--accent)/0.25)]'
                    : 'border-edge-subtle hover:border-[rgb(var(--accent)/0.4)] hover:bg-[rgb(var(--accent)/0.07)]/50',
                )}
              >
                <span aria-hidden="true" className="text-xl">
                  {categoryIcon(batch.product?.category_slug)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-content-primary">
                    {batch.product?.name}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-content-tertiary">
                    {batch.batch_number}
                  </span>
                  <span className="mt-1 block text-xs text-content-tertiary">
                    {formatQuantity(batch.quantity, batch.unit)} · expires{' '}
                    {formatDate(batch.expected_expiry_date)}
                  </span>
                </span>
                {batch.current_freshness_category && (
                  <StatusBadge status={batch.current_freshness_category} showIcon={false} />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="▦"
          title="No batches found"
          description="Create a batch first — every analysis is attached to a batch so its history is tracked."
          action={
            <Link to="/batches/new">
              <Button size="sm">Create a batch</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- step 2 */
function ImageDropzone({ file, previewUrl, onFile, onClear, constraints }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);

  const accept = (constraints.allowed_extensions || ['.jpg', '.jpeg', '.png']).join(',');
  const maxBytes = (constraints.max_mb || 10) * 1024 * 1024;

  const validate = useCallback(
    (candidate) => {
      if (!candidate) return 'No file selected.';
      const extension = `.${candidate.name.split('.').pop()?.toLowerCase()}`;
      if (!(constraints.allowed_extensions || ['.jpg', '.jpeg', '.png']).includes(extension)) {
        return `Unsupported file type "${extension}". Allowed: ${accept}.`;
      }
      if (candidate.size > maxBytes) {
        return `The file is ${(candidate.size / 1024 / 1024).toFixed(1)} MB; the limit is ${constraints.max_mb} MB.`;
      }
      return null;
    },
    [accept, constraints.allowed_extensions, constraints.max_mb, maxBytes],
  );

  function handleFiles(files) {
    const candidate = files?.[0];
    const problem = validate(candidate);
    setLocalError(problem);
    if (!problem) onFile(candidate);
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={clsx(
          'relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
          dragging ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.07)]' : 'border-edge bg-surface-sunken',
        )}
      >
        {previewUrl ? (
          <div className="relative">
            <img src={previewUrl} alt="Selected food preview" className="max-h-80 w-full object-contain" />
            <div className="absolute right-3 top-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button variant="danger" size="sm" onClick={onClear}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 px-6 py-12 text-center"
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-2xl
                bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent-ink))]"
            >
              <Camera className="h-6 w-6" />
            </span>
            <span className="text-sm font-medium text-content-primary">
              Drop a photo here, or click to choose a file
            </span>
            <span className="text-xs text-content-tertiary">
              {accept} · up to {constraints.max_mb} MB
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {localError && (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {localError}
        </p>
      )}

      {file && !localError && (
        <p className="mt-2 text-xs text-content-tertiary">
          {file.name} · {(file.size / 1024).toFixed(0)} KB
        </p>
      )}

      <InlineNotice tone="neutral" className="mt-3">
        <p className="text-xs leading-relaxed">
          <strong className="font-semibold">Tips for a useful analysis:</strong> fill the frame with the
          food, use even lighting, avoid heavy shadows and keep the camera steady. Blurry images
          reduce the reported confidence.
        </p>
      </InlineNotice>
    </div>
  );
}

/* --------------------------------------------------------------- step 4 */
/** Premium AI scanning experience: the image under a live CV treatment. */
function AnalysingState({ stage, previewUrl }) {
  return <AIAnalysisPanel previewUrl={previewUrl} stages={PIPELINE_STAGES} current={stage} />;
}

/* -------------------------------------------------------------- results */
function ResultsView({ result, onAnalyseAnother }) {
  const assessment = result.assessment;
  const { weights } = useMeta();

  return (
    <div className="space-y-4">
      <InlineNotice tone="warning" title={result.analysis_label}>
        {result.disclaimer}
      </InlineNotice>

      {/* headline numbers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex flex-wrap items-center gap-6">
              <ScoreRing
                score={assessment.freshness_score}
                size={132}
                label={titleise(assessment.freshness_category)}
                sublabel={`${formatPercent(assessment.confidence, { fromFraction: true })} confidence`}
              />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={assessment.freshness_category} />
                  {assessment.model?.is_demo && <DemoBadge label={assessment.model.label} />}
                </div>
                <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-content-tertiary">Spoilage probability</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-content-primary">
                      {formatPercent(assessment.spoilage_probability, { fromFraction: true })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-content-tertiary">Overall health score</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-content-primary">
                      {assessment.overall_health_score === null
                        ? '—'
                        : `${Math.round(assessment.overall_health_score)}/100`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-content-tertiary">Product quality score</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-content-primary">
                      {assessment.quality_score === null || assessment.quality_score === undefined
                        ? '—'
                        : `${Math.round(assessment.quality_score)}/100`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-content-tertiary">Storage score</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-content-primary">
                      {assessment.components?.storage === null
                        ? '—'
                        : `${Math.round(assessment.components.storage)}/100`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-content-tertiary">Remaining shelf life</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums text-content-primary">
                      {result.shelf_life
                        ? `${Number(result.shelf_life.remaining_shelf_life_days).toFixed(1)} d`
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Component balance" subtitle="The four weighted inputs" />
          <CardBody>
            <ScoreComponentRadar components={assessment.components || {}} height={230} />
          </CardBody>
        </Card>
      </div>

      {/* images + overlay */}
      {(assessment.image_url || assessment.overlay_url) && (
        <Card>
          <CardHeader
            title="Visual explanation"
            subtitle="Detected regions are outlined on the analysed image"
          />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              {assessment.image_url && (
                <figure>
                  <ProtectedImage
                    path={assessment.image_url}
                    alt="Analysed food image"
                    className="h-56 w-full rounded-xl border border-edge-subtle object-contain bg-surface-sunken"
                  />
                  <figcaption className="mt-1.5 text-xs text-content-tertiary">Original upload</figcaption>
                </figure>
              )}
              {assessment.overlay_url && (
                <figure className="relative">
                  <ProtectedImage
                    path={assessment.overlay_url}
                    alt="Analysis overlay with detected regions highlighted"
                    className="h-56 w-full rounded-xl border border-edge-subtle object-contain bg-surface-sunken"
                  />
                  <span className="pointer-events-none absolute left-2 top-2">
                    <span className="badge bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.25)]">
                      <ScanLine className="h-3 w-3" aria-hidden="true" />
                      Detected regions
                    </span>
                  </span>
                  <figcaption className="mt-1.5 text-xs text-content-tertiary">
                    Detected regions and food outline (baseline detector)
                  </figcaption>
                </figure>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* explainability */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreExplanation assessment={assessment} weights={weights} />

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Detected visual indicators"
              subtitle="Spoilage signals found by the image analysis"
            />
            <CardBody>
              <IndicatorList indicators={assessment.indicators || []} />
            </CardBody>
          </Card>

          {result.shelf_life && <ShelfLifeCard prediction={result.shelf_life} />}
        </div>
      </div>

      {/* feature summary */}
      {assessment.explanation?.feature_summary && (
        <Card>
          <CardHeader
            title="Measured image features"
            subtitle="The raw descriptors the estimate was derived from"
          />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              {['color', 'texture', 'segmentation'].map((group) => {
                const values = assessment.explanation.feature_summary[group];
                if (!values) return null;
                return (
                  <div key={group}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                      {titleise(group)}
                    </p>
                    <dl className="mt-2 space-y-1 text-xs">
                      {Object.entries(values).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-3">
                          <dt className="truncate text-content-tertiary">{titleise(key)}</dt>
                          <dd className="flex-none font-mono tabular-nums text-content-primary">
                            {typeof value === 'number' ? value.toFixed(3) : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>

            {assessment.explanation.feature_summary.dominant_colors?.length > 0 && (
              <div className="mt-4 border-t border-edge-subtle pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                  Dominant colours
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {assessment.explanation.feature_summary.dominant_colors.map((colour) => (
                    <div key={colour.hex} className="flex items-center gap-2 rounded-lg border border-edge-subtle px-2 py-1">
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: colour.hex }}
                      />
                      <span className="font-mono text-xs text-content-secondary">{colour.hex}</span>
                      <span className="text-xs text-content-tertiary">
                        {formatPercent(colour.share, { fromFraction: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assessment.explanation.pipeline_steps?.length > 0 && (
              <div className="mt-4 border-t border-edge-subtle pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                  Pipeline stages executed
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assessment.explanation.pipeline_steps.map((step) => (
                    <Badge key={step} className="bg-surface-sunken text-content-secondary ring-edge-subtle">
                      {titleise(step)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* recommendations */}
      <Card>
        <CardHeader
          title="Recommendations"
          subtitle="Explainable, rule-based actions for this batch"
        />
        <CardBody>
          <RecommendationList recommendations={result.recommendations || []} />
        </CardBody>
      </Card>

      {/* alerts raised */}
      {result.alerts_raised?.length > 0 && (
        <Card>
          <CardHeader title="Alerts raised" subtitle="Automatically generated from this analysis" />
          <CardBody>
            <ul className="space-y-2">
              {result.alerts_raised.map((alert) => (
                <li key={alert.id} className="rounded-xl border border-amber-300/60 dark:border-amber-400/22 bg-amber-50 dark:bg-amber-500/8 p-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">{alert.message}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onAnalyseAnother} icon={<RotateCcw />}>
          Analyse another item
        </Button>
        <Link to={`/batches/${assessment.batch_id}`}>
          <Button variant="secondary">Open batch detail</Button>
        </Link>
        <Link to="/reports">
          <Button variant="ghost">Generate a report</Button>
        </Link>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- page */
export default function AnalyzePage() {
  useDocumentTitle('Analyse food');
  const { upload, packagingOptions, airCirculationOptions, lightExposureOptions, categoryBySlug } =
    useMeta();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(0);
  const [batch, setBatch] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [form, setForm] = useState({
    temperature: '',
    humidity: '',
    packaging: '',
    airCirculation: '',
    lightExposure: '',
    storageDurationDays: '',
    notes: '',
  });
  const [analysing, setAnalysing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const stageTimer = useRef(null);

  // Deep link: /analyze?batch=123
  const requestedBatch = searchParams.get('batch');
  useEffect(() => {
    if (!requestedBatch || batch) return;
    batchApi
      .get(Number(requestedBatch))
      .then((data) => {
        setBatch(data);
        setStep(1);
      })
      .catch(() => {
        /* fall back to manual selection */
      });
  }, [requestedBatch, batch]);

  // Prefill the storage form from the batch's current condition.
  useEffect(() => {
    if (!batch) return;
    const condition = batch.storage_condition?.current;
    setForm((current) => ({
      ...current,
      temperature: condition?.temperature_c ?? current.temperature ?? '',
      humidity: condition?.humidity_pct ?? current.humidity ?? '',
      packaging: batch.packaging_type || current.packaging || '',
      airCirculation: condition?.air_circulation || current.airCirculation || '',
      lightExposure: condition?.light_exposure || current.lightExposure || '',
    }));
  }, [batch]);

  useEffect(() => () => stageTimer.current && clearInterval(stageTimer.current), []);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const categoryProfile = useMemo(
    () => (batch?.product?.category_slug ? categoryBySlug[batch.product.category_slug] : null),
    [batch, categoryBySlug],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseFile(candidate) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(candidate);
    setPreviewUrl(candidate ? URL.createObjectURL(candidate) : null);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep(0);
    setBatch(null);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setPipelineStage(0);
  }

  async function runAnalysis() {
    if (!batch || !file) {
      toast.warning('Select a batch and upload an image first.');
      return;
    }
    setError(null);
    setAnalysing(true);
    setStep(3);
    setPipelineStage(0);

    // Animate the pipeline stages while the request is in flight. Purely
    // indicative: the real stage list comes back in the response.
    stageTimer.current = setInterval(() => {
      setPipelineStage((current) => Math.min(current + 1, PIPELINE_STAGES.length - 1));
    }, 420);

    try {
      const response = await analysisApi.analyzeImage({
        file,
        batchId: batch.id,
        temperature: form.temperature,
        humidity: form.humidity,
        airCirculation: form.airCirculation || undefined,
        lightExposure: form.lightExposure || undefined,
        packaging: form.packaging || undefined,
        storageDurationDays: form.storageDurationDays,
        notes: form.notes || undefined,
      });
      clearInterval(stageTimer.current);
      setPipelineStage(PIPELINE_STAGES.length);
      setResult(response);
      setStep(4);
      toast.success(
        `Analysis complete: ${Math.round(response.assessment.freshness_score)}/100 (${titleise(
          response.assessment.freshness_category,
        )}).`,
      );
    } catch (err) {
      clearInterval(stageTimer.current);
      setError(err);
      setStep(2);
      toast.apiError(err, 'The analysis could not be completed.');
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Analyse Food"
        description="Upload a photo and the storage context to get an explainable freshness score, spoilage indicators and a shelf-life estimate."
        actions={
          result && (
            <Button variant="secondary" size="sm" onClick={reset}>
              Start over
            </Button>
          )
        }
      />

      <ProgressSteps steps={STEPS} current={step} className="mb-5" />

      {analysing ? (
        <AnalysingState stage={pipelineStage} previewUrl={previewUrl} />
      ) : result ? (
        <ResultsView result={result} onAnalyseAnother={reset} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* ---------------------------------------- step 1: batch */}
            <Card>
              <CardHeader
                title="Step 1 — Select the product"
                subtitle="Analyses are attached to a batch so freshness history is tracked over time"
                actions={
                  batch && (
                    <Button variant="ghost" size="sm" onClick={() => setBatch(null)}>
                      Change
                    </Button>
                  )
                }
              />
              <CardBody>
                {batch ? (
                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.07)] p-4">
                    <span aria-hidden="true" className="text-2xl">
                      {categoryIcon(batch.product?.category_slug)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-content-primary">
                        {batch.product?.name}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-content-tertiary">{batch.batch_number}</p>
                      <p className="mt-1 text-xs text-content-secondary">
                        {formatQuantity(batch.quantity, batch.unit)} ·{' '}
                        {batch.product?.category_name || titleise(batch.product?.category_slug)} · expires{' '}
                        {formatDate(batch.expected_expiry_date)}
                      </p>
                    </div>
                    {batch.current_freshness_category && (
                      <StatusBadge status={batch.current_freshness_category} />
                    )}
                  </div>
                ) : (
                  <BatchPicker
                    selected={batch}
                    onSelect={(selected) => {
                      setBatch(selected);
                      setStep(1);
                    }}
                  />
                )}
              </CardBody>
            </Card>

            {/* ---------------------------------------- step 2: image */}
            <Card>
              <CardHeader
                title="Step 2 — Upload the food image"
                subtitle="JPG or PNG. The image is validated server-side before analysis."
              />
              <CardBody>
                <ImageDropzone
                  file={file}
                  previewUrl={previewUrl}
                  constraints={upload}
                  onFile={(candidate) => {
                    chooseFile(candidate);
                    setStep((current) => Math.max(current, 2));
                  }}
                  onClear={() => chooseFile(null)}
                />
              </CardBody>
            </Card>

            {/* ------------------------------------ step 3: conditions */}
            <Card>
              <CardHeader
                title="Step 3 — Storage details"
                subtitle="These feed the storage and shelf-life components of the score"
              />
              <CardBody className="space-y-4">
                {categoryProfile && (
                  <InlineNotice tone="info" title={`Recommended for ${categoryProfile.name}`}>
                    Temperature {categoryProfile.storage_rule.temp_min_c}–
                    {categoryProfile.storage_rule.temp_max_c} °C, humidity{' '}
                    {categoryProfile.storage_rule.humidity_min_pct}–
                    {categoryProfile.storage_rule.humidity_max_pct}%.{' '}
                    {categoryProfile.storage_rule.notes}
                  </InlineNotice>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Storage temperature (°C)" htmlFor="temperature">
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="-40"
                      max="80"
                      value={form.temperature}
                      onChange={(event) => update('temperature', event.target.value)}
                      placeholder="4.0"
                    />
                  </Field>
                  <Field label="Relative humidity (%)" htmlFor="humidity">
                    <Input
                      id="humidity"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={form.humidity}
                      onChange={(event) => update('humidity', event.target.value)}
                      placeholder="85"
                    />
                  </Field>
                  <Field label="Packaging type" htmlFor="packaging">
                    <Select
                      id="packaging"
                      value={form.packaging}
                      onChange={(event) => update('packaging', event.target.value)}
                    >
                      <option value="">Not specified</option>
                      {packagingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Storage duration (days)" htmlFor="duration" hint="Leave blank to derive from the batch dates">
                    <Input
                      id="duration"
                      type="number"
                      step="0.5"
                      min="0"
                      value={form.storageDurationDays}
                      onChange={(event) => update('storageDurationDays', event.target.value)}
                      placeholder="3"
                    />
                  </Field>
                  <Field label="Air circulation" htmlFor="circulation">
                    <Select
                      id="circulation"
                      value={form.airCirculation}
                      onChange={(event) => update('airCirculation', event.target.value)}
                    >
                      <option value="">Not specified</option>
                      {airCirculationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Light exposure" htmlFor="light">
                    <Select
                      id="light"
                      value={form.lightExposure}
                      onChange={(event) => update('lightExposure', event.target.value)}
                    >
                      <option value="">Not specified</option>
                      {lightExposureOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Notes" htmlFor="notes" hint="Optional context recorded with the assessment">
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    placeholder="Observed a soft patch near the stem…"
                  />
                </Field>
              </CardBody>
            </Card>

            {error && <ErrorState error={error} title="Analysis failed" />}
          </div>

          {/* -------------------------------------------- summary rail */}
          <div className="space-y-4">
            <Card className="lg:sticky lg:top-20">
              <CardHeader title="Step 4 — Run the analysis" subtitle="Review before submitting" />
              <CardBody className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span aria-hidden="true" className={batch ? 'text-[rgb(var(--accent-ink))]' : 'text-content-tertiary'}>
                      {batch ? '✓' : '○'}
                    </span>
                    <span className={batch ? 'text-content-primary' : 'text-content-tertiary'}>
                      {batch ? batch.product?.name : 'Select a product'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span aria-hidden="true" className={file ? 'text-[rgb(var(--accent-ink))]' : 'text-content-tertiary'}>
                      {file ? '✓' : '○'}
                    </span>
                    <span className={file ? 'text-content-primary' : 'text-content-tertiary'}>
                      {file ? file.name : 'Upload an image'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={form.temperature !== '' ? 'text-[rgb(var(--accent-ink))]' : 'text-amber-600 dark:text-amber-400'}
                    >
                      {form.temperature !== '' ? '✓' : '!'}
                    </span>
                    <span className={form.temperature !== '' ? 'text-content-primary' : 'text-content-tertiary'}>
                      {form.temperature !== ''
                        ? `${form.temperature} °C recorded`
                        : 'Temperature not set (score will be penalised)'}
                    </span>
                  </li>
                </ul>

                <Button fullWidth size="lg" icon={<ScanLine />} disabled={!batch || !file} onClick={runAnalysis}>
                  Analyse Freshness
                </Button>

                <p className="text-xs leading-relaxed text-content-tertiary">
                  The result is an AI estimate from measurable image features and the storage data you
                  provide — not a laboratory measurement.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
