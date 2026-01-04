/**
 * ApexChartComponents - Reusable ApexCharts Components
 * 
 * Pre-configured chart components for consistent styling across the app.
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    success: '#22c55e',
    warning: '#f97316',
    danger: '#ef4444',
    info: '#3b82f6',
    colors: ['#1a237e', '#c5a153', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'],
};

// ============================================
// MINI SPARKLINE CHART
// For inline statistics with trend visualization
// ============================================

interface MiniSparklineProps {
    data: number[];
    color?: string;
    height?: number;
    width?: number | string;
    type?: 'line' | 'area' | 'bar';
}

export function MiniSparkline({
    data,
    color = THEME.navy,
    height = 35,
    width = '100%',
    type = 'area'
}: MiniSparklineProps) {
    const options: ApexOptions = useMemo(() => ({
        chart: {
            type,
            sparkline: { enabled: true },
            animations: {
                enabled: true,
                speed: 500,
            },
        },
        stroke: {
            curve: 'smooth',
            width: type === 'bar' ? 0 : 2,
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 100],
            },
        },
        colors: [color],
        tooltip: { enabled: false },
        plotOptions: {
            bar: {
                columnWidth: '60%',
                borderRadius: 2,
            },
        },
    }), [color, type]);

    const series = useMemo(() => [{
        name: 'Value',
        data,
    }], [data]);

    if (!data || data.length === 0) return null;

    return (
        <Chart
            options={options}
            series={series}
            type={type}
            height={height}
            width={width}
        />
    );
}

// ============================================
// RADIAL PROGRESS CHART
// For displaying percentage completion
// ============================================

interface RadialProgressProps {
    value: number;
    label?: string;
    color?: string;
    size?: number;
    showValue?: boolean;
}

export function RadialProgress({
    value,
    label,
    color = THEME.navy,
    size = 100,
    showValue = true
}: RadialProgressProps) {
    const options: ApexOptions = useMemo(() => ({
        chart: {
            type: 'radialBar',
            sparkline: { enabled: true },
        },
        plotOptions: {
            radialBar: {
                hollow: {
                    size: '60%',
                },
                track: {
                    background: '#e5e7eb',
                },
                dataLabels: {
                    name: {
                        show: !!label,
                        fontSize: '10px',
                        fontFamily: 'Cairo, Tajawal, sans-serif',
                        color: '#6b7280',
                        offsetY: label ? 20 : 0,
                    },
                    value: {
                        show: showValue,
                        fontSize: '16px',
                        fontFamily: 'Cairo, Tajawal, sans-serif',
                        fontWeight: 700,
                        color,
                        offsetY: label ? -5 : 5,
                        formatter: (val: number) => `${Math.round(val)}%`,
                    },
                },
            },
        },
        colors: [color],
        labels: label ? [label] : [],
    }), [color, label, showValue]);

    return (
        <Chart
            options={options}
            series={[Math.min(100, Math.max(0, value))]}
            type="radialBar"
            height={size}
            width={size}
        />
    );
}

// ============================================
// HORIZONTAL BAR CHART
// For comparing values across categories
// ============================================

interface HorizontalBarChartProps {
    data: { label: string; value: number }[];
    height?: number;
    color?: string;
    showValues?: boolean;
}

export function HorizontalBarChart({
    data,
    height = 200,
    color = THEME.navy,
    showValues = true
}: HorizontalBarChartProps) {
    const options: ApexOptions = useMemo(() => ({
        chart: {
            type: 'bar',
            toolbar: { show: false },
            fontFamily: 'Cairo, Tajawal, sans-serif',
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '70%',
                distributed: true,
                dataLabels: {
                    position: 'top',
                },
            },
        },
        colors: [color],
        dataLabels: {
            enabled: showValues,
            textAnchor: 'start',
            style: {
                fontSize: '11px',
                fontFamily: 'Cairo, Tajawal, sans-serif',
                colors: ['#374151'],
            },
            offsetX: 5,
        },
        xaxis: {
            categories: data.map(d => d.label),
            labels: {
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                    fontSize: '11px',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                    fontSize: '12px',
                },
            },
        },
        grid: {
            borderColor: '#e5e7eb',
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } },
        },
        legend: { show: false },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val: number) => val.toLocaleString('ar-EG'),
            },
        },
    }), [data, showValues]);

    const series = useMemo(() => [{
        name: 'القيمة',
        data: data.map(d => d.value),
    }], [data]);

    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
                لا توجد بيانات
            </div>
        );
    }

    return (
        <Chart
            options={options}
            series={series}
            type="bar"
            height={height}
        />
    );
}

// ============================================
// DONUT CHART
// For displaying distribution/breakdown
// ============================================

interface DonutChartProps {
    data: { label: string; value: number }[];
    height?: number;
    showLegend?: boolean;
    showTotal?: boolean;
    totalLabel?: string;
}

export function DonutChart({
    data,
    height = 280,
    showLegend = true,
    showTotal = true,
    totalLabel = 'الإجمالي'
}: DonutChartProps) {
    const options: ApexOptions = useMemo(() => ({
        chart: {
            type: 'donut',
            fontFamily: 'Cairo, Tajawal, sans-serif',
        },
        labels: data.map(d => d.label),
        colors: THEME.colors,
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: showTotal,
                        name: {
                            show: true,
                            fontFamily: 'Cairo, Tajawal, sans-serif',
                        },
                        value: {
                            show: true,
                            fontFamily: 'Cairo, Tajawal, sans-serif',
                            fontSize: '20px',
                            fontWeight: 700,
                        },
                        total: {
                            show: true,
                            label: totalLabel,
                            fontFamily: 'Cairo, Tajawal, sans-serif',
                            fontSize: '12px',
                            color: '#6b7280',
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce(
                                    (a: number, b: number) => a + b, 0
                                );
                                return total.toLocaleString('ar-EG');
                            },
                        },
                    },
                },
            },
        },
        legend: {
            show: showLegend,
            position: 'bottom',
            fontFamily: 'Cairo, Tajawal, sans-serif',
            fontSize: '12px',
        },
        dataLabels: {
            enabled: false,
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val: number) => val.toLocaleString('ar-EG'),
            },
        },
    }), [data, showLegend, showTotal, totalLabel]);

    const series = useMemo(() => data.map(d => d.value), [data]);

    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
                لا توجد بيانات
            </div>
        );
    }

    return (
        <Chart
            options={options}
            series={series}
            type="donut"
            height={height}
        />
    );
}

// ============================================
// AREA TIMELINE CHART
// For showing trends over time
// ============================================

interface TimelineChartProps {
    data: { date: string; value: number }[];
    height?: number;
    color?: string;
    title?: string;
    valueFormatter?: (val: number) => string;
}

export function TimelineChart({
    data,
    height = 200,
    color = THEME.navy,
    title = 'القيمة',
    valueFormatter = (val) => val.toLocaleString('ar-EG')
}: TimelineChartProps) {
    const options: ApexOptions = useMemo(() => ({
        chart: {
            type: 'area',
            toolbar: { show: false },
            fontFamily: 'Cairo, Tajawal, sans-serif',
            zoom: { enabled: false },
        },
        stroke: {
            curve: 'smooth',
            width: 2,
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.5,
                opacityTo: 0.1,
                stops: [0, 100],
            },
        },
        colors: [color],
        xaxis: {
            categories: data.map(d => d.date),
            labels: {
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                    fontSize: '10px',
                },
                rotate: -45,
                rotateAlways: data.length > 7,
            },
        },
        yaxis: {
            labels: {
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                },
                formatter: valueFormatter,
            },
        },
        grid: {
            borderColor: '#e5e7eb',
            strokeDashArray: 4,
        },
        tooltip: {
            theme: 'light',
            x: { show: true },
            y: {
                formatter: valueFormatter,
            },
        },
        dataLabels: { enabled: false },
    }), [data, color, valueFormatter]);

    const series = useMemo(() => [{
        name: title,
        data: data.map(d => d.value),
    }], [data, title]);

    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
                لا توجد بيانات
            </div>
        );
    }

    return (
        <Chart
            options={options}
            series={series}
            type="area"
            height={height}
        />
    );
}

// Export everything
export { THEME as ChartTheme };
