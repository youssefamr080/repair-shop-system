/**
 * StockChart - Dashboard Stock Levels Chart Component
 * 
 * Uses ApexCharts for professional data visualization.
 * Displays stock distribution by category with a donut/bar chart.
 */

import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BarChart3 } from 'lucide-react';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
    colors: ['#1a237e', '#c5a153', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'],
};

// Interface matching Dashboard.tsx CategoryStock
interface CategoryStock {
    name: string;
    count: number;
    lowStock: number;
}

interface StockChartProps {
    data: CategoryStock[];
    loading?: boolean;
    title?: string;
    chartType?: 'bar' | 'donut' | 'area';
}

export function StockChart({
    data,
    loading,
    title = "توزيع المخزون",
    chartType = 'bar'
}: StockChartProps) {

    // Generate chart options based on type
    const chartOptions: ApexOptions = useMemo(() => {
        const baseOptions: ApexOptions = {
            chart: {
                fontFamily: 'Cairo, Tajawal, sans-serif',
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    speed: 800,
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                },
                background: 'transparent',
            },
            theme: {
                mode: 'light',
            },
            colors: THEME.colors,
            dataLabels: {
                enabled: chartType === 'donut',
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                    fontWeight: 600,
                },
            },
            legend: {
                position: 'bottom',
                fontFamily: 'Cairo, Tajawal, sans-serif',
                fontSize: '12px',
                markers: {
                    size: 8,
                    offsetY: 0,
                },
            },
            tooltip: {
                enabled: true,
                theme: 'light',
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                },
                y: {
                    formatter: (val: number) => `${val} منتج`,
                },
            },
            noData: {
                text: 'لا توجد بيانات',
                style: {
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                    fontSize: '14px',
                    color: '#9ca3af',
                },
            },
        };

        if (chartType === 'bar') {
            return {
                ...baseOptions,
                chart: {
                    ...baseOptions.chart,
                    type: 'bar',
                    height: 280,
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        borderRadius: 6,
                        columnWidth: '60%',
                        distributed: true,
                        dataLabels: {
                            position: 'top',
                        },
                    },
                },
                xaxis: {
                    categories: data.map(d => d.name),
                    labels: {
                        style: {
                            fontFamily: 'Cairo, Tajawal, sans-serif',
                            fontSize: '11px',
                        },
                        rotate: -45,
                        rotateAlways: data.length > 5,
                    },
                },
                yaxis: {
                    labels: {
                        style: {
                            fontFamily: 'Cairo, Tajawal, sans-serif',
                        },
                        formatter: (val: number) => Math.round(val).toString(),
                    },
                },
                grid: {
                    borderColor: '#e5e7eb',
                    strokeDashArray: 4,
                },
                dataLabels: {
                    enabled: true,
                    offsetY: -20,
                    style: {
                        fontSize: '11px',
                        fontFamily: 'Cairo, Tajawal, sans-serif',
                        fontWeight: 600,
                        colors: ['#374151'],
                    },
                },
            };
        }

        if (chartType === 'donut') {
            return {
                ...baseOptions,
                chart: {
                    ...baseOptions.chart,
                    type: 'donut',
                    height: 280,
                },
                labels: data.map(d => d.name),
                plotOptions: {
                    pie: {
                        donut: {
                            size: '65%',
                            labels: {
                                show: true,
                                name: {
                                    show: true,
                                    fontFamily: 'Cairo, Tajawal, sans-serif',
                                },
                                value: {
                                    show: true,
                                    fontFamily: 'Cairo, Tajawal, sans-serif',
                                    formatter: (val: string) => `${val}`,
                                },
                                total: {
                                    show: true,
                                    label: 'الإجمالي',
                                    fontFamily: 'Cairo, Tajawal, sans-serif',
                                    formatter: (w) => {
                                        const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                                        return total.toString();
                                    },
                                },
                            },
                        },
                    },
                },
            };
        }

        // Area chart
        return {
            ...baseOptions,
            chart: {
                ...baseOptions.chart,
                type: 'area',
                height: 280,
            },
            xaxis: {
                categories: data.map(d => d.name),
                labels: { style: { fontFamily: 'Cairo, Tajawal, sans-serif' } },
            },
            yaxis: {
                labels: { style: { fontFamily: 'Cairo, Tajawal, sans-serif' } },
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 100],
                },
            },
        };
    }, [data, chartType]);

    // Chart series data
    const series = useMemo(() => {
        if (chartType === 'donut') {
            return data.map(d => d.count);
        }
        return [{
            name: 'المنتجات',
            data: data.map(d => d.count),
        }];
    }, [data, chartType]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <BarChart3 className="h-5 w-5" style={{ color: THEME.gold }} />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[280px] flex items-center justify-center">
                        <div className="animate-pulse space-y-4 w-full">
                            <div className="flex items-end justify-around h-48 gap-2">
                                {[60, 80, 45, 90, 70].map((h, i) => (
                                    <div
                                        key={i}
                                        className="bg-muted rounded-t w-12"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-around">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-3 w-12 bg-muted rounded" />
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                        <BarChart3 className="h-5 w-5" style={{ color: THEME.gold }} />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                        لا توجد بيانات متاحة
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: THEME.navy }}>
                    <BarChart3 className="h-5 w-5" style={{ color: THEME.gold }} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Chart
                    options={chartOptions}
                    series={series}
                    type={chartType}
                    height={280}
                />
            </CardContent>
        </Card>
    );
}
