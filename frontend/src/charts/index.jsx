/**
 * Chart components (Recharts).
 *
 * Each chart is self-contained: it owns its empty state, uses the platform
 * status palette so a "Spoiled" slice is always the same red, and keeps axis
 * labels legible on small screens.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { EmptyState } from '../components/ui';
import { formatDate, statusMeta } from '../utils/format';

/* Axes, grid and tooltips read live CSS variables, so charts re-theme with the
   rest of the interface instead of being hardcoded to the light palette. */
const AXIS = {
  stroke: 'rgb(var(--content-secondary))',
  fontSize: 11,
  tick: { fill: 'rgb(var(--content-secondary))' },
};
const GRID = 'rgb(var(--edge-subtle))';

const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 14,
    border: '1px solid rgb(var(--edge-subtle))',
    backgroundColor: 'rgb(var(--surface-overlay))',
    boxShadow: '0 12px 32px -10px rgb(var(--shadow-rgb) / 0.24)',
    fontSize: 12,
    padding: '10px 12px',
    color: 'rgb(var(--content-primary))',
  },
  labelStyle: {
    color: 'rgb(var(--content-secondary))',
    fontWeight: 700,
    marginBottom: 6,
    fontSize: 11,
  },
  itemStyle: { color: 'rgb(var(--content-primary))' },
  cursor: { stroke: 'rgb(var(--edge))', strokeWidth: 1, strokeDasharray: '3 3' },
};

/* Animated entry, consistent across every chart (~§47 large-visual timing). */
const ENTER = { animationDuration: 650, animationEasing: 'ease-out' };

function ChartFrame({ children, height = 260, empty, emptyLabel = 'No data yet' }) {
  if (empty) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <EmptyState compact icon={<LineChartIcon />} title={emptyLabel} description="Data will appear once analyses and readings exist." />
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const shortDate = (value) => formatDate(value, 'dd MMM');

/** Freshness distribution across the five bands. */
export function FreshnessDistributionChart({ items = [], height = 260, variant = 'bar' }) {
  const data = items.map((item) => ({
    name: statusMeta(item.category).label,
    value: item.count,
    percentage: item.percentage,
    fill: statusMeta(item.category).chart,
  }));
  const empty = !data.length || data.every((d) => !d.value);

  if (variant === 'pie') {
    return (
      <ChartFrame height={height} empty={empty} emptyLabel="No assessed batches yet">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={3} {...ENTER}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} formatter={(value, name) => [`${value} batches`, name]} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgb(var(--content-secondary))' }} />
        </PieChart>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame height={height} empty={empty} emptyLabel="No assessed batches yet">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} interval={0} tickMargin={8} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, _name, entry) => [
            `${value} batches (${entry.payload.percentage}%)`,
            'Count',
          ]}
        />
        <Bar {...ENTER} dataKey="value" radius={[7, 7, 2, 2]} maxBarSize={54}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/** Average freshness score over time, with the band thresholds shaded. */
export function FreshnessTrendChart({ points = [], height = 260, thresholds }) {
  const data = points
    .filter((point) => point.average_score !== null)
    .map((point) => ({
      date: point.date,
      score: point.average_score,
      min: point.min_score,
      max: point.max_score,
      count: point.assessment_count,
    }));
  const bands = thresholds || { FRESH: 90, GOOD: 75, ACCEPTABLE: 60, NEAR_SPOILAGE: 30 };

  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No assessments in this period">
      <AreaChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="freshnessFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20a76b" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#20a76b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        {/* Threshold bands make the score instantly interpretable. */}
        <ReferenceArea y1={bands.FRESH} y2={100} fill="#128756" fillOpacity={0.07} />
        <ReferenceArea y1={bands.NEAR_SPOILAGE} y2={bands.ACCEPTABLE} fill="#f59e0b" fillOpacity={0.06} />
        <ReferenceArea y1={0} y2={bands.NEAR_SPOILAGE} fill="#e11d48" fillOpacity={0.06} />
        <ReferenceLine y={bands.GOOD} stroke="#a8a29e" strokeDasharray="3 3" />
        <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
        <YAxis {...AXIS} domain={[0, 100]} />
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
          formatter={(value, name) => [Math.round(value), name === 'score' ? 'Average score' : name]}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#128756"
          strokeWidth={2}
          fill="url(#freshnessFill)"
          dot={{ r: 2.5, strokeWidth: 0, fill: '#0e6b46' }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

/** Remaining shelf-life buckets. */
export function ShelfLifeDistributionChart({ buckets = [], height = 240 }) {
  const palette = ['#ad2b24', '#e3554c', '#f5b229', '#88887f', '#45c187', '#128756'];
  const data = buckets.map((bucket, index) => ({
    name: bucket.bucket,
    value: bucket.count,
    fill: palette[index] || '#88887f',
  }));

  return (
    <ChartFrame height={height} empty={!data.some((d) => d.value)} emptyLabel="No shelf-life predictions yet">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} layout="vertical">
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...AXIS} width={78} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${value} batches`, 'Count']} />
        <Bar {...ENTER} dataKey="value" radius={[2, 7, 7, 2]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/** Temperature (and optional humidity) trend with the compliant band shaded. */
export function EnvironmentTrendChart({ points = [], height = 260, range, showHumidity = true }) {
  const data = points.map((point) => ({
    date: point.date,
    temperature: point.avg_temperature_c,
    min: point.min_temperature_c,
    max: point.max_temperature_c,
    humidity: point.avg_humidity_pct,
  }));

  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No environmental readings yet">
      <LineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        {range && (
          <ReferenceArea
            yAxisId="temp"
            y1={range.min}
            y2={range.max}
            fill="#20a76b"
            fillOpacity={0.09}
            label={{ value: 'Recommended band', position: 'insideTopLeft', fontSize: 10, fill: '#0e6b46' }}
          />
        )}
        <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
        <YAxis yAxisId="temp" {...AXIS} unit="°" width={44} />
        {showHumidity && <YAxis yAxisId="hum" orientation="right" {...AXIS} unit="%" width={40} domain={[0, 100]} />}
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
          formatter={(value, name) => {
            if (value === null || value === undefined) return ['—', name];
            if (name === 'humidity') return [`${Math.round(value)}%`, 'Humidity'];
            return [`${Number(value).toFixed(1)} °C`, name === 'temperature' ? 'Avg temperature' : name];
          }}
        />
        <Legend verticalAlign="top" height={26} iconType="plainline" wrapperStyle={{ fontSize: 11, color: 'rgb(var(--content-secondary))' }} />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temperature"
          name="Temperature"
          stroke="#0284c7"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="max"
          name="Daily max"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="4 3"
          dot={false}
        />
        {showHumidity && (
          <Line
            yAxisId="hum"
            type="monotone"
            dataKey="humidity"
            name="Humidity"
            stroke="#7c3aed"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            dot={false}
          />
        )}
      </LineChart>
    </ChartFrame>
  );
}

/** Category-level quality: batch count vs average score. */
export function CategoryQualityChart({ categories = [], height = 280 }) {
  const data = categories.map((category) => ({
    name: category.category_name,
    score: category.average_freshness_score ?? 0,
    batches: category.batch_count,
    atRisk: category.at_risk_count,
  }));

  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No category data yet">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 24 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} angle={-22} textAnchor="end" height={54} interval={0} />
        <YAxis {...AXIS} domain={[0, 100]} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, name) => {
            if (name === 'score') return [Math.round(value), 'Avg freshness'];
            if (name === 'atRisk') return [value, 'At-risk batches'];
            return [value, name];
          }}
        />
        <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgb(var(--content-secondary))' }} />
        <Bar {...ENTER} dataKey="score" name="Avg freshness" fill="#128756" radius={[7, 7, 2, 2]} maxBarSize={34} />
        <Bar {...ENTER} dataKey="atRisk" name="At risk" fill="#f59e0b" radius={[7, 7, 2, 2]} maxBarSize={34} />
      </BarChart>
    </ChartFrame>
  );
}

/** Projected remaining shelf life over the coming days. */
export function ShelfLifeProjectionChart({ points = [], height = 220 }) {
  const data = points.map((point) => ({ date: point.date, days: point.remaining_shelf_life_days }));
  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No projection available">
      <AreaChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="shelfProjectionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#128756" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#128756" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
        <YAxis {...AXIS} />
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
          formatter={(value) => [`${Number(value).toFixed(1)} days`, 'Remaining']}
        />
        <Area {...ENTER} type="monotone" dataKey="days" stroke="#128756" strokeWidth={2} fill="url(#shelfProjectionFill)" />
      </AreaChart>
    </ChartFrame>
  );
}

/** Alert volume over time. */
export function AlertTrendChart({ points = [], height = 220 }) {  const data = points.map((point) => ({ date: point.date, count: point.count }));
  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No alerts in this period">
      <AreaChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(value) => formatDate(value, 'dd MMM yyyy')}
          formatter={(value) => [value, 'Alerts']}
        />
        <Area {...ENTER} type="monotone" dataKey="count" stroke="#d97706" strokeWidth={2} fill="url(#alertFill)" />
      </AreaChart>
    </ChartFrame>
  );
}

/** Alerts by severity. */
export function SeverityBreakdownChart({ bySeverity = {}, height = 220 }) {
  const order = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const colors = { INFO: '#32bef8', LOW: '#88887f', MEDIUM: '#f8c950', HIGH: '#f5b229', CRITICAL: '#e3554c' };
  const data = order
    .filter((key) => bySeverity[key] !== undefined)
    .map((key) => ({ name: key.charAt(0) + key.slice(1).toLowerCase(), value: bySeverity[key], fill: colors[key] }));

  return (
    <ChartFrame height={height} empty={!data.some((d) => d.value)} emptyLabel="No alerts recorded">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [value, 'Alerts']} />
        <Bar {...ENTER} dataKey="value" radius={[7, 7, 2, 2]} maxBarSize={44}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/** Compliance status mix. */
export function ComplianceChart({ counts = {}, height = 220 }) {
  const colors = { COMPLIANT: '#128756', WARNING: '#f5b229', NON_COMPLIANT: '#e3554c', UNKNOWN: '#b0b0aa' };
  const labels = { COMPLIANT: 'Compliant', WARNING: 'Warning', NON_COMPLIANT: 'Non-compliant', UNKNOWN: 'Not recorded' };
  const data = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ name: labels[key] || key, value, fill: colors[key] || '#b0b0aa' }));

  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No storage evaluations yet">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3} {...ENTER}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} formatter={(value, name) => [`${value} batches`, name]} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgb(var(--content-secondary))' }} />
      </PieChart>
    </ChartFrame>
  );
}

/** Radar of the four weighted score components (explainability). */
export function ScoreComponentRadar({ components = {}, height = 250 }) {
  const data = [
    { axis: 'Visual', value: components.visual ?? 0 },
    { axis: 'Storage', value: components.storage ?? 0 },
    { axis: 'Shelf life', value: components.shelf_life ?? 0 },
    { axis: 'Product age', value: components.product_age ?? 0 },
  ];

  return (
    <ChartFrame height={height} empty={data.every((d) => !d.value)} emptyLabel="No component scores">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#57534e' }} />
        <Radar {...ENTER} dataKey="value" stroke="#15803d" fill="#20a76b" fillOpacity={0.32} />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${Math.round(value)} / 100`, 'Score']} />
      </RadarChart>
    </ChartFrame>
  );
}

/** Spoilage indicator frequency (inspector view). */
export function IndicatorFrequencyChart({ indicators = [], height = 260 }) {
  const data = indicators.map((item) => ({
    name: item.indicator_type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    count: item.detection_count,
    confidence: item.average_confidence ? Math.round(item.average_confidence * 100) : 0,
  }));

  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No spoilage indicators detected yet">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 6, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} allowDecimals={false} />
        <YAxis type="category" dataKey="name" {...AXIS} width={112} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, name, entry) =>
            name === 'count'
              ? [`${value} detections (avg confidence ${entry.payload.confidence}%)`, 'Detections']
              : [value, name]
          }
        />
        <Bar {...ENTER} dataKey="count" fill="#be123c" radius={[2, 7, 7, 2]} maxBarSize={20} />
      </BarChart>
    </ChartFrame>
  );
}

/** Waste risk: quantity at risk vs total. */
export function WasteRiskChart({ topAtRisk = [], height = 260 }) {
  const data = topAtRisk.map((item) => ({
    name: item.product_name?.slice(0, 18) || item.batch_number,
    quantity: item.quantity,
    value: item.estimated_value ?? 0,
  }));

  return (
    <ChartFrame height={height} empty={!data.length} emptyLabel="No stock currently at risk">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 30 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} angle={-20} textAnchor="end" height={54} interval={0} />
        <YAxis {...AXIS} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, name) => [
            name === 'value' ? value.toFixed(2) : value,
            name === 'value' ? 'Estimated value' : 'Quantity',
          ]}
        />
        <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgb(var(--content-secondary))' }} />
        <Bar {...ENTER} dataKey="quantity" name="Quantity" fill="#f59e0b" radius={[7, 7, 2, 2]} maxBarSize={30} />
        <Bar {...ENTER} dataKey="value" name="Est. value" fill="#be123c" radius={[7, 7, 2, 2]} maxBarSize={30} />
      </BarChart>
    </ChartFrame>
  );
}

/** Batch-level freshness history. */
export function BatchFreshnessHistoryChart({ points = [], height = 240 }) {
  const data = points.map((point) => ({
    date: point.created_at,
    score: point.freshness_score,
    visual: point.visual_score,
    storage: point.storage_score,
  }));

  return (
    <ChartFrame height={height} empty={data.length < 2} emptyLabel="Run at least two analyses to see a trend">
      <LineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={20} />
        <YAxis {...AXIS} domain={[0, 100]} />
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(value) => formatDate(value, 'dd MMM yyyy HH:mm')}
          formatter={(value, name) => [Math.round(value), name]}
        />
        <Legend verticalAlign="top" height={26} iconType="plainline" wrapperStyle={{ fontSize: 11, color: 'rgb(var(--content-secondary))' }} />
        <Line {...ENTER} type="monotone" dataKey="score" name="Freshness" stroke="#15803d" strokeWidth={2.2} dot={{ r: 3 }} />
        <Line {...ENTER} type="monotone" dataKey="visual" name="Visual" stroke="#0284c7" strokeWidth={1.4} strokeDasharray="4 3" dot={false} />
        <Line {...ENTER} type="monotone" dataKey="storage" name="Storage" stroke="#f59e0b" strokeWidth={1.4} strokeDasharray="2 2" dot={false} />
      </LineChart>
    </ChartFrame>
  );
}
