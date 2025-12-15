import React, { useState } from 'react';
import Papa from 'papaparse';
import { useAuth } from '../contexts/AuthContext';
import { electricityService } from '../services/electricityService';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const REQUIRED_HEADERS = ['user_number', 'month', 'year', 'electricity_usage', 'total_with_vat'];

export default function BulkImport() {
    const { currentUser } = useAuth();
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
                setError("กรุณาอัปโหลดไฟล์นามสกุล CSV เท่านั้น");
                return;
            }
            setFile(selectedFile);
            setError('');
            setImportResult(null);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Validate headers
                const headers = results.meta.fields;
                const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    setError(`ไม่พบข้อมูลคอลัมน์ที่จำเป็น: ${missingHeaders.join(', ')}`);
                    setPreviewData([]);
                    return;
                }

                // Transform and clean data
                const cleanData = results.data.map(row => ({
                    user_number: row.user_number?.toString().trim(),
                    meter_code: row.meter_code?.toString().trim() || '', // Optional in CSV if we auto-map later, but better if provided or we map logic here
                    month: Number(row.month),
                    year: Number(row.year),
                    electricity_usage: Number(row.electricity_usage),
                    total_with_vat: Number(row.total_with_vat),
                    ft_rate: row.ft_rate ? Number(row.ft_rate) : 0
                })).filter(row => row.user_number && !isNaN(row.month)); // Basic filter

                setPreviewData(cleanData);
            },
            error: (error) => {
                setError("เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: " + error.message);
            }
        });
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setLoading(true);
        try {
            // Auto-map meter code logic if missing (reuse logic from DataEntry or Service if simpler)
            // For now, let's assume if missing in CSV, we try to map strictly known ones or leave empty?
            // Let's implement simple mapping here or ensure service handles it? 
            // The service addRecord logic doesn't auto-map. The UI did. 
            // Let's stick to what's in the CSV or simple mapping.

            const METER_MAPPING = {
                '012892858': '19000343',
                '012642429': '19126185'
            };

            const dataToImport = previewData.map(row => ({
                ...row,
                meter_code: row.meter_code || METER_MAPPING[row.user_number] || ''
            }));

            const results = await electricityService.batchAddRecords(dataToImport, currentUser.uid);
            setImportResult(results);

            if (results.success > 0) {
                toast.success(`นำเข้าข้อมูลสำเร็จ ${results.success} รายการ`);
            }
            if (results.duplicates > 0 || results.errors.length > 0) {
                toast('บางรายการถูกข้ามเนื่องจากข้อมูลซ้ำหรือผิดพลาด', { icon: '⚠️' });
            }

        } catch (err) {
            setError("การนำเข้าล้มเหลว: " + err.message);
            toast.error("การนำเข้าล้มเหลว");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <Upload className="w-8 h-8 text-primary-600" />
                นำเข้าข้อมูลจำนวนมาก (CSV)
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">1. อัปโหลดไฟล์ CSV</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        ไฟล์ต้องมีหัวข้อคอลัมน์ดังนี้: <code>user_number, month, year, electricity_usage, total_with_vat</code>
                    </p>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {importResult && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                        <h3 className="font-semibold mb-2">ผลการนำเข้า</h3>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <p className="text-sm text-green-800">สำเร็จ</p>
                                <p className="text-xl font-bold text-green-900">{importResult.success}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <p className="text-sm text-yellow-800">ซ้ำ/ข้าม</p>
                                <p className="text-xl font-bold text-yellow-900">{importResult.duplicates}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <p className="text-sm text-red-800">ผิดพลาด</p>
                                <p className="text-xl font-bold text-red-900">{importResult.errors.length}</p>
                            </div>
                        </div>
                        {importResult.errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-600 max-h-40 overflow-y-auto bg-white p-2 rounded border">
                                {importResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                            </div>
                        )}
                    </div>
                )}

                {previewData.length > 0 && !importResult && (
                    <div>
                        <h2 className="text-lg font-semibold mb-2">2. ตรวจสอบข้อมูล ({previewData.length} รายการ)</h2>
                        <div className="overflow-x-auto border border-gray-200 rounded-md max-h-60 mb-4">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left">หมายเลขผู้ใช้</th>
                                        <th className="px-4 py-2 text-left">เดือน/ปี</th>
                                        <th className="px-4 py-2 text-right">จำนวนหน่วย</th>
                                        <th className="px-4 py-2 text-right">ยอดเงิน</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {previewData.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2">{row.user_number}</td>
                                            <td className="px-4 py-2">{row.month}/{row.year}</td>
                                            <td className="px-4 py-2 text-right">{row.electricity_usage}</td>
                                            <td className="px-4 py-2 text-right">{row.total_with_vat}</td>
                                        </tr>
                                    ))}
                                    {previewData.length > 10 && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-2 text-center text-gray-500">
                                                ...and {previewData.length - 10} more rows...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {loading ? 'กำลังนำเข้า...' : `ยืนยันการนำเข้า ${previewData.length} รายการ`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
