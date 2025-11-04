import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaWhatsapp, FaPaperPlane, FaComments, FaUser, FaSignOutAlt } from 'react-icons/fa';
import axios from 'axios';
import SiteLogo from '../assets/SiteLogo.png';

const Navbar = ({ clientInfo }) => {
    const location = useLocation();
    const API_BASE = 'http://localhost:5000/api';

    const disconnectWhatsApp = async () => {
        try {
            await axios.post(`${API_BASE}/disconnect`);
            window.location.reload(); // Reload to reset state
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    };

    const isActive = (path) => {
        return location.pathname === path ? 'bg-emerald-500 text-white' : 'text-gray-700 hover:bg-gray-100';
    };

    return (
        <nav className="bg-white shadow-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center gap-3">
                        <div className="p-0.5 bg-emerald-500 rounded-lg">
                            <Link to="/"><img src={SiteLogo} alt="Logo" className='w-10'/></Link>
                        </div>
                        <div>
                            <Link to="/" className="flex flex-col">
                                <h1 className="text-xl font-bold text-gray-900">WhatsApp Web</h1>
                                <p className="text-xs text-gray-500">Connected as <span className='text-blue-900 font-extrabold'>{clientInfo?.phoneNumber.slice(2)}</span></p>
                            </Link>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {/* <Link
                            to="/message"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive('/message')}`}
                        >
                            <FaComments className="text-lg" />
                            Messages
                        </Link> */}

                        <Link
                            to="/bulk-message"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive('/bulk-message')}`}
                        >
                            <FaPaperPlane className="text-lg" />
                            Bulk Message
                        </Link>
                    </div>

                    {/* User Info and Logout */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <FaUser className="text-gray-400" />
                            <div className='flex flex-col'>
                                <span className="text-md font-bold">{clientInfo?.name}</span>
                                {/* <span className="text-sm">+{clientInfo?.phoneNumber}</span> */}
                            </div>
                        </div>

                        <button
                            onClick={disconnectWhatsApp}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        >
                            <FaSignOutAlt />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;