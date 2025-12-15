import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, Cell
} from 'recharts';
import { electricityService } from '../services/electricityService';
import { Zap, DollarSign, Calendar, TrendingUp, Filter, Leaf, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#6366f1'];

export default function Dashboard() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        latestCost: 0,
        latestMonthLabel: '',

        avgCost: 0,
        totalYearlyCost: 0,
        carbonFootprint: 0,
        insight: null,
        momDiff: null
    });

    // Chart 1: Yearly Data
    const [yearlyData, setYearlyData] = useState([]);
    // Chart 2: Monthly Comparison (Line)
    const [monthlyComparisonData, setMonthlyComparisonData] = useState([]);
    // Chart 3: Specific Month Selection
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Chart 4: Monthly History Stacked by Meter
    const [monthlyHistoryData, setMonthlyHistoryData] = useState([]);
    const [uniqueMeters, setUniqueMeters] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const data = await electricityService.getRecords();
            setRecords(data);
            processData(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    function processData(data) {
        if (data.length === 0) return;

        // 1. Calculate Stats
        const sortedByDate = [...data].sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });

        const latestRecord = sortedByDate[0];
        const latestMonth = latestRecord ? { month: latestRecord.month, year: latestRecord.year } : null;

        // Metrics for Latest Month
        const latestRecords = data.filter(r => r.month === latestMonth?.month && r.year === latestMonth?.year);
        const latestCost = latestRecords.reduce((acc, curr) => acc + curr.total_with_vat, 0);
        const latestUsage = latestRecords.reduce((acc, curr) => acc + curr.electricity_usage, 0);

        const totalCost = data.reduce((acc, curr) => acc + curr.total_with_vat, 0);

        // Carbon Footprint Logic
        const carbonFootprint = latestUsage * 0.4999;

        // Insight Logic
        let insightMsg = "เริ่มต้นประหยัดพลังงานวันนี้!";
        let insightType = "neutral";

        if (latestMonth) {
            // Compare to Last Year
            const lastYearRecords = data.filter(r => r.month === latestMonth.month && r.year === latestMonth.year - 1);
            if (lastYearRecords.length > 0) {
                const lastYearCost = lastYearRecords.reduce((acc, curr) => acc + curr.total_with_vat, 0);
                const diffPercent = ((latestCost - lastYearCost) / lastYearCost) * 100;

                if (diffPercent > 0) {
                    insightMsg = `⚠️ ใช้ไฟเพิ่มขึ้น ${diffPercent.toFixed(1)}% เทียบกับเดือนเดียวกันปีก่อน`;
                    insightType = "warning";
                } else {
                    insightMsg = `✅ ยอดเยี่ยม! คุณประหยัดได้ ${Math.abs(diffPercent).toFixed(1)}% เทียบกับปีก่อน`;
                    insightType = "good";
                }
            } else {
                // Compare to Last Month
                let prevMonth = latestMonth.month - 1;
                let prevYear = latestMonth.year;
                if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

                const prevMonthRecords = data.filter(r => r.month === prevMonth && r.year === prevYear);
                if (prevMonthRecords.length > 0) {
                    const prevMonthCost = prevMonthRecords.reduce((acc, curr) => acc + curr.total_with_vat, 0);
                    const diffPercent = ((latestCost - prevMonthCost) / prevMonthCost) * 100;

                    if (diffPercent > 0) {
                        insightMsg = `⚠️ ใช้ไฟเพิ่มขึ้น ${diffPercent.toFixed(1)}% จากเดือนที่แล้ว`;
                        insightType = "warning";
                    } else {
                        insightMsg = `📉 ใช้ไฟลดลง ${Math.abs(diffPercent).toFixed(1)}% จากเดือนที่แล้ว`;
                        insightType = "good";
                    }
                }
            }
        }


        // Calculate MoM explicitly for the Card (regardless of Insight Banner)
        let momDiff = null;
        if (latestMonth) {
            let prevMonth = latestMonth.month - 1;
            let prevYear = latestMonth.year;
            if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
            const prevMonthRecords = data.filter(r => r.month === prevMonth && r.year === prevYear);
            if (prevMonthRecords.length > 0) {
                const prevMonthCost = prevMonthRecords.reduce((acc, curr) => acc + curr.total_with_vat, 0);
                momDiff = ((latestCost - prevMonthCost) / prevMonthCost) * 100;
            }
        }

        setStats({
            latestCost: latestCost,
            latestMonthLabel: latestMonth ? `${new Date(0, latestMonth.month - 1).toLocaleString('default', { month: 'short' })} ${latestMonth.year}` : 'N/A',
            avgCost: totalCost / data.length,
            totalYearlyCost: totalCost,
            carbonFootprint: carbonFootprint,
            insight: { message: insightMsg, type: insightType },
            momDiff: momDiff
        });

        // 2. Yearly Comparison Data
        const yearlyGroups = data.reduce((acc, curr) => {
            if (!acc[curr.year]) acc[curr.year] = 0;
            acc[curr.year] += curr.total_with_vat;
            return acc;
        }, {});

        const yearlyChartData = Object.keys(yearlyGroups).map(year => ({
            name: year,
            cost: yearlyGroups[year]
        })).sort((a, b) => a.name - b.name);

        setYearlyData(yearlyChartData);

        // 3. Month Comparison across Years
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const comparisonData = months.map(m => {
            const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
            const row = { name: monthName };
            Object.keys(yearlyGroups).forEach(year => {
                const totalForMonthYear = data
                    .filter(r => r.year === Number(year) && r.month === m)
                    .reduce((acc, curr) => acc + curr.total_with_vat, 0);
                row[year] = totalForMonthYear;
            });
            return row;
        });

        setMonthlyComparisonData(comparisonData);

        // 4. Transform for Stacked Monthly History by Meter Code
        // Find all unique meter codes
        const meters = [...new Set(data.map(r => r.meter_code || 'Unknown'))];
        setUniqueMeters(meters);

        // Group by Month/Year
        const historyMap = {};
        data.forEach(r => {
            const key = `${r.year}-${String(r.month).padStart(2, '0')}`; // e.g. 2024-01 for sorting
            const label = `${new Date(0, r.month - 1).toLocaleString('default', { month: 'short' })} ${r.year}`;

            if (!historyMap[key]) {
                historyMap[key] = { sortKey: key, xLabel: label };
                meters.forEach(m => historyMap[key][m] = 0); // Initialize all meters to 0
            }
            const meter = r.meter_code || 'Unknown';
            historyMap[key][meter] += r.total_with_vat;
        });

        const sortedHistory = Object.values(historyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        setMonthlyHistoryData(sortedHistory);
    }

    // Helper for Specific Month Chart - NOW STACKED BY METER
    const getSpecificMonthData = () => {
        const filtered = records.filter(r => r.month === selectedMonth);

        // Group by Year first, then aggregate each meter inside
        const groupedByYear = {};

        filtered.forEach(r => {
            const year = r.year;
            if (!groupedByYear[year]) {
                groupedByYear[year] = { year: year }; // Init object
                uniqueMeters.forEach(m => groupedByYear[year][m] = 0);
            }
            const meter = r.meter_code || 'Unknown';
            groupedByYear[year][meter] += r.total_with_vat;
        });

        return Object.values(groupedByYear).sort((a, b) => a.year - b.year);
    };

    const [error, setError] = useState(null);

    // ...

    async function fetchData() {
        try {
            setError(null);
            const data = await electricityService.getRecords();
            setRecords(data);
            processData(data);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์การเข้าถึง");
        } finally {
            setLoading(false);
        }
    }

    // ...

    if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;

    if (error) return (
        <div className="p-8 text-center">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 inline-block text-left">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">
                            {error}
                        </p>
                    </div>
                </div>
            </div>
            <button
                onClick={fetchData}
                className="mt-4 block mx-auto text-primary-600 hover:text-primary-800 underline"
            >
                ลองใหม่
            </button>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary-600" />
                ภาพรวมการใช้พลังงาน
            </h1>


            {/* Trend Insight Banner */}
            {stats.insight && (
                <div className={`p-4 rounded-lg border-l-4 flex items-start gap-3 shadow-sm
                    ${stats.insight.type === 'good' ? 'bg-green-50 border-green-500 text-green-800' :
                        stats.insight.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-800' :
                            'bg-blue-50 border-blue-500 text-blue-800'}`}>
                    {stats.insight.type === 'good' ? <Zap className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <div>
                        <p className="font-semibold text-sm uppercase tracking-wide opacity-80 mb-1">ผลกระทบ & คำแนะนำ</p>
                        <p className="font-medium text-lg">
                            {stats.insight.message}
                        </p>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-xl shadow-sm border flex items-center relative overflow-hidden ${stats.momDiff === null ? 'bg-white border-gray-100' :
                    stats.momDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}>
                    <div className={`absolute right-0 top-0 h-full w-2 ${stats.momDiff === null ? 'bg-primary-500' :
                        stats.momDiff > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
                    <div className="p-4 bg-primary-50 rounded-full mr-5">
                        <Zap className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">ค่าไฟล่าสุด ({stats.latestMonthLabel})</p>
                        <p className="text-3xl font-bold text-gray-900">฿{stats.latestCost.toLocaleString()}</p>
                        {stats.momDiff !== null && (
                            <p className={`text-sm mt-1 flex items-center ${stats.momDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {stats.momDiff > 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                                {Math.abs(stats.momDiff).toFixed(1)}% จากเดือนก่อน
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 bg-teal-50 rounded-full mr-5">
                        <Leaf className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">คาร์บอนฟุตปริ้นท์</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {stats.carbonFootprint?.toFixed(1) || 0}
                            <span className="text-sm text-gray-400 font-normal ml-1">kgCO2e</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 bg-blue-50 rounded-full mr-5">
                        <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">ค่าเฉลี่ยต่อบิล</p>
                        <p className="text-3xl font-bold text-gray-900">฿{stats.avgCost.toFixed(0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Monthly History (All Time) - Stacked by Meter */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-500" />
                        ประวัติรายเดือน (แยกตามมิเตอร์)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyHistoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="xLabel" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `฿${value}`} />
                                <Tooltip formatter={(value, name) => [`฿${value.toLocaleString()}`, `Meter: ${name}`]} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                {uniqueMeters.map((meter, index) => (
                                    <Bar
                                        key={meter}
                                        dataKey={meter}
                                        name={meter}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                        radius={[index === uniqueMeters.length - 1 ? 4 : 0, index === uniqueMeters.length - 1 ? 4 : 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Yearly Comparison */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        ค่าใช้จ่ายรายปี
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `฿${value / 1000}k`} />
                                <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                                <Bar dataKey="cost" name="Total Cost" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Monthly Comparison (Year over Year) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        แนวโน้มตามฤดูกาล (เทียบรายปี)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px' }} />
                                <Legend />
                                {yearlyData.map((yearObj, index) => (
                                    <Line
                                        key={yearObj.name}
                                        type="monotone"
                                        dataKey={yearObj.name}
                                        name={`ปี ${yearObj.name}`}
                                        stroke={COLORS[index % COLORS.length]}
                                        strokeWidth={3}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 4. Deep Dive: Specific Month Comparison - NOW STACKED */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        เปรียบเทียบเฉพาะเดือน:
                        <span className="text-primary-600 ml-1">
                            {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })}
                        </span>
                    </h3>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg border bg-gray-50"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>
                                {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="h-80">
                    {getSpecificMonthData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getSpecificMonthData()} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `฿${value}`} />
                                <YAxis dataKey="year" type="category" axisLine={false} tickLine={false} width={60} style={{ fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value, name) => [`฿${value.toLocaleString()}`, `Meter: ${name}`]} contentStyle={{ borderRadius: '8px' }} />
                                <Legend />
                                {uniqueMeters.map((meter, index) => (
                                    <Bar
                                        key={meter}
                                        dataKey={meter}
                                        name={meter}
                                        stackId="a"
                                        fill={COLORS[index % COLORS.length]}
                                        barSize={32}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Filter className="w-12 h-12 mb-2 opacity-20" />
                            <p>ไม่มีข้อมูลสำหรับเดือนนี้</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
