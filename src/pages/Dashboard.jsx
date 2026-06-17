import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { electricityService } from '../services/electricityService';
import { Zap, DollarSign, Calendar, TrendingUp, Filter, Leaf, AlertCircle, ArrowUp, ArrowDown, Globe } from 'lucide-react';
import { CARBON_EMISSION_FACTOR, TREE_ABSORPTION_FACTOR_MONTH, TREE_ABSORPTION_FACTOR_YEAR } from '../utils/constants';

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#6366f1'];

export default function Dashboard() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('cost'); // 'cost' or 'carbon'
    const [stats, setStats] = useState({
        latestCost: 0,
        latestCarbon: 0,
        latestMonthLabel: '',
        avgCost: 0,
        avgCarbon: 0,
        totalYearlyCost: 0,
        totalYearlyCarbon: 0,
        carbonFootprint: 0,
        insight: null,
        momDiff: null,
        carbonMomDiff: null
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
        const latestCarbon = latestRecords.reduce((acc, curr) => acc + (Number(curr.carbon_emissions) || (Number(curr.electricity_usage) * CARBON_EMISSION_FACTOR)), 0);
        
        const totalCost = data.reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);
        const totalCarbon = data.reduce((acc, curr) => acc + (Number(curr.carbon_emissions) || (Number(curr.electricity_usage) * CARBON_EMISSION_FACTOR)), 0);

        // MoM Diff
        let momDiff = null;
        let carbonMomDiff = null;
        if (latestMonth) {
            let prevMonth = latestMonth.month - 1;
            let prevYear = latestMonth.year;
            if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
            const prevRecords = data.filter(r => r.month === prevMonth && r.year === prevYear);
            if (prevRecords.length > 0) {
                const prevCost = prevRecords.reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);
                if (prevCost > 0) momDiff = ((latestCost - prevCost) / prevCost) * 100;

                const prevCarbon = prevRecords.reduce((acc, curr) => acc + (Number(curr.carbon_emissions) || (Number(curr.electricity_usage) * CARBON_EMISSION_FACTOR)), 0);
                if (prevCarbon > 0) carbonMomDiff = ((latestCarbon - prevCarbon) / prevCarbon) * 100;
            }
        }

        setStats({
            latestCost,
            latestCarbon,
            latestMonthLabel: latestMonth ? `${new Date(0, latestMonth.month - 1).toLocaleString('th-TH', { month: 'short' })} ${latestMonth.year + 543}` : 'N/A',
            avgCost: totalCost / data.length,
            avgCarbon: totalCarbon / data.length,
            totalYearlyCost: totalCost,
            totalYearlyCarbon: totalCarbon,
            carbonFootprint: latestCarbon,
            insight: { message: "พร้อมแสดงผลข้อมูลแล้ว", type: "neutral" },
            momDiff,
            carbonMomDiff
        });

        // 2. Yearly Chart
        const yearlyGroups = data.reduce((acc, curr) => {
            const carbonVal = Number(curr.carbon_emissions) || (Number(curr.electricity_usage) * CARBON_EMISSION_FACTOR);
            if (!acc[curr.year]) {
                acc[curr.year] = { cost: 0, carbon: 0 };
            }
            acc[curr.year].cost += (Number(curr.total_with_vat) || 0);
            acc[curr.year].carbon += carbonVal;
            return acc;
        }, {});
        setYearlyData(Object.entries(yearlyGroups).map(([year, val]) => ({ name: year, cost: val.cost, carbon: val.carbon })).sort((a, b) => a.name - b.name));

        // 3. Comparison Chart
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const comparison = months.map(m => {
            const row = { name: new Date(0, m - 1).toLocaleString('th-TH', { month: 'short' }) };
            Object.keys(yearlyGroups).forEach(year => {
                const filtered = data.filter(r => r.year === Number(year) && r.month === m);
                row[`${year}_cost`] = filtered.reduce((acc, curr) => acc + (Number(curr.total_with_vat) || 0), 0);
                row[`${year}_carbon`] = filtered.reduce((acc, curr) => acc + (Number(curr.carbon_emissions) || (Number(curr.electricity_usage) * CARBON_EMISSION_FACTOR)), 0);
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
            const carbonVal = Number(r.carbon_emissions) || (Number(r.electricity_usage) * CARBON_EMISSION_FACTOR);
            if (!historyMap[key]) {
                historyMap[key] = { sortKey: key, xLabel: `${new Date(0, r.month - 1).toLocaleString('th-TH', { month: 'short' })} ${r.year + 543}` };
                meters.forEach(m => {
                    historyMap[key][`${m}_cost`] = 0;
                    historyMap[key][`${m}_carbon`] = 0;
                });
            }
            historyMap[key][`${r.meter_code || 'Unknown'}_cost`] += (Number(r.total_with_vat) || 0);
            historyMap[key][`${r.meter_code || 'Unknown'}_carbon`] += carbonVal;
        });
        setMonthlyHistoryData(Object.values(historyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey)));
    }

    const getSpecificMonthData = () => {
        const filtered = records.filter(r => r.month === selectedMonth);
        const grouped = {};
        filtered.forEach(r => {
            const yearBE = r.year + 543;
            const carbonVal = Number(r.carbon_emissions) || (Number(r.electricity_usage) * CARBON_EMISSION_FACTOR);
            if (!grouped[yearBE]) {
                grouped[yearBE] = { year: yearBE };
                uniqueMeters.forEach(m => {
                    grouped[yearBE][`${m}_cost`] = 0;
                    grouped[yearBE][`${m}_carbon`] = 0;
                });
            }
            grouped[yearBE][`${r.meter_code || 'Unknown'}_cost`] += (Number(r.total_with_vat) || 0);
            grouped[yearBE][`${r.meter_code || 'Unknown'}_carbon`] += carbonVal;
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

    // Helper for YAxis format
    const formatYAxis = (v) => {
        if (viewMode === 'cost') {
            return `฿${(v / 1000).toFixed(0)}k`;
        } else {
            return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v.toFixed(0)} kg`;
        }
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-primary-600" />
                    ภาพรวมการใช้พลังงาน
                </h1>
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
                    <button
                        onClick={() => setViewMode('cost')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                            viewMode === 'cost'
                                ? 'bg-white text-gray-900 shadow-sm font-bold'
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        ค่าไฟฟ้า (บาท)
                    </button>
                    <button
                        onClick={() => setViewMode('carbon')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                            viewMode === 'carbon'
                                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                                : 'text-gray-500 hover:text-emerald-600'
                        }`}
                    >
                        <Leaf className="w-4 h-4" />
                        คาร์บอน (kgCO2e)
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                <div className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 flex items-center gap-5 ${
                    stats.carbonMomDiff === null ? 'bg-white border-gray-100' :
                    stats.carbonMomDiff > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                }`}>
                    <div className={`p-4 rounded-xl ${
                        stats.carbonMomDiff === null ? 'bg-teal-50 text-teal-600' :
                        stats.carbonMomDiff > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}><Leaf size={32} /></div>
                    <div>
                        <p className={`text-sm font-medium mb-0.5 ${
                            stats.carbonMomDiff === null ? 'text-gray-400' :
                            stats.carbonMomDiff > 0 ? 'text-amber-600' : 'text-emerald-700'
                        }`}>คาร์บอนฟุตปริ้นท์ล่าสุด</p>
                        <p className={`text-3xl font-bold ${
                            stats.carbonMomDiff === null ? 'text-gray-900' :
                            stats.carbonMomDiff > 0 ? 'text-amber-900' : 'text-emerald-900'
                        }`}>{formatCurrency(stats.latestCarbon)} <span className="text-sm font-normal text-gray-400">kgCO2e</span></p>
                        {stats.carbonMomDiff !== null ? (
                            <div className={`flex items-center text-xs font-bold mt-1 ${stats.carbonMomDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {stats.carbonMomDiff > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                {Math.abs(stats.carbonMomDiff).toFixed(2)}% {stats.carbonMomDiff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'}
                                <span className="text-[10px] text-gray-400 font-normal ml-1" title={`ดูดซับคาร์บอนด้วยต้นไม้ (~${TREE_ABSORPTION_FACTOR_MONTH} kg/ต้น/เดือน)`}>
                                    (ชดเชย ~{(stats.latestCarbon / TREE_ABSORPTION_FACTOR_MONTH).toFixed(0)} ต้น/เดือน)
                                </span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 mt-1">
                                เทียบเท่าปลูกต้นไม้ชดเชย ~{(stats.latestCarbon / TREE_ABSORPTION_FACTOR_MONTH).toFixed(0)} ต้น/เดือน
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600"><Globe size={32} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-400">คาร์บอนสะสมทั้งหมด</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalYearlyCarbon)} <span className="text-sm font-normal text-gray-400">kgCO2e</span></p>
                        <div className="text-[10px] text-gray-400 mt-1" title={`ดูดซับคาร์บอนด้วยต้นไม้ (~${TREE_ABSORPTION_FACTOR_YEAR} kg/ต้น/ปี)`}>
                            เทียบเท่าปลูกต้นไม้ชดเชย ~{(stats.totalYearlyCarbon / TREE_ABSORPTION_FACTOR_YEAR).toFixed(0)} ต้น/ปี
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <div className="p-4 bg-blue-50 rounded-xl text-blue-600"><DollarSign size={32} /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-400">{viewMode === 'cost' ? 'ค่าเฉลี่ยต่อบิล' : 'คาร์บอนเฉลี่ยต่อบิล'}</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {viewMode === 'cost' 
                                ? `฿${formatCurrency(stats.avgCost)}` 
                                : `${formatCurrency(stats.avgCarbon)} kgCO2e`
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Eco Insights Alert */}
            {stats.carbonMomDiff !== null && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm transition-all duration-300 ${
                    stats.carbonMomDiff > 0 
                        ? 'bg-amber-50 border-amber-200 text-amber-900' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                    <div className={`p-2 rounded-lg ${
                        stats.carbonMomDiff > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">
                            {stats.carbonMomDiff > 0 ? '⚠️ ข้อแนะนำการอนุรักษ์พลังงาน' : '🎉 ยอดเยี่ยม! คาร์บอนฟุตปริ้นท์ของหน่วยงานลดลง'}
                        </h4>
                        <p className="text-xs mt-1 text-gray-700 leading-relaxed font-medium">
                            {stats.carbonMomDiff > 0 
                                ? `ในเดือนล่าสุดการปล่อยคาร์บอนเพิ่มขึ้น ${Math.abs(stats.carbonMomDiff).toFixed(1)}% (+${Math.abs(stats.latestCarbon - (stats.latestCarbon / (1 + stats.carbonMomDiff / 100))).toFixed(1)} kgCO2e) เมื่อเทียบกับเดือนก่อนหน้า หากร่วมกันปิดไฟในพื้นที่ไม่ใช้งาน จะช่วยชดเชยต้นไม้ได้อีกหลายสิบต้น!`
                                : `การปล่อยคาร์บอนลดลงจากเดือนที่แล้ว ${Math.abs(stats.carbonMomDiff).toFixed(1)}% (ลดลงได้ ${Math.abs(stats.latestCarbon - (stats.latestCarbon / (1 + stats.carbonMomDiff / 100))).toFixed(1)} kgCO2e) เทียบเท่าความสามารถในการดูดซับ CO2 ของต้นไม้เพิ่มเติมถึง ~${Math.abs((stats.latestCarbon - (stats.latestCarbon / (1 + stats.carbonMomDiff / 100))) / TREE_ABSORPTION_FACTOR_MONTH).toFixed(0)} ต้นในเดือนนี้!`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                        {viewMode === 'cost' ? 'ประวัติค่าไฟรายเดือน (แยกตามมิเตอร์)' : 'ประวัติคาร์บอนรายเดือน (แยกตามมิเตอร์)'}
                    </h3>
                    <div style={{ width: '100%', height: 400, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={monthlyHistoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="xLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                                <Tooltip 
                                    formatter={(v) => viewMode === 'cost' ? `฿${formatCurrency(v)}` : `${formatCurrency(v)} kgCO2e`} 
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                />
                                <Legend verticalAlign="top" height={36} />
                                {uniqueMeters.map((m, i) => (
                                    <Bar 
                                        key={m} 
                                        dataKey={viewMode === 'cost' ? `${m}_cost` : `${m}_carbon`} 
                                        name={m} 
                                        stackId="a" 
                                        fill={COLORS[i % COLORS.length]} 
                                        radius={i === uniqueMeters.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 text-gray-800">
                        {viewMode === 'cost' ? 'ค่าใช้จ่ายรายปี' : 'คาร์บอนฟุตปริ้นท์รายปี'}
                    </h3>
                    <div style={{ width: '100%', height: 350, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={yearlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tickFormatter={(v) => `ปี ${Number(v) + 543}`} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                <Tooltip 
                                    formatter={(v) => viewMode === 'cost' ? `฿${formatCurrency(v)}` : `${formatCurrency(v)} kgCO2e`} 
                                    labelFormatter={(v) => `ปี พ.ศ. ${Number(v) + 543}`} 
                                />
                                <Bar 
                                    dataKey={viewMode === 'cost' ? 'cost' : 'carbon'} 
                                    name={viewMode === 'cost' ? 'รวมค่าไฟ' : 'คาร์บอนรวม'} 
                                    fill={viewMode === 'cost' ? '#22c55e' : '#10b981'} 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={50} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold mb-6 text-gray-800">
                        {viewMode === 'cost' ? 'แนวโน้มตามฤดูกาล (เทียบรายปี)' : 'แนวโน้มการปล่อยคาร์บอนตามฤดูกาล'}
                    </h3>
                    <div style={{ width: '100%', height: 350, minHeight: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={monthlyComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                <Tooltip formatter={(v) => viewMode === 'cost' ? `฿${formatCurrency(v)}` : `${formatCurrency(v)} kgCO2e`} />
                                <Legend formatter={(v) => `ปี ${Number(v) + 543}`} />
                                {yearlyData.map((y, i) => (
                                    <Line 
                                        key={y.name} 
                                        type="monotone" 
                                        dataKey={viewMode === 'cost' ? `${y.name}_cost` : `${y.name}_carbon`} 
                                        name={y.name} 
                                        stroke={COLORS[i % COLORS.length]} 
                                        strokeWidth={3} 
                                        dot={{ r: 4 }} 
                                    />
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
                        <span className="text-xs text-gray-400 font-normal">
                            ({viewMode === 'cost' ? 'มุมมองค่าไฟ' : 'มุมมองคาร์บอนฟุตปริ้นท์'})
                        </span>
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
                                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={formatYAxis} />
                                <YAxis dataKey="year" type="category" axisLine={false} tickLine={false} width={60} style={{ fontWeight: 'bold' }} tickFormatter={(v) => `${v}`} />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }} 
                                    formatter={(v, n) => [
                                        viewMode === 'cost' ? `฿${formatCurrency(v)}` : `${formatCurrency(v)} kgCO2e`, 
                                        `มิเตอร์: ${n}`
                                    ]} 
                                    labelFormatter={(v) => `ปี พ.ศ. ${v}`} 
                                />
                                <Legend />
                                {uniqueMeters.map((m, i) => (
                                    <Bar 
                                        key={m} 
                                        dataKey={viewMode === 'cost' ? `${m}_cost` : `${m}_carbon`} 
                                        name={m} 
                                        stackId="a" 
                                        fill={COLORS[i % COLORS.length]} 
                                        barSize={32} 
                                    />
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
