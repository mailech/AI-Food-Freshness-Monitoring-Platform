/** Storage monitoring: compliance overview, trends, readings and manual entry. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { batchApi, storageApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ComplianceBadge,
  EmptyState,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  Modal,
  RiskBadge,
  Select,
  SkeletonCard,
  Stat,
  Tabs,
  Textarea,
} from '../components/ui';
import { ComplianceChart, EnvironmentTrendChart } from '../charts';
import {
  formatDateTime,
  formatHumidity,
  formatNumber,
  formatRelative,
  formatTemperature,
  titleise,
} from '../utils/format';

function ManualReadingModal({ open, onClose, onSaved, locations }) {
  const { airCirculationOptions, lightExposureOptions } = useMeta();
  const toast = useToast();
  const [batchQuery, setBatchQuery] = useState('');
  const [form, setForm] = useState({
    batch_id: '',
    location_name: '',
    sensor_id: '',
    temperature_c: '',
    humidity_pct: '',
    air_circulation: '',
    light_exposure: '',
    co2_ppm: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: batches } = useAsync(
    () => batchApi.list({ q: batchQuery || undefined, page_size: 25 }),
    [batchQuery, open],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      await storageApi.createReading({
        batch_id: form.batch_id ? Number(form.batch_id) : undefined,
        location_name: form.location_name || undefined,
        sensor_id: form.sensor_id || undefined,
        temperature_c: form.temperature_c === '' ? undefined : Number(form.temperature_c),
        humidity_pct: form.humidity_pct === '' ? undefined : Number(form.humidity_pct),
        air_circulation: form.air_circulation || undefined,
        light_exposure: form.light_exposure || undefined,
        co2_ppm: form.co2_ppm === '' ? undefined : Number(form.co2_ppm),
        note: form.note || undefined,
        source: 'MANUAL',
      });
      toast.success('Reading recorded and evaluated against the required range.');
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
      description="Manual entry — no IoT hardware required. Linking a batch evaluates it against that batch's envelope."
      size="lg"
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
      <div className="space-y-4">
        <Field label="Search batches" htmlFor="batch-q">
          <Input
            id="batch-q"
            type="search"
            value={batchQuery}
            onChange={(event) => setBatchQuery(event.target.value)}
            placeholder="Filter the batch list"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Batch" htmlFor="batch" hint="Optional — omit for a location-level reading">
            <Select id="batch" value={form.batch_id} onChange={(event) => update('batch_id', event.target.value)}>
              <option value="">No specific batch</option>
              {(batches?.items || []).map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number} — {batch.product?.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location" htmlFor="loc">
            <Input
              id="loc"
              list="known-locations"
              value={form.location_name}
              onChange={(event) => update('location_name', event.target.value)}
              placeholder="Cold Room A"
            />
            <datalist id="known-locations">
              {(locations || []).map((item) => (
                <option key={item.location_name} value={item.location_name} />
              ))}
            </datalist>
          </Field>
          <Field label="Temperature (°C)" htmlFor="temp">
            <Input
              id="temp"
              type="number"
              step="0.1"
              value={form.temperature_c}
              onChange={(event) => update('temperature_c', event.target.value)}
            />
          </Field>
          <Field label="Humidity (%)" htmlFor="hum">
            <Input
              id="hum"
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.humidity_pct}
              onChange={(event) => update('humidity_pct', event.target.value)}
            />
          </Field>
          <Field label="Air circulation" htmlFor="air">
            <Select id="air" value={form.air_circulation} onChange={(event) => update('air_circulation', event.target.value)}>
              <option value="">Not specified</option>
              {airCirculationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Light exposure" htmlFor="light">
            <Select id="light" value={form.light_exposure} onChange={(event) => update('light_exposure', event.target.value)}>
              <option value="">Not specified</option>
              {lightExposureOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sensor ID" htmlFor="sensor" hint="Optional reference">
            <Input id="sensor" value={form.sensor_id} onChange={(event) => update('sensor_id', event.target.value)} />
          </Field>
          <Field label="CO₂ (ppm)" htmlFor="co2" hint="Optional">
            <Input
              id="co2"
              type="number"
              step="1"
              value={form.co2_ppm}
              onChange={(event) => update('co2_ppm', event.target.value)}
            />
          </Field>
        </div>
        <Field label="Note" htmlFor="note">
          <Textarea id="note" rows={2} value={form.note} onChange={(event) => update('note', event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export default function StoragePage() {
  useDocumentTitle('Storage monitoring');
  const { hasPermission } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [location, setLocation] = useState('');
  const [days, setDays] = useState(14);
  const [readingOpen, setReadingOpen] = useState(false);
  const [polling, setPolling] = useState(false);

  const canWrite = hasPermission('storage:write');

  const { data: overview, loading, error, refetch } = useAsync(
    () => storageApi.overview({ location_name: location || undefined }),
    [location],
  );
  const { data: locations, refetch: refetchLocations } = useAsync(storageApi.locations, []);
  const { data: trends, refetch: refetchTrends } = useAsync(
    () => storageApi.trends({ location_name: location || undefined, days }),
    [location, days],
  );
  const { data: readings, refetch: refetchReadings } = useAsync(
    () => storageApi.readings({ location_name: location || undefined, days, limit: 200 }),
    [location, days],
  );
  const { data: provider } = useAsync(storageApi.sensorProvider, []);

  function refreshAll() {
    refetch();
    refetchLocations();
    refetchTrends();
    refetchReadings();
  }

  async function pollSensors() {
    setPolling(true);
    try {
      const result = await storageApi.ingestSensors();
      toast.success(result.message);
      refreshAll();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setPolling(false);
    }
  }

  const counts = overview?.counts || {};

  return (
    <>
      <PageHeader
        title="Storage monitoring"
        description="Temperature, humidity and compliance across your storage locations."
        actions={
          canWrite && (
            <>
              <Button variant="secondary" size="sm" icon="⟳" loading={polling} onClick={pollSensors}>
                Poll sensors
              </Button>
              <Button size="sm" icon="＋" onClick={() => setReadingOpen(true)}>
                Record reading
              </Button>
            </>
          )
        }
      />

      <div className="space-y-4">
        {provider && (
          <InlineNotice tone={provider.available ? 'info' : 'warning'} title={`Sensor provider: ${provider.provider}`}>
            {provider.note}{' '}
            {provider.provider === 'mock' &&
              'Set SENSOR_PROVIDER=mqtt with a reachable broker to ingest real hardware readings.'}
          </InlineNotice>
        )}

        <StatGrid>
          <Stat
            label="Compliance rate"
            value={
              overview?.compliance_rate !== null && overview?.compliance_rate !== undefined
                ? `${overview.compliance_rate}%`
                : '—'
            }
            sublabel={`${overview?.total_batches ?? 0} batches evaluated`}
            tone={overview?.compliance_rate >= 90 ? 'positive' : overview?.compliance_rate >= 70 ? 'warning' : 'danger'}
            icon="✓"
          />
          <Stat
            label="Warnings"
            value={formatNumber(counts.WARNING)}
            sublabel="Just outside tolerance"
            tone={counts.WARNING > 0 ? 'warning' : 'positive'}
            icon="!"
          />
          <Stat
            label="Non-compliant"
            value={formatNumber(counts.NON_COMPLIANT)}
            sublabel="Action required"
            tone={counts.NON_COMPLIANT > 0 ? 'danger' : 'positive'}
            icon="✕"
          />
          <Stat
            label="Readings"
            value={formatNumber(trends?.reading_count)}
            sublabel={`${formatNumber(trends?.violation_count)} violations in ${days} days`}
            tone="info"
            icon="📈"
          />
        </StatGrid>

        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Location" htmlFor="location">
                <Select id="location" value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">All locations</option>
                  {(locations || []).map((item) => (
                    <option key={item.location_name} value={item.location_name}>
                      {item.location_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Window" htmlFor="days">
                <Select id="days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  {[7, 14, 30, 60, 90].map((value) => (
                    <option key={value} value={value}>
                      Last {value} days
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'locations', label: 'Locations', count: locations?.length },
            { value: 'readings', label: 'Readings', count: readings?.length },
          ]}
        />

        {loading && !overview ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonCard className="lg:col-span-2" lines={6} />
            <SkeletonCard lines={6} />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : tab === 'overview' ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Environmental trend"
                  subtitle={`Daily temperature and humidity, last ${days} days · compliance ${
                    trends?.compliance_rate ?? '—'
                  }%`}
                />
                <CardBody>
                  <EnvironmentTrendChart points={trends?.points || []} height={300} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Compliance mix" subtitle="Across evaluated batches" />
                <CardBody>
                  <ComplianceChart counts={counts} height={300} />
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Batches requiring attention"
                subtitle="Outside their recommended envelope, lowest storage score first"
              />
              {overview?.attention_required?.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Product</th>
                        <th>Location</th>
                        <th>Temperature</th>
                        <th>Required</th>
                        <th>Humidity</th>
                        <th>Required</th>
                        <th>Status</th>
                        <th>Risk</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.attention_required.map((item) => (
                        <tr key={item.batch_id}>
                          <td>
                            <Link
                              to={`/batches/${item.batch_id}`}
                              className="font-mono text-xs font-medium text-[rgb(var(--accent-ink))] hover:underline"
                            >
                              {item.batch_number}
                            </Link>
                          </td>
                          <td className="font-medium">{item.product_name || '—'}</td>
                          <td className="text-content-secondary">{item.location_name || '—'}</td>
                          <td className="whitespace-nowrap font-medium tabular-nums">
                            {formatTemperature(item.current?.temperature_c)}
                          </td>
                          <td className="whitespace-nowrap text-xs tabular-nums text-content-tertiary">
                            {item.required?.temp_min_c}–{item.required?.temp_max_c} °C
                          </td>
                          <td className="tabular-nums">{formatHumidity(item.current?.humidity_pct)}</td>
                          <td className="whitespace-nowrap text-xs tabular-nums text-content-tertiary">
                            {item.required?.humidity_min_pct}–{item.required?.humidity_max_pct}%
                          </td>
                          <td>
                            <ComplianceBadge status={item.compliance_status} />
                          </td>
                          <td>
                            <RiskBadge risk={item.risk_level} />
                          </td>
                          <td className="tabular-nums font-semibold">
                            {item.storage_score === null || item.storage_score === undefined
                              ? '—'
                              : Math.round(item.storage_score)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="✅"
                  title="Everything is within range"
                  description="No batch is currently stored outside its recommended envelope."
                />
              )}
            </Card>
          </div>
        ) : tab === 'locations' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(locations || []).length ? (
              locations.map((item) => (
                <Card key={item.location_name} hover>
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-content-primary">
                        {item.location_name}
                      </p>
                      <span aria-hidden="true" className="text-lg">
                        ❄
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-chill-50 dark:bg-chill-500/8 p-3">
                        <p className="text-xs text-chill-700 dark:text-chill-300">Avg temperature</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-chill-700 dark:text-chill-300 dark:text-chill-200 dark:text-chill-100">
                          {formatTemperature(item.avg_temperature_c)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-surface-sunken p-3">
                        <p className="text-xs text-content-secondary">Avg humidity</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-content-primary">
                          {formatHumidity(item.avg_humidity_pct)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-content-tertiary">
                      {formatNumber(item.reading_count)} readings · last {formatRelative(item.last_reading_at)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setLocation(item.location_name);
                        setTab('overview');
                      }}
                    >
                      Focus this location →
                    </Button>
                  </CardBody>
                </Card>
              ))
            ) : (
              <Card className="sm:col-span-2 lg:col-span-3">
                <EmptyState
                  icon="❄"
                  title="No locations recorded"
                  description="Record a reading with a location name, or poll the mock sensors."
                  action={canWrite && <Button size="sm" onClick={pollSensors}>Poll sensors</Button>}
                />
              </Card>
            )}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title="Reading history"
              subtitle={`${readings?.length || 0} readings in the last ${days} days`}
            />
            {readings?.length ? (
              <div className="table-wrap max-h-[32rem] overflow-y-auto">
                <table className="table">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Recorded</th>
                      <th>Location</th>
                      <th>Sensor</th>
                      <th>Temperature</th>
                      <th>Humidity</th>
                      <th>CO₂</th>
                      <th>Source</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...readings].reverse().map((reading) => (
                      <tr key={reading.id} className={clsx(reading.is_violation && 'bg-amber-50/50 dark:bg-amber-500/6')}>
                        <td className="whitespace-nowrap text-content-secondary">{formatDateTime(reading.recorded_at)}</td>
                        <td>{reading.location_name || '—'}</td>
                        <td className="font-mono text-xs text-content-tertiary">{reading.sensor_id || 'manual'}</td>
                        <td className="tabular-nums font-medium">{formatTemperature(reading.temperature_c)}</td>
                        <td className="tabular-nums">{formatHumidity(reading.humidity_pct)}</td>
                        <td className="tabular-nums text-content-tertiary">
                          {reading.co2_ppm ? `${Math.round(reading.co2_ppm)} ppm` : '—'}
                        </td>
                        <td>
                          <Badge className="bg-surface-sunken text-content-secondary ring-edge-subtle">
                            {titleise(reading.source)}
                          </Badge>
                        </td>
                        <td>
                          <ComplianceBadge status={reading.compliance_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="📈" title="No readings in this window" description="Widen the window or record a reading." />
            )}
          </Card>
        )}
      </div>

      <ManualReadingModal
        open={readingOpen}
        onClose={() => setReadingOpen(false)}
        onSaved={refreshAll}
        locations={locations}
      />
    </>
  );
}
