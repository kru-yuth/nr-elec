import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, PlusCircle, Users, LogOut, Menu, X, Upload, LogIn } from 'lucide-react';

export default function Layout() {
    const { currentUser, userRole, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    async function handleLogout() {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    }

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-primary-600">NR Electricity</span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    to="/"
                                    className={`${isActive('/') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                >
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    แดชบอร์ด
                                </Link>
                                {currentUser && (
                                    <Link
                                        to="/entry"
                                        className={`${isActive('/entry') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        บันทึกข้อมูล
                                    </Link>
                                )}
                                {userRole === 'admin' && (
                                    <>
                                        <Link
                                            to="/users"
                                            className={`${isActive('/users') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            จัดการผู้ใช้
                                        </Link>
                                        <Link
                                            to="/import"
                                            className={`${isActive('/import') ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            นำเข้า CSV
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:items-center">
                            {currentUser ? (
                                <>
                                    <span className="text-sm text-gray-500 mr-4">{currentUser.email}</span>
                                    <button
                                        onClick={handleLogout}
                                        className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                        title="ออกจากระบบ"
                                    >
                                        <LogOut className="w-6 h-6" />
                                    </button>
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    เข้าสู่ระบบ
                                </Link>
                            )}
                        </div>
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                            >
                                {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            <Link
                                to="/"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`${isActive('/') ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                            >
                                แดชบอร์ด
                            </Link>
                            {currentUser && (
                                <Link
                                    to="/entry"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`${isActive('/entry') ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                                >
                                    บันทึกข้อมูล
                                </Link>
                            )}
                            {userRole === 'admin' && (
                                <Link
                                    to="/users"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`${isActive('/users') ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                                >
                                    จัดการผู้ใช้
                                </Link>
                            )}
                            {userRole === 'admin' && (
                                <Link
                                    to="/import"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`${isActive('/import') ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                                >
                                    นำเข้า CSV
                                </Link>
                            )}
                            {currentUser ? (
                                <button
                                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                    className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                                >
                                    ออกจากระบบ
                                </button>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-primary-600 hover:bg-gray-50 hover:text-primary-700"
                                >
                                    เข้าสู่ระบบ
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}
