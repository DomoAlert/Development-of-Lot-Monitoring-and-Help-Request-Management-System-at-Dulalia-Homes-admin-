import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { FaStar, FaRegStar, FaCommentAlt, FaSpinner, FaFilter } from 'react-icons/fa';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardHeader, CardBody, Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge, Modal, DataSearch } from '../../components/AdminUI';
import withAdminPage from '../../components/withAdminPage';

const Feedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Add filter states
    const [ratingFilter, setRatingFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [uniqueServices, setUniqueServices] = useState([]);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    // Add sort states
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    useEffect(() => {
        document.title = "Feedbacks";
        const fetchFeedbacks = async () => {
            try {
                const feedbackSnapshot = await getDocs(collection(db, 'service_feedback'));
                const feedbackList = [];
                const servicesSet = new Set();

                for (const feedbackDoc of feedbackSnapshot.docs) {
                    const feedbackData = feedbackDoc.data();
                    const userId = feedbackData.user_id || '';
                    const serviceName = feedbackData.service_name || 'Unknown Service';
                    
                    // Add to unique services set
                    servicesSet.add(serviceName);
                    
                    // Fetch user name
                    let userName = 'Unknown';
                    if (userId) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', userId));
                            if (userDoc.exists()) {
                                userName = userDoc.data().house_owner || 'Unknown';
                            }
                        } catch (error) {
                            console.error("Error fetching user:", error);
                        }
                    }

                    feedbackList.push({
                        id: feedbackDoc.id,
                        userName,
                        feedback: feedbackData.feedback || 'No feedback provided',
                        rating: feedbackData.rating || 0,
                        serviceName,
                        timestamp: feedbackData.timestamp,
                        date: feedbackData.timestamp ? 
                            format(feedbackData.timestamp.toDate(), 'MMM d, yyyy - h:mm a') :
                            'Unknown date'
                    });
                }

                // Sort feedbacks by timestamp
                const sortedFeedbacks = feedbackList.sort((a, b) => {
                    if (!a.timestamp || !b.timestamp) return 0;
                    return b.timestamp.seconds - a.timestamp.seconds;
                });

                setFeedbacks(sortedFeedbacks);
                setUniqueServices(Array.from(servicesSet).sort());
            } catch (error) {
                console.error("Error fetching feedback:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedbacks();
    }, []);

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

    // Filter feedbacks
    const filteredFeedbacks = getSortedFeedbacks(
        feedbacks.filter(feedback => {
            const matchesRating = ratingFilter === '' || feedback.rating === parseInt(ratingFilter);
            const matchesService = serviceFilter === '' || feedback.serviceName === serviceFilter;
            return matchesRating && matchesService;
        })
    );

    // Reset filters
    const resetFilters = () => {
        setRatingFilter('');
        setServiceFilter('');
    };

    // Toggle filter visibility
    const toggleFilterSection = () => {
        setIsFilterExpanded(!isFilterExpanded);
    };

    // Click outside modal to close
    const handleOutsideClick = (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    };

    return (
        <AdminLayout>
            <div className="pt-20 px-6">
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Feedbacks</h1>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={toggleFilterSection}
                        className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <FaFilter className="mr-2" />
                        <span>{isFilterExpanded ? 'Hide Filters' : 'Show Filters'}</span>
                    </button>
                </div>

                {/* Filter section */}
                {isFilterExpanded && (
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Rating
                                </label>
                                <select
                                    value={ratingFilter}
                                    onChange={(e) => setRatingFilter(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Ratings</option>
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <option key={rating} value={rating}>
                                            {rating} {rating === 1 ? 'Star' : 'Stars'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Filter by Service
                                </label>
                                <select
                                    value={serviceFilter}
                                    onChange={(e) => setServiceFilter(e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Services</option>
                                    {uniqueServices.map((service) => (
                                        <option key={service} value={service}>
                                            {service}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex items-end">
                                <button
                                    onClick={resetFilters}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                    Reset Filters
                                </button>
                            </div>
                            
                            <div className="ml-auto flex items-end">
                                <p className="text-sm text-gray-600">
                                    Showing {filteredFeedbacks.length} of {feedbacks.length} feedbacks
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <FaSpinner className="animate-spin text-blue-500 text-3xl" />
                        </div>
                    ) : filteredFeedbacks.length === 0 ? (
                        <p className="text-center py-4">
                            {feedbacks.length === 0 
                                ? "No feedback available." 
                                : "No feedback matches the selected filters."}
                        </p>
                    ) : (
                        <table className="min-w-full table-fixed">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/5">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/12">Feedback</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/6">Rating</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/4">Service Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/5 cursor-pointer" 
                                        onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}>
                                        <div className="flex items-center">
                                            Date
                                            <span className="ml-2">
                                                {sortDirection === 'desc' ? '↓' : '↑'}
                                            </span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFeedbacks.map((feedback) => (
                                    <tr key={feedback.id}>
                                        <td className="px-6 py-4 truncate">{feedback.userName}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => openFeedbackModal(feedback)}
                                                className="text-blue-500 hover:text-blue-700"
                                                title="View Feedback"
                                            >
                                                <FaCommentAlt size={18} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex">{renderStars(feedback.rating)}</div>
                                        </td>
                                        <td className="px-6 py-4 truncate">{feedback.serviceName}</td>
                                        <td className="px-6 py-4 truncate">{feedback.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Feedback Modal - Unchanged */}
            {isModalOpen && selectedFeedback && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop"
                    onClick={handleOutsideClick}
                >
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Feedback Details</h2>
                            <button 
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">From</p>
                            <p className="font-medium">{selectedFeedback.userName}</p>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">Service</p>
                            <p className="font-medium">{selectedFeedback.serviceName}</p>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">Rating</p>
                            <div className="flex mt-1">{renderStars(selectedFeedback.rating)}</div>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-medium">{selectedFeedback.date}</p>
                        </div>
                        
                        <div>
                            <p className="text-sm text-gray-500">Feedback</p>
                            <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                {selectedFeedback.feedback}
                            </div>
                        </div>
                        
                        <div className="mt-6 text-right">
                            <button 
                                onClick={closeModal}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Feedback;