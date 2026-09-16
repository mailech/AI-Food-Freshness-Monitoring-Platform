/**
 * Model transparency page.
 *
 * Exists because the specification requires the platform to be honest about
 * what its AI actually is. It shows the live provenance of every inference role
 * and states plainly what each component does and does not claim.
 */
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { systemApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataList,
  DemoBadge,
  ErrorState,
  InlineNotice,
  SkeletonCard,
} from '../components/ui';
import { formatPercent, titleise } from '../utils/format';

const ROLE_EXPLANATIONS = {
  freshness: {
    title: 'Freshness classification',
    baseline:
      'A deterministic scoring function over measured colour statistics (browning ratio, dark-spot ratio, pale ratio, hue uniformity) and texture descriptors (Laplacian variance, GLCM contrast/homogeneity, LBP entropy, ridge ratio). Every deduction is inspectable and reported.',
    trained: 'A scikit-learn classifier trained on labelled freshness images; metrics come from its held-out test split.',
  },
  spoilage: {
    title: 'Spoilage detection',
    baseline:
      'OpenCV colour-band segmentation plus texture evidence, with one explicit rule per indicator (mould, bruising, discoloration, physical damage, surface degradation, dryness, wetness). Findings are combined with a severity-weighted noisy-OR.',
    trained: 'A YOLO object detector loaded from a locally supplied checkpoint you trained yourself.',
  },
  shelf_life: {
    title: 'Shelf-life prediction',
    baseline:
      'A documented Q10-style kinetic approximation: category baseline life scaled by temperature deviation, humidity deviation, packaging multiplier, air circulation and current freshness, minus elapsed storage time. Never predicts beyond a declared best-before date.',
    trained: 'A regression model (Random Forest / Gradient Boosting / XGBoost) whose MAE, RMSE and R² come from its test split.',
  },
  food_classification: {
    title: 'Food classification',
    baseline:
      'A deliberately low-confidence colour-prior heuristic. Colour alone cannot identify a specific food, so this is advisory metadata only — the product’s declared category always wins.',
    trained: 'A classifier trained on a food-recognition dataset such as Food-101.',
  },
};

export default function AboutPage() {
  useDocumentTitle('About the AI models');
  const { meta, demoMode, weights, thresholds } = useMeta();
  const { data, loading, error, refetch } = useAsync(systemApi.models, []);

  return (
    <>
      <PageHeader
        title="About the AI models"
        description="Exactly what this platform's AI is, what it measures, and what it does not claim."
        actions={demoMode ? <DemoBadge label={meta.analysis_label} /> : null}
      />

      <div className="space-y-4">
        <InlineNotice tone="warning" title="Honesty statement">
          <p className="leading-relaxed">
            Components labelled <strong>Baseline</strong> below are transparent computer-vision or
            rule-based estimators. They are <strong>not</strong> trained neural networks, and{' '}
            <strong>no accuracy figures are claimed for them</strong>. Any metric shown on this page
            was produced by an actual evaluation run against a held-out test split and is read
            verbatim from the model artefact.
          </p>
          <p className="mt-2 leading-relaxed">
            Nothing here is a food-safety guarantee. Always confirm by physical inspection and follow
            your own food-safety policy.
          </p>
        </InlineNotice>

        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} lines={5} />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <Card>
              <CardHeader
                title="Current inference mode"
                subtitle={`Mode: ${data.mode} · DEMO_MODE=${String(data.demo_mode)}`}
              />
              <CardBody>
                <DataList
                  items={[
                    { label: 'Mode', value: titleise(data.mode) },
                    { label: 'DEMO_MODE', value: String(data.demo_mode) },
                    { label: 'Any trained model loaded', value: data.any_trained ? 'Yes' : 'No' },
                    { label: 'Model directory', value: <code className="font-mono text-xs">{data.model_path}</code> },
                    { label: 'Trained roles', value: data.trained_roles?.length ? data.trained_roles.map(titleise).join(', ') : 'None' },
                    { label: 'Baseline roles', value: data.baseline_roles?.length ? data.baseline_roles.map(titleise).join(', ') : 'None' },
                  ]}
                />
                {data.fallback_notes?.length > 0 && (
                  <InlineNotice tone="neutral" title="Fallbacks in effect" className="mt-4">
                    <ul className="list-inside list-disc space-y-0.5">
                      {data.fallback_notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </InlineNotice>
                )}
              </CardBody>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(data.roles || {}).map(([role, info]) => {
                const explanation = ROLE_EXPLANATIONS[role] || {};
                return (
                  <Card
                    key={role}
                    className={clsx(info.is_demo ? 'border-amber-300/60 dark:border-amber-400/22' : 'border-[rgb(var(--accent)/0.25)]')}
                  >
                    <CardHeader
                      title={explanation.title || titleise(role)}
                      subtitle={`${info.name} · ${info.version}`}
                      actions={
                        <Badge
                          className={
                            info.is_demo
                              ? 'bg-amber-100/70 dark:bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-300/70 dark:ring-amber-400/25'
                              : 'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]'
                          }
                        >
                          {info.is_demo ? 'Baseline / demo' : 'Trained model'}
                        </Badge>
                      }
                    />
                    <CardBody className="space-y-3">
                      <p className="text-sm leading-relaxed text-content-secondary">{info.description}</p>

                      <div className="rounded-xl bg-surface-sunken p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                          How it works
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                          {info.is_demo ? explanation.baseline : explanation.trained}
                        </p>
                      </div>

                      {Object.keys(info.metrics || {}).length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                            Recorded evaluation metrics
                          </p>
                          <dl className="mt-1.5 space-y-1 text-sm">
                            {Object.entries(info.metrics).map(([metric, value]) => (
                              <div key={metric} className="flex justify-between gap-3">
                                <dt className="text-content-secondary">{metric.toUpperCase()}</dt>
                                <dd className="font-mono tabular-nums text-content-primary">
                                  {Number(value).toFixed(4)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          {info.trained_on && (
                            <p className="mt-1.5 text-xs text-content-tertiary">Trained on: {info.trained_on}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs italic text-content-tertiary">
                          No metrics reported — <strong>training required</strong>. See{' '}
                          <code className="font-mono">ml/training/</code> in the repository.
                        </p>
                      )}

                      {info.artefact_path && (
                        <p className="break-all font-mono text-[11px] text-content-tertiary">
                          artefact: {info.artefact_path}
                        </p>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader
                title="The freshness scoring model"
                subtitle="How the final 0–100 score is composed"
              />
              <CardBody className="space-y-4">
                <p className="text-sm leading-relaxed text-content-secondary">
                  The final score is a weighted combination of four components, each normalised to
                  0–100 before weighting. The weights and the score-to-category thresholds are both
                  configurable per deployment.
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ['visual', 'Visual condition', 'Colour and texture from the image'],
                    ['storage', 'Storage conditions', 'Temperature / humidity vs. the required range'],
                    ['shelf_life', 'Shelf-life prediction', 'Remaining life as a share of expected life'],
                    ['product_age', 'Product age', 'Elapsed share of the expected life'],
                  ].map(([key, label, help]) => (
                    <div key={key} className="rounded-xl border border-edge-subtle p-3">
                      <p className="text-2xl font-semibold tabular-nums text-[rgb(var(--accent-ink))]">
                        {formatPercent(weights[key], { fromFraction: true })}
                      </p>
                      <p className="mt-1 text-sm font-medium text-content-primary">{label}</p>
                      <p className="mt-0.5 text-xs text-content-tertiary">{help}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                    Score bands
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-5">
                    {[
                      ['Fresh', `${thresholds.FRESH}–100`, 'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]'],
                      ['Good', `${thresholds.GOOD}–${thresholds.FRESH - 1}`, 'bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] dark:text-leaf-400 ring-[rgb(var(--accent)/0.22)]'],
                      ['Acceptable', `${thresholds.ACCEPTABLE}–${thresholds.GOOD - 1}`, 'bg-surface-sunken text-content-secondary ring-edge'],
                      ['Near spoilage', `${thresholds.NEAR_SPOILAGE}–${thresholds.ACCEPTABLE - 1}`, 'bg-amber-100/70 dark:bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-300/70 dark:ring-amber-400/25'],
                      ['Spoiled', `0–${thresholds.NEAR_SPOILAGE - 1}`, 'bg-rose-100/70 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-300/70 dark:ring-rose-400/25'],
                    ].map(([label, range, className]) => (
                      <div key={label} className={clsx('rounded-xl px-3 py-2 ring-1 ring-inset', className)}>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="mt-0.5 font-mono text-xs">{range}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Replacing the baselines with trained models" />
              <CardBody>
                <ol className="space-y-3 text-sm text-content-secondary">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[rgb(var(--accent)/0.12)] text-xs font-bold text-[rgb(var(--accent-ink))]">
                      1
                    </span>
                    <span>
                      Obtain a licensed dataset — see <code className="font-mono text-xs">ml/datasets/README.md</code>{' '}
                      for the recommended sources and their terms. The repository redistributes no
                      third-party data.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[rgb(var(--accent)/0.12)] text-xs font-bold text-[rgb(var(--accent-ink))]">
                      2
                    </span>
                    <span>
                      Run a training script, e.g.{' '}
                      <code className="font-mono text-xs">python ml/training/train_freshness.py</code>. It
                      preprocesses, splits, trains, evaluates and writes the metrics into the artefact.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[rgb(var(--accent)/0.12)] text-xs font-bold text-[rgb(var(--accent-ink))]">
                      3
                    </span>
                    <span>
                      Copy the artefact into <code className="font-mono text-xs">backend/app/ml/models/</code>,
                      set <code className="font-mono text-xs">DEMO_MODE=false</code> and restart — or use{' '}
                      <Link to="/admin/system" className="font-medium text-[rgb(var(--accent-ink))] dark:text-leaf-400 hover:underline">
                        Reload models
                      </Link>{' '}
                      as an administrator.
                    </span>
                  </li>
                </ol>
                <InlineNotice tone="neutral" className="mt-4">
                  <p className="text-xs leading-relaxed">
                    If an artefact is missing or fails to load, the platform logs the reason, falls back
                    to the baseline for that role and reports the fallback here — it never silently
                    pretends a trained model is in use.
                  </p>
                </InlineNotice>
              </CardBody>
            </Card>

            {data.disclaimer && (
              <InlineNotice tone="neutral" title="Platform disclaimer">
                {data.disclaimer}
              </InlineNotice>
            )}
          </>
        )}
      </div>
    </>
  );
}
