import React, { useState } from 'react';
import {
    FaPaperPlane,
    FaSpinner,
    FaCheckCircle,
    FaFileUpload,
    FaFile,
    FaTimes,
    FaMemory
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

// eslint-disable-next-line no-unused-vars
const BulkMessage = ({ clientInfo }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [numbers, setNumbers] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const API_BASE = 'http://localhost:5000/api';

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size too large. Maximum 50MB allowed.', {
                position: "top-right",
                autoClose: 5000,
            });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${API_BASE}/upload-file`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSelectedFile(response.data.file);
            toast.success('File uploaded to memory successfully!', {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error) {
            console.error('File upload error:', error);
            toast.error(`Failed to upload file: ${error.message}`, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsUploading(false);
            // Clear the file input
            event.target.value = '';
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
    };

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

        if (!message.trim() && !selectedFile) {
            toast.warning('Please enter a message or upload a file', {
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

            const sendingToast = toast.info(
                <div>
                    <div className="font-semibold">
                        🚀 Sending {numbersArray.length} {selectedFile ? 'files' : 'messages'}...
                    </div>
                    {selectedFile && (
                        <div className="text-sm">File: {selectedFile.originalname}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                        📦 Files are stored in memory and auto-cleaned
                    </div>
                </div>,
                {
                    position: "top-right",
                    autoClose: false,
                    isLoading: true,
                }
            );

            const payload = {
                numbers: numbersArray,
                message: message,
                ...(selectedFile && {
                    fileId: selectedFile.fileId
                })
            };

            const response = await axios.post(`${API_BASE}/send-bulk`, payload);

            const { total, sent, failed, failedNumbers, type } = response.data;

            toast.dismiss(sendingToast);

            if (failed === 0) {
                toast.success(
                    <div>
                        <div className="font-semibold">
                            🎉 All {type === 'file' ? 'files' : 'messages'} sent successfully!
                        </div>
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
                        <div className="font-semibold">
                            {type === 'file' ? 'File' : 'Message'} Sending Results:
                        </div>
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

            // Clear the file after successful send
            if (selectedFile) {
                setSelectedFile(null);
            }
        } catch (error) {
            console.error('Error sending messages:', error);
            toast.error(`Error sending ${selectedFile ? 'files' : 'messages'}: ${error.message}`, {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
01798765432
Max 499 numbers."
                            rows="6"
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

                {/* File Upload Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-lg font-semibold text-gray-800">
                            File Attachment
                        </label>
                        <span className="text-sm text-gray-500 font-medium">
                            Optional - Max 50MB - Memory Storage
                        </span>
                    </div>

                    {!selectedFile ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50">
                            <input
                                type="file"
                                id="file-upload"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="file-upload"
                                className={`cursor-pointer flex flex-col items-center justify-center gap-3 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isUploading ? (
                                    <FaSpinner className="text-3xl text-emerald-500 animate-spin" />
                                ) : (
                                    <FaFileUpload className="text-3xl text-emerald-500" />
                                )}
                                <div>
                                    <div className="font-semibold text-gray-700">
                                        {isUploading ? 'Uploading...' : 'Click to upload file'}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        <FaMemory className="inline mr-1" />
                                        Stored in memory - auto cleaned after sending
                                    </div>
                                </div>
                            </label>
                        </div>
                    ) : (
                        <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaFile className="text-xl text-emerald-600" />
                                    <div>
                                        <div className="font-semibold text-gray-800">
                                            {selectedFile.originalname}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {formatFileSize(selectedFile.size)} • {selectedFile.mimetype}
                                        </div>
                                        <div className="text-xs text-emerald-600 mt-1">
                                            <FaMemory className="inline mr-1" />
                                            Stored in memory
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={removeFile}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <FaTimes className="text-lg" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Message Input */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-lg font-semibold text-gray-800">
                            Message Content {selectedFile && '(Caption)'}
                        </label>
                        <span className="text-sm text-gray-500 font-medium">
                            {message.length} characters
                        </span>
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                            selectedFile
                                ? "Add a caption for your file (optional)..."
                                : "Type your message here... You can use emojis and formatting as needed."
                        }
                        rows="6"
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical bg-gray-50 transition-all duration-200"
                    />
                </div>

                {/* Send Button */}
                <button
                    onClick={sendBulkMessages}
                    disabled={isLoading || !numbers.trim() || (!message.trim() && !selectedFile)}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4 px-8 rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    {isLoading ? (
                        <FaSpinner className="animate-spin text-xl" />
                    ) : selectedFile ? (
                        <FaFileUpload className="text-xl" />
                    ) : (
                        <FaPaperPlane className="text-xl" />
                    )}
                    {isLoading
                        ? `Sending ${selectedFile ? 'Files' : 'Messages'}...`
                        : selectedFile
                            ? `Send Bulk Files${message ? ' with Caption' : ''}`
                            : 'Send Bulk Messages'
                    }
                </button>

                {/* Info Text */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                        {selectedFile
                            ? '📎 File will be shared with optional caption (stored in memory)'
                            : '💡 You can send text messages or files with captions'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BulkMessage;