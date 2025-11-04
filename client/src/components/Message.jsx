import React, { useState, useEffect, useRef } from 'react';
import {
    FaSearch,
    FaPaperPlane,
    FaEllipsisV,
    FaPhone,
    FaVideo,
    FaInfoCircle,
    FaUser,
    FaCheck,
    FaCheckDouble,
    FaSpinner
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

const Message = ({ clientInfo }) => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const messagesEndRef = useRef(null);

    const API_BASE = 'http://localhost:5000/api';

    // Fetch WhatsApp chats
    const fetchChats = async () => {
        try {
            setIsLoadingChats(true);
            // Since whatsapp-web.js doesn't have a direct API to get chats,
            // we'll create a simulated chat list based on recent interactions
            // In a real implementation, you'd need to store chat history
            const simulatedChats = [
                {
                    id: '1',
                    name: 'John Business',
                    number: '01981380806',
                    lastMessage: 'Thanks for the information!',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                    unread: 0,
                    isGroup: false
                },
                {
                    id: '2',
                    name: 'Sarah Marketing',
                    number: '01812345678',
                    lastMessage: 'Meeting tomorrow at 11 AM',
                    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
                    unread: 1,
                    isGroup: false
                },
                {
                    id: '3',
                    name: 'Mike Operations',
                    number: '01798765432',
                    lastMessage: 'Can you send the documents?',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                    unread: 0,
                    isGroup: false
                },
                {
                    id: '4',
                    name: 'Tech Team',
                    number: '01611223344',
                    lastMessage: 'Server update completed',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                    unread: 3,
                    isGroup: true
                }
            ];

            setChats(simulatedChats);
        } catch (error) {
            console.error('Error fetching chats:', error);
            toast.error('Failed to load chats');
        } finally {
            setIsLoadingChats(false);
        }
    };

    // Fetch messages for selected chat
    const fetchMessages = async (chat) => {
        if (!chat) return;

        try {
            setIsLoading(true);

            // Simulated messages - in real implementation, you'd fetch from your database
            // or use whatsapp-web.js to get chat history
            const simulatedMessages = [
                {
                    id: '1',
                    text: `Hello ${clientInfo?.name}! This is ${chat.name}.`,
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    isMe: false,
                    status: 'delivered'
                },
                {
                    id: '2',
                    text: `Hi ${chat.name}! How can I help you today?`,
                    timestamp: new Date(Date.now() - 119 * 60 * 1000),
                    isMe: true,
                    status: 'read'
                },
                {
                    id: '3',
                    text: 'I wanted to discuss the new project requirements.',
                    timestamp: new Date(Date.now() - 118 * 60 * 1000),
                    isMe: false,
                    status: 'delivered'
                },
                {
                    id: '4',
                    text: 'Sure, I have the document ready. Should I send it over?',
                    timestamp: new Date(Date.now() - 117 * 60 * 1000),
                    isMe: true,
                    status: 'read'
                },
                {
                    id: '5',
                    text: 'Yes, please send it to my email.',
                    timestamp: new Date(Date.now() - 116 * 60 * 1000),
                    isMe: false,
                    status: 'delivered'
                },
                {
                    id: '6',
                    text: 'Great! I will send it right away.',
                    timestamp: new Date(Date.now() - 115 * 60 * 1000),
                    isMe: true,
                    status: 'read'
                }
            ];

            // Add current chat's last message if it exists
            if (chat.lastMessage && !simulatedMessages.some(msg => msg.text === chat.lastMessage)) {
                simulatedMessages.push({
                    id: 'last',
                    text: chat.lastMessage,
                    timestamp: chat.timestamp,
                    isMe: false,
                    status: 'delivered'
                });
            }

            setMessages(simulatedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat);
        }
    }, [selectedChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.number.includes(searchTerm) ||
        chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;

        const messageText = newMessage.trim();
        const tempMessageId = Date.now().toString();

        // Add message to UI immediately (optimistic update)
        const newMsg = {
            id: tempMessageId,
            text: messageText,
            timestamp: new Date(),
            isMe: true,
            status: 'sending'
        };

        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');

        // Clear any unread count for this chat
        setChats(prev => prev.map(chat =>
            chat.id === selectedChat.id
                ? { ...chat, unread: 0, lastMessage: messageText, timestamp: new Date() }
                : chat
        ));

        try {
            // Send message via API
            const response = await axios.post(`${API_BASE}/send-bulk`, {
                numbers: [selectedChat.number],
                message: messageText
            });

            // Update message status
            setMessages(prev => prev.map(msg =>
                msg.id === tempMessageId
                    ? { ...msg, status: 'sent', id: response.data.details?.[0]?.messageId || tempMessageId }
                    : msg
            ));

            toast.success('Message sent successfully!', {
                position: "top-right",
                autoClose: 2000,
            });
        } catch (error) {
            console.error('Error sending message:', error);

            // Mark message as failed
            setMessages(prev => prev.map(msg =>
                msg.id === tempMessageId
                    ? { ...msg, status: 'failed' }
                    : msg
            ));

            toast.error('Failed to send message', {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp) => {
        const now = new Date();
        const messageDate = new Date(timestamp);
        const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return messageDate.toLocaleDateString();
    };

    const getMessageStatusIcon = (status) => {
        switch (status) {
            case 'sending':
                return <FaSpinner className="animate-spin text-gray-400" />;
            case 'sent':
                return <FaCheck className="text-gray-400" />;
            case 'delivered':
                return <FaCheckDouble className="text-gray-400" />;
            case 'read':
                return <FaCheckDouble className="text-emerald-500" />;
            case 'failed':
                return <FaCheck className="text-red-500" />;
            default:
                return <FaCheck className="text-gray-400" />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg shadow-lg border border-gray-200 m-4">
            {/* Sidebar - Chats List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
                {/* User Profile Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(clientInfo?.name || 'User')}&background=10b981&color=fff&size=40`}
                                alt="Profile"
                                className="w-10 h-10 rounded-full"
                            />
                            <div className="ml-3">
                                <h3 className="font-semibold text-gray-900">{clientInfo?.name}</h3>
                                <p className="text-sm text-gray-600">+{clientInfo?.phoneNumber}</p>
                            </div>
                        </div>
                        <FaEllipsisV className="text-gray-400 cursor-pointer" />
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-gray-200 bg-white">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                    </div>
                </div>

                {/* Chats List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoadingChats ? (
                        <div className="flex justify-center items-center h-32">
                            <FaSpinner className="animate-spin text-emerald-500 text-xl" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FaUser className="text-4xl mx-auto mb-2 text-gray-300" />
                            <p>No chats found</p>
                        </div>
                    ) : (
                        filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`flex items-center p-3 border-b border-gray-100 cursor-pointer transition-colors ${selectedChat?.id === chat.id
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-white hover:bg-gray-50'
                                    }`}
                            >
                                <div className="relative">
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=${chat.isGroup ? '6366f1' : '10b981'
                                            }&color=fff&size=40`}
                                        alt={chat.name}
                                        className="w-12 h-12 rounded-full"
                                    />
                                    {chat.isGroup && (
                                        <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-1">
                                            <FaUser className="text-white text-xs" />
                                        </div>
                                    )}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatDate(chat.timestamp)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                                        {chat.unread > 0 && (
                                            <span className="bg-emerald-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                                                {chat.unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}&background=${selectedChat.isGroup ? '6366f1' : '10b981'
                                        }&color=fff&size=40`}
                                    alt={selectedChat.name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div className="ml-3">
                                    <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
                                    <p className="text-sm text-gray-600">
                                        {selectedChat.isGroup ? 'Group' : selectedChat.number} • {selectedChat.lastSeen || 'Online'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-600">
                                <FaVideo className="cursor-pointer hover:text-emerald-500 text-lg" />
                                <FaPhone className="cursor-pointer hover:text-emerald-500 text-lg" />
                                <FaInfoCircle className="cursor-pointer hover:text-emerald-500 text-lg" />
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-32">
                                    <FaSpinner className="animate-spin text-emerald-500 text-xl" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {messages.map((message, index) => {
                                        const showDate = index === 0 ||
                                            new Date(message.timestamp).toDateString() !==
                                            new Date(messages[index - 1].timestamp).toDateString();

                                        return (
                                            <div key={message.id}>
                                                {showDate && (
                                                    <div className="flex justify-center my-4">
                                                        <span className="bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded-full">
                                                            {formatDate(message.timestamp)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div
                                                    className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${message.isMe
                                                                ? 'bg-emerald-500 text-white rounded-br-none'
                                                                : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                                                            } ${message.status === 'failed' ? 'border-red-300 bg-red-50' : ''}`}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                                        <div className="flex items-center justify-end gap-1 mt-1">
                                                            <span
                                                                className={`text-xs ${message.isMe
                                                                        ? message.status === 'failed' ? 'text-red-300' : 'text-emerald-100'
                                                                        : 'text-gray-500'
                                                                    }`}
                                                            >
                                                                {formatTime(message.timestamp)}
                                                            </span>
                                                            {message.isMe && (
                                                                <span className="text-xs">
                                                                    {getMessageStatusIcon(message.status)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type a message"
                                    rows="1"
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                    style={{ minHeight: '44px', maxHeight: '120px' }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || isLoading}
                                    className="p-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-1"
                                >
                                    <FaPaperPlane />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Welcome Screen */
                    <div className="flex-1 flex items-center justify-center bg-gray-100">
                        <div className="text-center max-w-md">
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaPaperPlane className="text-3xl text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">WhatsApp Web</h2>
                            <p className="text-gray-600 mb-6">
                                Send and receive messages without keeping your phone online.
                                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                            </p>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-600">
                                    <strong>Connected as:</strong> {clientInfo?.name} (+{clientInfo?.phoneNumber})
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Select a chat from the sidebar to start messaging
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Message;