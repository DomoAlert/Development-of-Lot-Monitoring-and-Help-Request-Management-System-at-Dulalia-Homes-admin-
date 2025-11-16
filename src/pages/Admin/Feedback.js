import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { FaStar, FaRegStar, FaCommentAlt, FaSpinner, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import CustomSelect from '../../components/CustomSelect';
import { toast } from 'react-toastify';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { Card, CardHeader, CardBody, Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge, Modal, DataSearch } from '../../components/AdminUI';
import withAdminPage from '../../components/withAdminPage';

const Feedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(null);
    
    // Add sort states
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    
    // Add state for refreshing data
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        document.title = "Feedbacks";
        
        const fetchFeedbacks = async () => {
            try {
                setIsLoading(true);
                setLoadingError(null);
                
                // Fetch feedback from the service_feedback collection
                const feedbackQuery = collection(db, 'service_feedback');
                const feedbackSnapshot = await getDocs(feedbackQuery);
                
                if (feedbackSnapshot.empty) {
                    setFeedbacks([]);
                    return;
                }
                
                const feedbackList = [];
                
                // Extract feedback data from service_feedback collection
                feedbackSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    
                    // Include all feedback entries from service_feedback collection
                    if (data.feedback) {
                        const serviceName = data.service_name || 'Unknown Service';
                        
                        // Format the date safely - use timestamp field
                        let formattedDate = 'Unknown date';
                        try {
                            const timestamp = data.timestamp;
                            if (timestamp && timestamp.toDate) {
                                formattedDate = format(timestamp.toDate(), 'MMM d, yyyy - h:mm a');
                            } else if (timestamp && timestamp.seconds) {
                                const date = new Date(timestamp.seconds * 1000);
                                formattedDate = format(date, 'MMM d, yyyy - h:mm a');
                            }
                        } catch (dateError) {
                            console.error("Error formatting date:", dateError);
                            formattedDate = 'Invalid date';
                        }
                        
                        feedbackList.push({
                            id: doc.id,
                            userId: data.user_id || '',
                            feedback: data.feedback || 'No feedback provided',
                            rating: data.rating || 0,
                            serviceName,
                            serviceId: data.service_id || '',
                            timestamp: data.timestamp,
                            date: formattedDate,
                            userName: data.user_name || 'Anonymous',
                            houseNo: '',
                            issue: '',
                            type_of_request: data.service_name || ''
                        });
                    }
                });
                
                // Sort feedbacks by timestamp
                const sortedFeedbacks = feedbackList.sort((a, b) => {
                    if (!a.timestamp || !b.timestamp) return 0;
                    return b.timestamp.seconds - a.timestamp.seconds;
                });

                setFeedbacks(sortedFeedbacks);
                
                // Show success message if data was refreshed by user action
                if (refreshTrigger > 0) {
                    toast.success("Feedback data refreshed successfully");
                }
                
            } catch (error) {
                console.error("Error fetching feedback:", error);
                setLoadingError("Failed to load feedback data. Please try again.");
                toast.error("Failed to load feedback data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedbacks();
    }, [refreshTrigger]); // Depend on refreshTrigger to allow manual refresh
    
    // Function to manually refresh data
    const refreshData = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const renderStars = (rating) => {
        return Array(5).fill(0).map((_, index) => (
            index < rating 
                ? <FaStar key={index} className="text-amber-500" /> 
                : <FaRegStar key={index} className="text-gray-400" />
        ));
    };

    const openFeedbackModal = (feedback) => {
        setSelectedFeedback(feedback);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedFeedback(null);
    };

    // Sort feedbacks based on selected field and direction
    const getSortedFeedbacks = (feedbacks) => {
        return feedbacks.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return sortDirection === 'desc' 
                ? b.timestamp.seconds - a.timestamp.seconds 
                : a.timestamp.seconds - b.timestamp.seconds;
        });
    };

    // Get sorted feedbacks
    const sortedFeedbacks = getSortedFeedbacks(feedbacks);

    // Click outside modal to close
    const handleOutsideClick = (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    };

    return (
        <ResponsiveLayout>
            <div className="pt-20 px-6 max-w-7xl mx-auto">
                <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
                    <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
                        <FaCommentAlt className="mr-3 text-blue-500" />
                        User Feedbacks
                    </h1>
                    <p className="text-gray-600 text-gray-700 mt-2">View and manage feedback from community members</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden border border-gray-100">
                    <div className="flex justify-end items-center mb-4 space-x-3">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">Sort by:</label>
                            <CustomSelect
                                options={[
                                    { value: 'date-desc', label: 'Newest First' },
                                    { value: 'date-asc', label: 'Oldest First' },
                                ]}
                                value={`${sortField}-${sortDirection}`}
                                onChange={(value) => {
                                    const [field, direction] = value.split('-');
                                    setSortField(field);
                                    setSortDirection(direction);
                                }}
                                placeholder="Sort by"
                            />
                        </div>
                        <button
                            onClick={refreshData}
                            disabled={isLoading}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                                isLoading 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            } transition-colors`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isLoading ? 'Refreshing...' : 'Refresh Data'}
                        </button>
                    </div>
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <FaSpinner className="animate-spin text-blue-500 text-4xl mb-4" />
                            <p className="text-gray-500">Loading feedbacks...</p>
                        </div>
                    ) : loadingError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-500">
                            <FaExclamationTriangle className="text-4xl mb-4" />
                            <p className="text-lg font-medium">{loadingError}</p>
                            <button 
                                onClick={refreshData}
                                className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : sortedFeedbacks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-lg font-medium">
                                No feedback has been submitted yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Feedback</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedFeedbacks.map((feedback) => (
                                        <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold uppercase">
                                                        {feedback.userName.charAt(0)}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-gray-900">{feedback.userName}</div>
                                                        {feedback.userId && (
                                                            <div className="text-xs text-gray-500">ID: {feedback.userId.substring(0, 8)}...</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                                    {feedback.userId ? feedback.userId.substring(0, 8) + '...' : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button 
                                                    onClick={() => openFeedbackModal(feedback)}
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors flex items-center"
                                                    title="View Feedback"
                                                >
                                                    <FaCommentAlt size={16} className="mr-2" />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex">{renderStars(feedback.rating)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full bg-blue-50 text-blue-700">
                                                    {feedback.serviceName}
                                                </span>
                                                {feedback.type_of_request && feedback.type_of_request !== feedback.serviceName && (
                                                    <div className="mt-1 text-xs text-gray-500">{feedback.type_of_request}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                                    {feedback.serviceId ? feedback.serviceId.substring(0, 8) + '...' : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {feedback.date}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Detail Modal */}
            {isModalOpen && selectedFeedback && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop"
                    onClick={handleOutsideClick}
                >
                    <div 
                        className="bg-white bg-white rounded-xl p-0 max-w-lg w-full mx-4 shadow-2xl transform transition-all animate-fadeIn overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with rating stars */}
                        <div className="bg-blue-500 text-white p-6 relative">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Feedback Details</h2>
                                <button 
                                    onClick={closeModal}
                                    className="text-white hover:text-gray-200 transition-colors"
                                    aria-label="Close dialog"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="flex items-center mt-4">
                                <div className="flex space-x-1 bg-white bg-opacity-20 rounded-lg px-3 py-2">
                                    {renderStars(selectedFeedback.rating)}
                                </div>
                                <span className="ml-3 font-medium">
                                    {selectedFeedback.rating} out of 5
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {/* User and service information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-sm text-gray-500 text-gray-600 mb-1">From</h3>
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-blue-700 font-semibold uppercase">
                                            {selectedFeedback.userName.charAt(0)}
                                        </div>
                                        <div className="ml-3">
                                            <p className="font-medium text-gray-800 text-gray-800">{selectedFeedback.userName}</p>
                                            <p className="text-xs text-gray-500">User ID: {selectedFeedback.userId || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-sm text-gray-500 text-gray-600 mb-1">Service</h3>
                                    <div>
                                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full bg-blue-100 bg-blue-100 text-blue-800 text-blue-800">
                                            {selectedFeedback.serviceName}
                                        </span>
                                        {selectedFeedback.serviceId && (
                                            <p className="text-xs text-gray-500 mt-1">Service ID: {selectedFeedback.serviceId}</p>
                                        )}
                                        {selectedFeedback.type_of_request && selectedFeedback.type_of_request !== selectedFeedback.serviceName && (
                                            <p className="text-xs text-gray-500 mt-1">{selectedFeedback.type_of_request}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-sm text-gray-500 text-gray-600 mb-1">Date</h3>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="ml-2 font-medium text-gray-800 text-gray-800">{selectedFeedback.date}</p>
                                    </div>
                                </div>

                                {selectedFeedback.issue && (
                                    <div className="bg-gray-50 bg-gray-50 rounded-lg p-4">
                                        <h3 className="text-sm text-gray-500 text-gray-600 mb-1">Service Issue</h3>
                                        <p className="text-gray-800 text-gray-800 text-sm">{selectedFeedback.issue}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <h3 className="text-sm text-gray-500 text-gray-600 mb-1">Feedback Message</h3>
                                <div className="mt-2 p-4 bg-gray-50 bg-gray-50 rounded-lg border border-gray-100 border-gray-200 text-gray-700 text-gray-800">
                                    {selectedFeedback.feedback}
                                </div>
                            </div>
                            
                            <div className="mt-8 text-right">
                                <button 
                                    onClick={closeModal}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ResponsiveLayout>
    );
};

export default Feedback;
