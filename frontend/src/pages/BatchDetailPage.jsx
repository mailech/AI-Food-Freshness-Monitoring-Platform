/** Batch detail: current state, latest analysis, storage, history and recommendations. */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { analysisApi, batchApi, storageApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataList,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Select,
  SkeletonCard,
  Stat,
  StatusBadge,
  Tabs,
} from '../components/ui';
import {
  AssessmentSummary,
  IndicatorList,
  ProtectedImage,
  RecommendationList,
  ScoreExplanation,
  ShelfLifeCard,
  StorageSnapshotCard,
} from '../components/domain';
import { BatchFreshnessHistoryChart, EnvironmentTrendChart, ScoreComponentRadar, ShelfLifeProjectionChart } from '../charts';
import {
  categoryIcon,
  daysUntilLabel,
  formatDate,
  formatDateTime,
  formatNumber,
  formatQuantity,
  formatRelative,
  scoreColor,
  titleise,
} from '../utils/format';

function ReadingModal({ open, onClose, batch, onSaved }) {
  const { airCirculationOptions, lightExposureOptions } = useMeta();
  const toast = useToast();
  const [form, setForm] = useState({ temperature_c: '', humidity_pct: '', air_circulation: '', light_exposure: '' });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await storageApi.createReading({
        batch_id: batch.id,
        temperature_c: form.temperature_c === '' ? undefined : Number(form.temperature_c),
        humidity_pct: form.humidity_pct === '' ? undefined : Number(form.humidity_pct),
        air_circulation: form.air_circulation || undefined,
        light_exposure: form.light_exposure || undefined,
        location_name: batch.storage_location || undefined,
      });
      toast.success('Storage reading recorded.');
      onSaved();
      onClose();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a storage reading"
      description="The reading is evaluated against this batch's recommended range and can raise or clear alerts."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save reading
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Temperature (°C)" htmlFor="reading-temp">
          <Input
            id="reading-temp"
            type="number"
            step="0.1"
            value={form.temperature_c}
            onChange={(event) => setForm((c) => ({ ...c, temperature_c: event.target.value }))}
          />
        </Field>
        <Field label="Humidity (%)" htmlFor="reading-hum">
          <Input
            id="reading-hum"
            type="number"
            step="1"
            min="0"
            max="100"
            value={form.humidity_pct}
            onChange={(event) => setForm((c) => ({ ...c, humidity_pct: event.target.value }))}
          />
        </Field>
        <Field label="Air circulation" htmlFor="reading-air">
          <Select
            id="reading-air"
            value={form.air_circulation}
            onChange={(event) => setForm((c) => ({ ...c, air_circulation: event.target.value }))}
          >
            <option value="">Not specified</option>
            {airCirculationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Light exposure" htmlFor="reading-light">
          <Select
            id="reading-light"
            value={form.light_exposure}
            onChange={(event) => setForm((c) => ({ ...c, light_exposure: event.target.value }))}
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
    </Modal>
  );
}

export default function BatchDetailPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const { weights, categoryBySlug } = useMeta();

  const [tab, setTab] = useState('overview');
  const [readingOpen, setReadingOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const { data: batch, loading, error, refetch } = useAsync(() => batchApi.get(Number(batchId)), [batchId]);
  const { data: trend } = useAsync(() => analysisApi.freshnessTrend(Number(batchId)), [batchId]);
  const { data: storageTrend } = useAsync(
    () => storageApi.trends({ batch_id: Number(batchId), days: 14 }),
    [batchId],
  );
  const { data: shelfLifeProjection } = useAsync(
    () => analysisApi.shelfLifeProjection(Number(batchId)),
    [batchId],
  );

  useDocumentTitle(batch ? `${batch.product?.name} · ${batch.batch_number}` : 'Batch');

  if (loading && !batch) {
    return (
      <>
        <PageHeader title="Loading batch…" />
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard className="lg:col-span-2" lines={6} />
          <SkeletonCard lines={6} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Batch" />
        <ErrorState error={error} onRetry={refetch} />
      </>
    );
  }

  const assessment = batch.latest_assessment;
  const shelfLife = batch.latest_shelf_life;
  const snapshot = batch.storage_condition;
  const profile = categoryBySlug[batch.product?.category_slug];

  async function archive() {
    setArchiving(true);
    try {
      await batchApi.remove(batch.id);
      toast.success(`Batch ${batch.batch_number} archived.`);
      navigate('/batches');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setArchiving(false);
      setConfirmArchive(false);
    }
  }

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'analysis', label: 'AI analysis' },
    { value: 'storage', label: 'Storage' },
    { value: 'history', label: 'History', count: trend?.assessment_count },
    { value: 'images', label: 'Images', count: batch.images?.length },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/batches" className="hover:underline">
            ← All batches
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span aria-hidden="true">{categoryIcon(batch.product?.category_slug)}</span>
            {batch.product?.name}
            <StatusBadge status={batch.current_freshness_category || batch.status} />
          </span>
        }
        description={
          <span className="font-mono text-xs">{batch.batch_number}</span>
        }
        actions={
          <>
            {hasPermission('storage:write') && (
              <Button variant="secondary" size="sm" icon="❄" onClick={() => setReadingOpen(true)}>
                Record reading
              </Button>
            )}
            {hasPermission('analysis:create') && (
              <Link to={`/analyze?batch=${batch.id}`}>
                <Button size="sm" icon="⌾">
                  Analyse
                </Button>
              </Link>
            )}
            {hasPermission('batch:write') && !batch.is_archived && (
              <Button variant="ghost" size="sm" className="text-rose-600 dark:text-rose-400" onClick={() => setConfirmArchive(true)}>
                Archive
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        <StatGrid>
          <Stat
            label="Freshness score"
            value={
              batch.current_freshness_score === null || batch.current_freshness_score === undefined
                ? '—'
                : `${Math.round(batch.current_freshness_score)}/100`
            }
            sublabel={titleise(batch.current_freshness_category) || 'Not assessed'}
            tone={
              batch.current_freshness_score >= 75
                ? 'positive'
                : batch.current_freshness_score >= 60
                  ? 'neutral'
                  : batch.current_freshness_score >= 30
                    ? 'warning'
                    : 'danger'
            }
            icon="🍃"
          />
          <Stat
            label="Remaining shelf life"
            value={
              batch.remaining_shelf_life_days === null || batch.remaining_shelf_life_days === undefined
                ? '—'
                : `${Number(batch.remaining_shelf_life_days).toFixed(1)} d`
            }
            sublabel={
              batch.predicted_expiry_date
                ? `Predicted expiry ${formatDate(batch.predicted_expiry_date)}`
                : 'No prediction yet'
            }
            icon="⏳"
          />
          <Stat
            label="Quantity"
            value={formatQuantity(batch.quantity, batch.unit)}
            sublabel={batch.storage_location || 'No location recorded'}
            icon="▦"
          />
          <Stat
            label="Label expiry"
            value={formatDate(batch.expected_expiry_date)}
            sublabel={daysUntilLabel(batch.days_until_expiry)}
            tone={
              batch.days_until_expiry !== null && batch.days_until_expiry < 0
                ? 'danger'
                : batch.days_until_expiry !== null && batch.days_until_expiry <= 3
                  ? 'warning'
                  : 'neutral'
            }
            icon="📅"
          />
        </StatGrid>

        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {/* ------------------------------------------------------ overview */}
        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Batch details" />
              <CardBody>
                <DataList
                  items={[
                    { label: 'Product', value: batch.product?.name },
                    { label: 'Brand', value: batch.product?.brand },
                    { label: 'Category', value: batch.product?.category_name },
                    { label: 'SKU', value: batch.product?.sku },
                    { label: 'Batch number', value: batch.batch_number },
                    { label: 'Supplier', value: batch.supplier },
                    { label: 'Quantity', value: formatQuantity(batch.quantity, batch.unit) },
                    {
                      label: 'Cost per unit',
                      value: batch.cost_per_unit ? formatNumber(batch.cost_per_unit, 2) : null,
                    },
                    { label: 'Packaging', value: titleise(batch.packaging_type) },
                    { label: 'Storage location', value: batch.storage_location },
                    { label: 'Production date', value: formatDate(batch.production_date) },
                    { label: 'Purchase date', value: formatDate(batch.purchase_date) },
                    { label: 'Storage date', value: formatDate(batch.storage_date) },
                    { label: 'Label expiry', value: formatDate(batch.expected_expiry_date) },
                    { label: 'Predicted expiry', value: formatDate(batch.predicted_expiry_date) },
                    {
                      label: 'Product age',
                      value: batch.age_days !== null ? `${Math.round(batch.age_days)} day(s)` : null,
                    },
                    { label: 'Last assessed', value: batch.last_assessed_at ? formatDateTime(batch.last_assessed_at) : 'Never' },
                    { label: 'Assessments', value: formatNumber(batch.assessment_count) },
                  ]}
                />
                {batch.notes && (
                  <div className="mt-4 rounded-xl bg-surface-sunken p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">Notes</p>
                    <p className="mt-1 text-sm text-content-secondary">{batch.notes}</p>
                  </div>
                )}
                {profile && (
                  <div className="mt-4 rounded-xl border border-chill-300/60 dark:border-chill-400/22 bg-chill-50 dark:bg-chill-500/8 p-3 text-xs text-chill-700 dark:text-chill-300 dark:text-chill-200 dark:text-chill-100">
                    <p className="font-semibold">Recommended storage for {profile.name}</p>
                    <p className="mt-1">
                      {profile.storage_rule.temp_min_c}–{profile.storage_rule.temp_max_c} °C ·{' '}
                      {profile.storage_rule.humidity_min_pct}–{profile.storage_rule.humidity_max_pct}% RH
                    </p>
                    <p className="mt-1 text-chill-700 dark:text-chill-300 dark:text-chill-200">{profile.storage_rule.notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>

            <div className="space-y-4">
              {assessment ? (
                <Card>
                  <CardHeader title="Score components" subtitle="The weighted inputs" />
                  <CardBody>
                    <ScoreComponentRadar components={assessment.components || {}} height={220} />
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <EmptyState
                    icon="⌾"
                    title="Not analysed yet"
                    description="Upload an image and run the AI analysis to get a freshness score and shelf-life estimate."
                    action={
                      <Link to={`/analyze?batch=${batch.id}`}>
                        <Button size="sm">Analyse now</Button>
                      </Link>
                    }
                  />
                </Card>
              )}

              {shelfLife && <ShelfLifeCard prediction={shelfLife} />}
              {shelfLifeProjection?.points?.length > 0 && (
                <Card>
                  <CardHeader
                    title="Shelf-life projection"
                    subtitle={shelfLifeProjection.assumption || 'If storage conditions hold steady'}
                  />
                  <CardBody>
                    <ShelfLifeProjectionChart points={shelfLifeProjection.points} height={200} />
                  </CardBody>
                </Card>
              )}
            </div>

            <Card className="lg:col-span-3">
              <CardHeader title="Recommendations" subtitle="Rule-based, explainable actions for this batch" />
              <CardBody>
                <RecommendationList
                  recommendations={batch.recommendations || []}
                  onAcknowledged={() => refetch()}
                />
              </CardBody>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------ analysis */}
        {tab === 'analysis' &&
          (assessment ? (
            <div className="space-y-4">
              <AssessmentSummary assessment={assessment} />
              <div className="grid gap-4 lg:grid-cols-2">
                <ScoreExplanation assessment={assessment} weights={weights} />
                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Spoilage indicators" subtitle="All checks performed, detected first" />
                    <CardBody>
                      <IndicatorList indicators={assessment.indicators || []} showUndetected />
                    </CardBody>
                  </Card>
                  {(assessment.image_url || assessment.overlay_url) && (
                    <Card>
                      <CardHeader title="Visual explanation" />
                      <CardBody>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {assessment.image_url && (
                            <ProtectedImage
                              path={assessment.image_url}
                              alt="Analysed image"
                              className="h-44 w-full rounded-xl border border-edge-subtle bg-surface-sunken object-contain"
                            />
                          )}
                          {assessment.overlay_url && (
                            <ProtectedImage
                              path={assessment.overlay_url}
                              alt="Detected regions overlay"
                              className="h-44 w-full rounded-xl border border-edge-subtle bg-surface-sunken object-contain"
                            />
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <EmptyState
                icon="⌾"
                title="No analysis for this batch yet"
                description="Run the AI analysis to see the freshness score, spoilage indicators and explainability."
                action={
                  <Link to={`/analyze?batch=${batch.id}`}>
                    <Button size="sm">Analyse this batch</Button>
                  </Link>
                }
              />
            </Card>
          ))}

        {/* ------------------------------------------------------- storage */}
        {tab === 'storage' && (
          <div className="space-y-4">
            <StorageSnapshotCard
              snapshot={snapshot}
              actions={
                hasPermission('storage:write') && (
                  <Button variant="secondary" size="sm" onClick={() => setReadingOpen(true)}>
                    Record reading
                  </Button>
                )
              }
            />
            <Card>
              <CardHeader
                title="Environmental history"
                subtitle={`${storageTrend?.reading_count ?? 0} readings in the last 14 days · ${
                  storageTrend?.violation_count ?? 0
                } violations`}
              />
              <CardBody>
                <EnvironmentTrendChart
                  points={storageTrend?.points || []}
                  range={
                    snapshot?.required
                      ? { min: snapshot.required.temp_min_c, max: snapshot.required.temp_max_c }
                      : undefined
                  }
                />
              </CardBody>
            </Card>
          </div>
        )}

        {/* ------------------------------------------------------- history */}
        {tab === 'history' && (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Freshness over time"
                subtitle={
                  trend?.direction
                    ? `Trend: ${trend.direction} (${trend.score_change > 0 ? '+' : ''}${trend.score_change} points)`
                    : 'Score history for this batch'
                }
              />
              <CardBody>
                <BatchFreshnessHistoryChart points={trend?.points || []} />
              </CardBody>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title="Assessment log" />
              {trend?.points?.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Score</th>
                        <th>Category</th>
                        <th>Visual</th>
                        <th>Storage</th>
                        <th>Shelf life</th>
                        <th>Age</th>
                        <th>Spoilage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...trend.points].reverse().map((point, index) => (
                        <tr key={index}>
                          <td className="whitespace-nowrap text-content-secondary">{formatDateTime(point.created_at)}</td>
                          <td>
                            <span
                              className="font-semibold tabular-nums"
                              style={{ color: scoreColor(point.freshness_score) }}
                            >
                              {Math.round(point.freshness_score)}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={point.freshness_category} />
                          </td>
                          <td className="tabular-nums">{point.visual_score ? Math.round(point.visual_score) : '—'}</td>
                          <td className="tabular-nums">{point.storage_score ? Math.round(point.storage_score) : '—'}</td>
                          <td className="tabular-nums">
                            {point.shelf_life_score ? Math.round(point.shelf_life_score) : '—'}
                          </td>
                          <td className="tabular-nums">
                            {point.product_age_score ? Math.round(point.product_age_score) : '—'}
                          </td>
                          <td className="tabular-nums">
                            {point.spoilage_probability !== null && point.spoilage_probability !== undefined
                              ? `${Math.round(point.spoilage_probability * 100)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon="📈" title="No assessment history" description="Run an analysis to start the history." />
              )}
            </Card>
          </div>
        )}

        {/* -------------------------------------------------------- images */}
        {tab === 'images' && (
          <Card>
            <CardHeader title="Images" subtitle={`${batch.images?.length || 0} uploaded`} />
            <CardBody>
              {batch.images?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {batch.images.map((image) => (
                    <figure key={image.id} className="overflow-hidden rounded-xl border border-edge-subtle">
                      <ProtectedImage
                        path={image.url}
                        alt={image.original_filename}
                        className="h-44 w-full bg-surface-sunken object-contain"
                      />
                      <figcaption className="border-t border-edge-subtle px-3 py-2">
                        <p className="truncate text-xs font-medium text-content-primary">{image.original_filename}</p>
                        <p className="mt-0.5 text-xs text-content-tertiary">
                          {image.width}×{image.height} · {formatRelative(image.created_at)}
                          {image.is_analyzed && <span className="ml-1.5 text-[rgb(var(--accent-ink))] dark:text-leaf-400">· analysed</span>}
                        </p>
                        {image.overlay_url && (
                          <ProtectedImage
                            path={image.overlay_url}
                            alt="Analysis overlay"
                            className="mt-2 h-24 w-full rounded-lg bg-surface-sunken object-contain"
                          />
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="🖼"
                  title="No images uploaded"
                  description="Upload a photo through the analysis workflow."
                  action={
                    <Link to={`/analyze?batch=${batch.id}`}>
                      <Button size="sm">Upload and analyse</Button>
                    </Link>
                  }
                />
              )}
            </CardBody>
          </Card>
        )}
      </div>

      <ReadingModal open={readingOpen} onClose={() => setReadingOpen(false)} batch={batch} onSaved={refetch} />

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={archive}
        loading={archiving}
        title="Archive this batch?"
        description={`Batch ${batch.batch_number} will be hidden from active lists. Its assessments, images and audit history are preserved.`}
        confirmLabel="Archive batch"
      />
    </>
  );
}
