import React, { useState } from 'react';
import {
    FaPaperPlane,
    FaSpinner,
    FaCheckCircle,
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

// eslint-disable-next-line no-unused-vars
const BulkMessage = ({ clientInfo }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [numbers, setNumbers] = useState('');

    const API_BASE = 'http://localhost:5000/api';

    const validateNumbers = async () => {
        if (!numbers.trim()) {
            toast.warning('Please enter phone numbers to validate', {
                position: "top-right",
                autoClose: 3000,
            });
            return;
        }

        try {
            const numbersArray = numbers.split('\n')
                .map(num => num.trim())
                .filter(num => num.length > 0);

            const response = await axios.post(`${API_BASE}/validate-numbers`, {
                numbers: numbersArray
            });

            const { validCount, invalidCount, results } = response.data;

            if (invalidCount === 0) {
                toast.success(`✅ All ${validCount} numbers are valid!`, {
                    position: "top-right",
                    autoClose: 5000,
                });
            } else {
                toast.warning(
                    <div>
                        <div className="font-semibold">Validation Results:</div>
                        <div>✅ {validCount} valid</div>
                        <div>❌ {invalidCount} invalid</div>
                        {invalidCount > 0 && (
                            <div className="text-xs mt-1">
                                Check console for invalid numbers details
                            </div>
                        )}
                    </div>,
                    {
                        position: "top-right",
                        autoClose: 5000,
                    }
                );

                const invalidNumbers = results.filter(r => !r.valid);
                console.log('Invalid numbers:', invalidNumbers);
            }
        } catch (error) {
            console.error('Error validating numbers:', error);
            toast.error(`Error validating numbers: ${error.message}`, {
                position: "top-right",
                autoClose: 5000,
            });
        }
    };

    const sendBulkMessages = async () => {
        if (!numbers.trim()) {
            toast.warning('Please enter phone numbers', {
                position: "top-right",
                autoClose: 3000,
            });
            return;
        }

        if (!message.trim()) {
            toast.warning('Please enter a message', {
                position: "top-right",
                autoClose: 3000,
            });
            return;
        }

        try {
            setIsLoading(true);

            const numbersArray = numbers.split('\n')
                .map(num => num.trim())
                .filter(num => num.length > 0);

            const sendingToast = toast.info(`🚀 Sending ${numbersArray.length} messages...`, {
                position: "top-right",
                autoClose: false,
                isLoading: true,
            });

            const response = await axios.post(`${API_BASE}/send-bulk`, {
                numbers: numbersArray,
                message: message
            });

            const { total, sent, failed, failedNumbers } = response.data;

            toast.dismiss(sendingToast);

            if (failed === 0) {
                toast.success(
                    <div>
                        <div className="font-semibold">🎉 All messages sent successfully!</div>
                        <div>✅ {sent} of {total} delivered</div>
                    </div>,
                    {
                        position: "top-right",
                        autoClose: 5000,
                    }
                );
            } else {
                toast.warning(
                    <div>
                        <div className="font-semibold">Message Sending Results:</div>
                        <div>✅ {sent} successful</div>
                        <div>❌ {failed} failed</div>
                        {failed > 0 && (
                            <div className="text-xs mt-1">
                                {failed} numbers failed - check console for details
                            </div>
                        )}
                    </div>,
                    {
                        position: "top-right",
                        autoClose: 5000,
                    }
                );

                console.log('Failed numbers:', failedNumbers);
            }
        } catch (error) {
            console.error('Error sending messages:', error);
            toast.error(`Error sending messages: ${error.message}`, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <FaPaperPlane className="text-xl text-purple-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Bulk Message</h2>
                </div>

                {/* Numbers Input */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-lg font-semibold text-gray-800">
                            Phone Numbers
                        </label>
                        <span className="text-sm text-gray-500 font-medium">
                            {numbers.split('\n').filter(num => num.trim().length > 0).length} numbers
                        </span>
                    </div>

                    <div className="relative">
                        <textarea
                            value={numbers}
                            onChange={(e) => setNumbers(e.target.value)}
                            placeholder="Enter phone numbers, one per line...
Example:
01981380806
01812345678
01798765432"
                            rows="5"
                            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical font-mono text-sm bg-gray-50 transition-all duration-200"
                        />
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={validateNumbers}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                        >
                            <FaCheckCircle />
                            Validate Numbers
                        </button>
                    </div>
                </div>

                {/* Message Input */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-lg font-semibold text-gray-800">
                            Message Content
                        </label>
                        <span className="text-sm text-gray-500 font-medium">
                            {message.length} characters
                        </span>
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here... You can use emojis and formatting as needed."
                        rows="6"
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical bg-gray-50 transition-all duration-200"
                    />
                </div>

                {/* Send Button */}
                <button
                    onClick={sendBulkMessages}
                    disabled={isLoading || !numbers.trim() || !message.trim()}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4 px-8 rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    {isLoading ? (
                        <FaSpinner className="animate-spin text-xl" />
                    ) : (
                        <FaPaperPlane className="text-xl" />
                    )}
                    {isLoading ? 'Sending Messages...' : 'Send Bulk Messages'}
                </button>
            </div>
        </div>
    );
};

export default BulkMessage;