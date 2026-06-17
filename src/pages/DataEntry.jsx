import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { electricityService } from '../services/electricityService';
import { useAuth } from '../contexts/AuthContext';
import { Save, Search, Edit3, PlusCircle, AlertCircle, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import { CARBON_EMISSION_FACTOR, TREE_ABSORPTION_FACTOR_MONTH } from '../utils/constants';

// In a real app, this might come from a DB or config
const METER_MAPPING = {
    '012892858': '19000343',
    '012642429': '19126185'
};

const USER_OPTIONS = Object.keys(METER_MAPPING);

export default function DataEntry() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [checkingData, setCheckingData] = useState(false);

    const [formData, setFormData] = useState({
        user_number: USER_OPTIONS[0], // Default to first
        meter_code: METER_MAPPING[USER_OPTIONS[0]],
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        electricity_usage: '',
        total_with_vat: '',
        ft_rate: ''
    });

    // Auto-map meter code when user changes
    useEffect(() => {
        if (formData.user_number && METER_MAPPING[formData.user_number]) {
            setFormData(prev => ({
                ...prev,
                meter_code: METER_MAPPING[formData.user_number]
            }));
        }
    }, [formData.user_number]);

    // Auto-fetch existing record for Edit Mode
    useEffect(() => {
        const checkExistingRecord = async () => {
            if (!formData.user_number || !formData.month || !formData.year) return;

            setCheckingData(true);
            try {
                const records = await electricityService.getRecords({
                    user_number: formData.user_number,
                    month: formData.month,
                    year: formData.year
                });

                if (records.length > 0) {
                    // Found existing record -> Switch to Edit Mode
                    const record = records[0];
                    setIsEditMode(true);
                    setEditingId(record.id);
                    setFormData(prev => ({
                        ...prev,
                        electricity_usage: record.electricity_usage,
                        total_with_vat: record.total_with_vat,
                        ft_rate: record.ft_rate || ''
                    }));
                    // toast('Found existing record. Switched to Edit Mode.', { icon: '📝' });
                } else {
                    // No record -> Switch to Add Mode
                    setIsEditMode(false);
                    setEditingId(null);
                    // Only clear usage/cost if we were previously editing (to avoid clearing user input mid-typing if logic triggers oddly, though here dependencies are safe)
                    // Actually, if user switches month, they expect a fresh form.
                    setFormData(prev => ({
                        ...prev,
                        electricity_usage: '',
                        total_with_vat: '',
                        ft_rate: ''
                    }));
                }
            } catch (error) {
                console.error("Error checking record:", error);
            } finally {
                setCheckingData(false);
            }
        };

        // Debounce slightly or just run
        const timer = setTimeout(checkExistingRecord, 300);
        return () => clearTimeout(timer);

    }, [formData.user_number, formData.month, formData.year]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.user_number || !formData.meter_code || !formData.electricity_usage || !formData.total_with_vat) {
                throw new Error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
            }

            const dataToSubmit = {
                ...formData,
                month: Number(formData.month),
                year: Number(formData.year),
                electricity_usage: Number(formData.electricity_usage),
                total_with_vat: Number(formData.total_with_vat),
                ft_rate: formData.ft_rate ? Number(formData.ft_rate) : 0,
                carbon_emissions: Number(formData.electricity_usage) * CARBON_EMISSION_FACTOR
            };

            if (isEditMode && editingId) {
                // UPDATE
                await electricityService.updateRecord(editingId, dataToSubmit);
                toast.success(`อัปเดตข้อมูลเรียบร้อยสำหรับ ${dataToSubmit.user_number} (เดือน ${dataToSubmit.month})`);

                // Clear data and return to "Add Mode" (Visual reset)
                setFormData(prev => ({
                    ...prev,
                    electricity_usage: '',
                    total_with_vat: '',
                    ft_rate: ''
                }));
                setIsEditMode(false);
                setEditingId(null);

            } else {
                // ADD
                // The service checks duplicates, but our UI logic should have already caught it and switched to edit mode.
                // Double check just in case.
                await electricityService.addRecord(dataToSubmit, currentUser.uid);
                toast.success('บันทึกข้อมูลใหม่เรียบร้อยแล้ว!');

                // Reset form to next month? Or stay? Let's stay but maybe clear.
                // Usually data entry is batch. Let's clear usage.
                setFormData(prev => ({
                    ...prev,
                    electricity_usage: '',
                    total_with_vat: '',
                    ft_rate: ''
                }));
                // Note: checkingData useEffect will run again and see no record, setting edit mode false.
            }

        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {isEditMode ? <Edit3 className="w-6 h-6 text-amber-500" /> : <PlusCircle className="w-6 h-6 text-primary-600" />}
                    {isEditMode ? 'แก้ไขข้อมูลเดิม' : 'บันทึกข้อมูลใหม่'}
                </h2>
                {checkingData && <span className="text-sm text-gray-400">กำลังตรวจสอบ...</span>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Row 1: User & Meter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเลขผู้ใช้ (User Number)</label>
                        <select
                            name="user_number"
                            value={formData.user_number}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                            {USER_OPTIONS.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสเครื่องวัด (Meter Code)</label>
                        <input
                            type="text"
                            name="meter_code"
                            value={formData.meter_code}
                            readOnly
                            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Row 2: Date Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg border border-gray-100">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เดือน</label>
                        <select
                            name="month"
                            value={formData.month}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ปี (ค.ศ.)</label>
                        <select
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Status Indicator */}
                {isEditMode && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-amber-700">
                                    คุณกำลังแก้ไขข้อมูลที่มีอยู่แล้ว การบันทึกจะทับข้อมูลเดิม
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Row 3: Data Inputs */}
                <div className="space-y-4">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนหน่วยที่ใช้ (kWh)</label>
                        <input
                            type="number"
                            name="electricity_usage"
                            value={formData.electricity_usage}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0.00"
                            step="0.01"
                            required
                        />

                        {formData.electricity_usage && Number(formData.electricity_usage) > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                        <Leaf className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-emerald-700 font-medium">คาดการณ์การปล่อยคาร์บอน (Carbon Footprint)</p>
                                        <p className="text-lg font-bold text-emerald-950">
                                            {(Number(formData.electricity_usage) * CARBON_EMISSION_FACTOR).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgCO2e
                                        </p>
                                    </div>
                                </div>
                                <div className="sm:text-right">
                                    <p className="text-xs text-emerald-700 font-medium">เทียบเท่าการปลูกต้นไม้ชดเชย</p>
                                    <p className="text-sm font-bold text-emerald-900">
                                        ~{(Number(formData.electricity_usage) * CARBON_EMISSION_FACTOR / TREE_ABSORPTION_FACTOR_MONTH).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ต้น/เดือน
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ยอดเงินรวมภาษี (บาท)</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">฿</span>
                            </div>
                            <input
                                type="number"
                                name="total_with_vat"
                                value={formData.total_with_vat}
                                onChange={handleChange}
                                className="w-full pl-7 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ค่า Ft (บาท/หน่วย) - ไม่บังคับ</label>
                        <input
                            type="number"
                            name="ft_rate"
                            value={formData.ft_rate}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || checkingData}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
            ${isEditMode
                            ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500'
                            : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
                        }
            disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {loading ? 'กำลังบันทึก...' : (isEditMode ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล')}
                </button>
            </form>
        </div>
    );
}
