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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { cn } from '../../lib/utils';

export const CHART_COLORS = {
  lavender: '#8b7bd8',
  sky: '#5ca4d8',
  mint: '#4aa87d',
  peach: '#e0805a',
  butter: '#d4a92c',
  blush: '#d1738f',
};
export const SERIES_COLORS = Object.values(CHART_COLORS);

const AXIS_PROPS = {
  stroke: '#a29889',
  tick: { fill: '#7a7065', fontSize: 11.5 },
  tickLine: false,
  axisLine: false,
};

export function ChartTooltip({ contentStyle, ...props }) {
  return (
    <Tooltip
      cursor={{ fill: 'rgba(107,87,196,0.06)' }}
      contentStyle={{
        borderRadius: 12,
        border: '1px solid #ece7e0',
        boxShadow: '0 18px 40px -16px rgba(31,27,22,0.2)',
        fontSize: 12.5,
        padding: '8px 10px',
        ...contentStyle,
      }}
      labelStyle={{ fontWeight: 600, color: '#1f1b16', marginBottom: 2 }}
      {...props}
    />
  );
}

/** Card wrapper with title, description, loading/empty handling. */
export function ChartCard({
  title,
  description,
  children,
  actions,
  isEmpty,
  emptyMessage = 'No data to display yet.',
  className,
  contentClassName,
  height = 260,
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-0.5">{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent className={contentClassName}>
        {isEmpty ? (
          <EmptyState compact preset="empty" title="Nothing to chart" description={emptyMessage} />
        ) : (
          <div style={{ width: '100%', height }}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function AreaTrendChart({ data, dataKey, xKey = 'label', color = CHART_COLORS.lavender, height = 260, ...rest }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} {...rest}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ece7e0" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} width={38} />
        <ChartTooltip />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.2}
          fill={`url(#grad-${dataKey})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrendChart({ data, series = [], xKey = 'label', height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ece7e0" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} width={38} />
        <ChartTooltip />
        {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((entry, index) => (
          <Line
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color || SERIES_COLORS[index % SERIES_COLORS.length]}
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeriesChart({ data, series = [], xKey = 'label', height = 260, stacked = false, layout }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ece7e0" vertical={layout === 'vertical'} />
        <XAxis dataKey={layout === 'vertical' ? undefined : xKey} type={layout === 'vertical' ? 'number' : 'category'} {...AXIS_PROPS} />
        <YAxis
          dataKey={layout === 'vertical' ? xKey : undefined}
          type={layout === 'vertical' ? 'category' : 'number'}
          width={layout === 'vertical' ? 96 : 38}
          {...AXIS_PROPS}
        />
        <ChartTooltip />
        {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((entry, index) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            name={entry.label}
            stackId={stacked ? 'stack' : undefined}
            radius={layout === 'vertical' ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            fill={entry.color || SERIES_COLORS[index % SERIES_COLORS.length]}
            maxBarSize={layout === 'vertical' ? 22 : 44}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, nameKey = 'name', valueKey = 'value', height = 240, colors = SERIES_COLORS }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={3}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={entry[nameKey] || index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <ChartTooltip />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadarMasteryChart({ data, series = [], height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#ece7e0" />
        <PolarAngleAxis dataKey="label" tick={{ fill: '#7a7065', fontSize: 11.5 }} />
        <ChartTooltip />
        {series.map((entry, index) => (
          <Radar
            key={entry.key}
            name={entry.label}
            dataKey={entry.key}
            stroke={entry.color || SERIES_COLORS[index % SERIES_COLORS.length]}
            fill={entry.color || SERIES_COLORS[index % SERIES_COLORS.length]}
            fillOpacity={0.25}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, dataKey = 'value', color = CHART_COLORS.mint, height = 56 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#spark-${dataKey})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export { ResponsiveContainer };
