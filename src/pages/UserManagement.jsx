import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { Users, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("ไม่สามารถโหลดรายชื่อผู้ใช้งานได้");
        } finally {
            setLoading(false);
        }
    }

    async function handleRoleToggle(uid, roleToToggle) {
        const user = users.find(u => u.id === uid);
        if (!user) return;

        let newRoles = [...(user.roles || [])];
        if (newRoles.includes(roleToToggle)) {
            // Don't allow removing 'user' role if it's the only one
            if (roleToToggle === 'user' && newRoles.length === 1) return;
            newRoles = newRoles.filter(r => r !== roleToToggle);
        } else {
            newRoles.push(roleToToggle);
        }

        try {
            await userService.updateUser(uid, { roles: newRoles });
            // Optimistic update
            setUsers(users.map(u =>
                u.id === uid ? { ...u, roles: newRoles } : u
            ));
            toast.success("อัปเดตสิทธิ์สำเร็จ");
        } catch (error) {
            console.error("Error updating roles:", error);
            toast.error("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์");
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary-600" />
                จัดการผู้ใช้งาน
            </h1>

            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ผู้ใช้งาน / อีเมล</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สิทธิ์การใช้งาน (Roles)</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการสิทธิ์</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
                                                <UserIcon size={20} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-gray-900">{user.email || 'No Email'}</div>
                                                <div className="text-xs text-gray-400 font-mono">{user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-2">
                                            {(user.roles || []).map(r => (
                                                <span key={r} className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                                                    r === 'admin' 
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                                    : 'bg-green-50 text-green-700 border-green-200'
                                                }`}>
                                                    {r.toUpperCase()}
                                                </span>
                                            ))}
                                            {(!user.roles || user.roles.length === 0) && (
                                                <span className="text-gray-400 text-xs italic">No roles assigned</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleRoleToggle(user.id, 'admin')}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    user.roles?.includes('admin')
                                                    ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                                                    : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                                                }`}
                                            >
                                                <Shield size={14} />
                                                ADMIN
                                            </button>
                                            <button
                                                onClick={() => handleRoleToggle(user.id, 'user')}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    user.roles?.includes('user')
                                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                                                    : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                                                }`}
                                            >
                                                <UserIcon size={14} />
                                                USER
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
