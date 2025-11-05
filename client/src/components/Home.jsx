import React, { useState } from 'react';
import {
    FaWhatsapp,
    FaSpinner,
    FaCheckCircle,
    FaExclamationTriangle,
    FaTimes,
    FaComments,
    FaPaperPlane,
    FaQrcode,
    FaSignOutAlt,
    FaGlobe,
} from 'react-icons/fa';
import { FaRegCircleUser } from "react-icons/fa6";
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SiteLogo from '../assets/SiteLogo.png';

const Home = ({ isConnected, status, clientInfo, setIsConnected, setStatus, setClientInfo }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [qrCode, setQrCode] = useState('');

    const API_BASE = 'http://localhost:5000/api';

    const initializeWhatsApp = async () => {
        try {
            setIsLoading(true);
            const response = await axios.post(`${API_BASE}/initialize`);

            if (response.data.status === 'qr_generated') {
                setQrCode(response.data.qr);
                setStatus('qr_generated');
                toast.info('QR Code Generated - Please scan to connect', {
                    position: "top-right",
                    autoClose: 10000,
                });
            } else if (response.data.status === 'already_connected') {
                setIsConnected(true);
                setStatus('connected');
                fetchClientInfo();
                toast.success('WhatsApp is already connected!', {
                    position: "top-right",
                    autoClose: 3000,
                });
            }
        } catch (error) {
            console.error('Error initializing WhatsApp:', error);
            toast.error(`Error initializing WhatsApp: ${error.message}`, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClientInfo = async () => {
        try {
            const response = await axios.get(`${API_BASE}/client-info`);
            setClientInfo(response.data);
        } catch (error) {
            console.error('Error fetching client info:', error);
        }
    };

    const disconnectWhatsApp = async () => {
        try {
            await axios.post(`${API_BASE}/disconnect`);
            setIsConnected(false);
            setStatus('disconnected');
            setQrCode('');
            setClientInfo(null);
            toast.info('WhatsApp disconnected successfully', {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error) {
            console.error('Error disconnecting:', error);
            toast.error('Error disconnecting WhatsApp', {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };

    const StatusIndicator = ({ status }) => {
        const getStatusConfig = () => {
            switch (status) {
                case 'connected':
                    return {
                        color: 'bg-emerald-500',
                        icon: <FaCheckCircle className="text-emerald-500" />,
                        text: 'Connected',
                        bg: 'bg-emerald-50',
                        border: 'border-emerald-200'
                    };
                case 'qr_generated':
                    return {
                        color: 'bg-amber-500',
                        icon: <FaExclamationTriangle className="text-amber-500" />,
                        text: 'Scan QR Code',
                        bg: 'bg-amber-50',
                        border: 'border-amber-200'
                    };
                default:
                    return {
                        color: 'bg-gray-400',
                        icon: <FaTimes className="text-gray-400" />,
                        text: 'Disconnected',
                        bg: 'bg-gray-50',
                        border: 'border-gray-200'
                    };
            }
        };

        const config = getStatusConfig();

        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} ${config.border} border`}>
                {config.icon}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                    <span className="text-sm font-medium text-gray-700">{config.text}</span>
                </div>
            </div>
        );
    };

    // If connected, show welcome message with navigation options
    if (isConnected) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="p-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                            <img src={SiteLogo} alt="logo" className='w-12' />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Welcome to WhatsApp Web
                            </h1>
                            {/* <p className="text-gray-600 mt-2 text-xl">You are successfully connected!</p> */}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-2xl mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <FaRegCircleUser className='text-6xl' />
                            <div className="text-left">
                                <h2 className="text-2xl font-bold text-gray-900">{clientInfo?.name}</h2>
                                <p className="text-gray-600">+{clientInfo?.phoneNumber}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-8">
                            {/* <div className="text-center p-6 bg-blue-50 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-all cursor-pointer group">
                                <FaComments className="text-4xl text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-xl font-semibold text-blue-800 mb-2">Messages</h3>
                                <p className="text-blue-600">Chat with individual contacts</p>
                            </div> */}

                            <Link to="/bulk-message">
                                <div className="text-center p-6 bg-green-50 rounded-xl border-2 border-green-200 hover:shadow-lg transition-all cursor-pointer group">
                                    <FaPaperPlane className="text-4xl text-green-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-semibold text-green-800 mb-2">Bulk Messages</h3>
                                    <p className="text-green-600">Send messages to multiple numbers</p>
                                </div>
                            </Link>
                        </div>

                        <p className="text-gray-500 mt-8 text-sm">
                            Use the navigation bar above to switch between different features
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // If not connected, show connection interface
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                        <img src={SiteLogo} alt="Logo" className='w-12'/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            WhatsApp Bulk Messenger
                        </h1>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
                {/* Connection Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl ">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FaGlobe className="text-xl text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Connection Status</h2>
                    </div>

                    <StatusIndicator status={status} />

                    <div className="mt-6 space-y-3">
                        {!isConnected && status !== 'qr_generated' && (
                            <button
                                onClick={initializeWhatsApp}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {isLoading ? <FaSpinner className="animate-spin" /> : <FaQrcode className="text-lg" />}
                                Connect WhatsApp
                            </button>
                        )}

                        {isConnected && (
                            <button
                                onClick={disconnectWhatsApp}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <FaSignOutAlt />
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>

                {/* QR Code Card */}
                {status === 'qr_generated' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <FaQrcode className="text-xl text-amber-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Scan QR Code</h3>
                        </div>

                        <div className="flex justify-center p-4 bg-white rounded-xl border-2 border-dashed border-amber-200">
                            <img
                                src={qrCode}
                                alt="WhatsApp QR Code"
                                className="w-56 h-56 rounded-lg shadow-lg"
                            />
                        </div>

                        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-sm text-amber-800 font-medium text-center">
                                Open WhatsApp → Settings → Linked Devices → Link a Device
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;