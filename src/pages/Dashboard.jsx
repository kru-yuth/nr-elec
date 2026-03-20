import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { electricityService } from '../services/electricityService';
import { Zap, DollarSign, Calendar, TrendingUp, Filter, Leaf, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#6366f1'];

export default function Dashboard() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        latestCost: 0,
        latestMonthLabel: '',
        avgCost: 0,
        totalYearlyCost: 0,
        carbonFootprint: 0,
        insight: null,
        momDiff: null
    });

    // Chart states
    const [yearlyData, setYearlyData] = useState([]);
    const [monthlyComparisonData, setMonthlyComparisonData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [monthlyHistoryData, setMonthlyHistoryData] = useState([]);
    const [uniqueMeters, setUniqueMeters] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const data = await electricityService.getRecords();
            if (data && data.length > 0) {
                setRecords(data);
                processData(data);
            } else {
                setRecords([]);
            }
        } catch (err) {
            console.warn("Notice: Dashboard is currently in restricted mode (Missing Firestore Rules).");
            setError(`ไม่สามารถดึงข้อมูลได้ (Permission Denied). หากคุณเพิ่งเริ่มใช้งาน โปรดอัปเดตกฎ Firestore Rules ในโปรเจคต์ 'nr-nexus' ก่อน`);
        } finally {
            setLoading(false);
        }
    }

    function processData(data) {
        if (!data || data.length === 0) return;

        // 1. Calculate Stats
        const sortedByDate = [...data].sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });

        const latestRecord = sortedByDate[0];
        const latestMonth = latestRecord ? { month: latestRecord.month, year: latestRecord.year } : null;

        const latestRecords = data.filter(r => r.month === latestMonth?.month && r.year === latestMonth?.year);
        const latestCost = latestRecords.reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);
        const latestUsage = latestRecords.reduce((acc, curr) => acc + (Number(curr.electricity_usage) || 0), 0);
        const totalCost = data.reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);

        // MoM Diff
        let momDiff = null;
        if (latestMonth) {
            let prevMonth = latestMonth.month - 1;
            let prevYear = latestMonth.year;
            if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
            const prevRecords = data.filter(r => r.month === prevMonth && r.year === prevYear);
            if (prevRecords.length > 0) {
                const prevCost = prevRecords.reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);
                if (prevCost > 0) momDiff = ((latestCost - prevCost) / prevCost) * 100;
            }
        }

        setStats({
            latestCost,
            latestMonthLabel: latestMonth ? `${new Date(0, latestMonth.month - 1).toLocaleString('th-TH', { month: 'short' })} ${latestMonth.year + 543}` : 'N/A',
            avgCost: totalCost / data.length,
            totalYearlyCost: totalCost,
            carbonFootprint: latestUsage * 0.4999,
            insight: { message: "พร้อมแสดงผลข้อมูลแล้ว", type: "neutral" },
            momDiff
        });

        // 2. Yearly Chart
        const yearlyGroups = data.reduce((acc, curr) => {
            acc[curr.year] = (acc[curr.year] || 0) + (Number(curr.total_with_vat) || 0);
            return acc;
        }, {});
        setYearlyData(Object.entries(yearlyGroups).map(([year, cost]) => ({ name: year, cost })).sort((a, b) => a.name - b.name));

        // 3. Comparison Chart
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const comparison = months.map(m => {
            const row = { name: new Date(0, m - 1).toLocaleString('th-TH', { month: 'short' }) };
            Object.keys(yearlyGroups).forEach(year => {
                row[year] = data.filter(r => r.year === Number(year) && r.month === m)
                                .reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);
            });
            return row;
        });
        setMonthlyComparisonData(comparison);

        // 4. Meters History
        const meters = [...new Set(data.map(r => r.meter_code || 'Unknown'))];
        setUniqueMeters(meters);
        const historyMap = {};
        data.forEach(r => {
            const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
            if (!historyMap[key]) {
                historyMap[key] = { sortKey: key, xLabel: `${new Date(0, r.month - 1).toLocaleString('th-TH', { month: 'short' })} ${r.year + 543}` };
                meters.forEach(m => historyMap[key][m] = 0);
            }
            historyMap[key][r.meter_code || 'Unknown'] += (Number(r.total_with_vat) || 0);
        });
        setMonthlyHistoryData(Object.values(historyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey)));
    }

    const getSpecificMonthData = () => {
        const filtered = records.filter(r => r.month === selectedMonth);
        const grouped = {};
        filtered.forEach(r => {
            const yearBE = r.year + 543;
            if (!grouped[yearBE]) {
                grouped[yearBE] = { year: yearBE };
                uniqueMeters.forEach(m => grouped[yearBE][m] = 0);
            }
            grouped[yearBE][r.meter_code || 'Unknown'] += (Number(r.total_with_vat) || 0);
        });
        return Object.values(grouped).sort((a, b) => a.year - b.year);
    };

    // Helper for currency formatting
    const formatCurrency = (val) => {
        return (Number(val) || 0).toLocaleString('th-TH', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    if (loading) return <div className="p-12 text-center text-gray-500 font-medium">กำลังเตรียมข้อมูล...</div>;

    if (error) return (
        <div className="p-12 text-center">
            <div className="bg-red-50 border border-red-200 p-6 rounded-xl inline-block text-left shadow-sm">
                <div className="flex items-center gap-3 text-red-700 mb-4">
                    <AlertCircle className="h-6 w-6" />
                    <span className="font-bold text-lg">เกิดข้อผิดพลาด</span>
                </div>
                <p className="text-red-600 mb-6">{error}</p>
                <button onClick={fetchData} className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-bold">
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        </div>
    );

    if (records.length === 0) return (
        <div className="p-12 text-center text-gray-400">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl">ยังไม่มีข้อมูลสถิติในระบบ</p>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary-600" />
                ภาพรวมการใช้พลังงาน
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 flex items-center gap-5 ${
                    stats.momDiff === null ? 'bg-white border-gray-100' :
                    stats.momDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                    <div className={`p-4 rounded-xl ${
                        stats.momDiff === null ? 'bg-primary-50 text-primary-600' :
                        stats.momDiff > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}><Zap size={32} /></div>
                    <div>
                        <p className={`text-sm font-medium mb-0.5 ${
                            stats.momDiff === null ? 'text-gray-400' :
                            stats.momDiff > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>ค่าไฟล่าสุด ({stats.latestMonthLabel})</p>
                        <p className={`text-3xl font-bold ${
                            stats.momDiff === null ? 'text-gray-900' :
                            stats.momDiff > 0 ? 'text-red-900' : 'text-green-900'
                        }`}>฿{formatCurrency(stats.latestCost)}</p>
                        {stats.momDiff !== null && (
                            <div className={`flex items-center text-sm font-bold mt-1 ${stats.momDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {stats.momDiff > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                {Math.abs(stats.momDiff).toFixed(2)}% {stats.momDiff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-teal-50 rounded-xl text-teal-600"><Leaf size={32} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-400">คาร์บอนฟุตปริ้นท์</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.carbonFootprint)} <span className="text-sm font-normal text-gray-400">kgCO2e</span></p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-blue-50 rounded-xl text-blue-600"><DollarSign size={32} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-400">ค่าเฉลี่ยต่อบิล</p>
                        <p className="text-3xl font-bold text-gray-900">฿{formatCurrency(stats.avgCost)}</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">ประวัติรายเดือน (แยกตามมิเตอร์)</h3>
                    <div style={{ width: '100%', height: 400, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={monthlyHistoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="xLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v) => `฿${formatCurrency(v)}`} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="top" height={36} />
                                {uniqueMeters.map((m, i) => (
                                    <Bar key={m} dataKey={m} name={m} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === uniqueMeters.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 text-gray-800">ค่าใช้จ่ายรายปี</h3>
                    <div style={{ width: '100%', height: 350, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={yearlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tickFormatter={(v) => `ปี ${Number(v) + 543}`} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(v) => `฿${formatCurrency(v)}`} labelFormatter={(v) => `ปี พ.ศ. ${Number(v) + 543}`} />
                                <Bar dataKey="cost" name="รวมค่าไฟ" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 text-gray-800">แนวโน้มตามฤดูกาล (เทียบรายปี)</h3>
                    <div style={{ width: '100%', height: 350, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={monthlyComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                                <Tooltip formatter={(v) => `฿${formatCurrency(v)}`} />
                                <Legend formatter={(v) => `ปี ${Number(v) + 543}`} />
                                {yearlyData.map((y, i) => (
                                    <Line key={y.name} type="monotone" dataKey={y.name} name={y.name} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Selection Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        เจาะลึกเดือน: <span className="text-primary-600">{new Date(0, selectedMonth - 1).toLocaleString('th-TH', { month: 'long' })}</span>
                    </h3>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full sm:w-48 p-2.5 outline-none font-medium"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('th-TH', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>

                <div style={{ width: '100%', height: 400, minHeight: 300 }}>
                    {getSpecificMonthData().length > 0 ? (
                        <ResponsiveContainer>
                            <BarChart data={getSpecificMonthData()} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                                <YAxis dataKey="year" type="category" axisLine={false} tickLine={false} width={60} style={{ fontWeight: 'bold' }} tickFormatter={(v) => `${v}`} />
                                <Tooltip cursor={{ fill: 'transparent' }} formatter={(v, n) => [`฿${formatCurrency(v)}`, `มิเตอร์: ${n}`]} labelFormatter={(v) => `ปี พ.ศ. ${v}`} />
                                <Legend />
                                {uniqueMeters.map((m, i) => (
                                    <Bar key={m} dataKey={m} name={m} stackId="a" fill={COLORS[i % COLORS.length]} barSize={32} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                            <Filter className="w-12 h-12 mb-4 opacity-10" />
                            <p className="font-medium text-lg italic">ไม่มีข้อมูลสำหรับเดือนนี้</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
