import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  CalendarIcon, 
  ClockIcon, 
  LocationMarkerIcon as MapPinIcon, 
  CheckIcon, 
  XIcon as XMarkIcon, 
  InformationCircleIcon,
  PlusIcon,
  EyeIcon,
  ExclamationIcon
} from '@heroicons/react/outline';
import { 
  collection, 
  getDocs, 
  updateDoc,
  doc, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  where, 
  getDoc, 
  limit
} from 'firebase/firestore';
import { Card, CardHeader, CardBody, CardFooter, Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge, Modal, DataSearch } from '../../components/AdminUI';
import { db, auth } from '../../services/firebase';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

function FacilityRequests() {
  const [requests, setRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [newFacilityName, setNewFacilityName] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentDone, setCommentDone] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionRequestId, setRejectionRequestId] = useState(null);
  const [rejectionUserId, setRejectionUserId] = useState(null);
  // Feedback functionality removed

  useEffect(() => {
    document.title = "Facility Requests";
    fetchRequests();
    fetchFacilities();
  }, []);

  const handleRejectionSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a reason for rejection');
      return;
    }

    try {
      // First, fetch the request to get facility name
      const requestDoc = await getDoc(doc(db, 'facility_requests', rejectionRequestId));
      const requestData = requestDoc.data();
      const facilityName = requestData?.facility || 'N/A';

      // Update the status of the request
      await updateDoc(doc(db, 'facility_requests', rejectionRequestId), {
        status: 'Rejected',
        rejection_reason: rejectionReason,
        admin_comment: rejectionReason
      });

      // Send notification to user's inbox
      await addDoc(collection(db, 'notifications'), {
        user_id: rejectionUserId || requestData?.user_id,
        message: `Your ${facilityName} facility request has been Rejected. Reason: ${rejectionReason}`,
        timestamp: serverTimestamp(),
        status: 'unread',
      });

      toast.success('Request rejected successfully');
      fetchRequests();
      setIsRejectionModalOpen(false);
    } catch (error) {
      toast.error('Error rejecting request: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    // Handle both Firestore timestamps and date strings
    let date;
    if (typeof timestamp === 'object' && timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      try {
        date = new Date(timestamp);
      } catch (e) {
        return "Invalid Date";
      }
    }
    
    return format(date, 'yyyy-MM-dd');
  };

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'facility_requests'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Check record status for each request's user
      const updatedRequestsData = await Promise.all(requestsData.map(async (request) => {
        if (request.user_id) {
          const hasBadRecord = await checkUserRecordStatus(request.user_id);
          return { ...request, hasBadRecord };
        }
        return request;
      }));
      
      setRequests(updatedRequestsData);
    } catch (error) {
      toast.error('Error fetching facility requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'facilities'));
      const facilitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setFacilities(facilitiesData);
    } catch (error) {
      toast.error('Error fetching facilities: ' + error.message);
    }
  };

  const fetchComment = async (requestId) => {
    try {
      const q = query(
        collection(db, 'facility_comments'),
        where('request_id', '==', requestId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().comment || "No comment available.";
      } else {
        return "No comment available.";
      }
    } catch (error) {
      console.error("Error fetching comment:", error);
      return "Error fetching comment.";
    }
  };

  // Utility function to check if a user has bad record status
  const checkUserRecordStatus = async (userId) => {
    try {
      if (!userId) return false;
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return userData.recordStatus === 'Bad';
    } catch (error) {
      console.error('Error checking user record status:', error);
      return false;
    }
  };
  
  const handleAddFacility = async () => {
    if (!newFacilityName.trim()) {
      toast.error('Facility name cannot be empty');
      return;
    }

    try {
      await addDoc(collection(db, 'facilities'), {
        name: newFacilityName.trim(),
        created_at: serverTimestamp()
      });
      
      toast.success('New facility added successfully!');
      setNewFacilityName('');
      fetchFacilities();
    } catch (error) {
      toast.error('Error adding facility: ' + error.message);
    }
  };

  const handleUpdateStatus = async (id, newStatus, userId) => {
    // For rejection, open the modal to get the reason
    if (newStatus === 'Rejected' || newStatus === '❌') {
      setRejectionRequestId(id);
      setRejectionUserId(userId);
      setRejectionReason('');
      setIsRejectionModalOpen(true);
      return;
    }

    try {
      // First, fetch the request to get facility name
      const requestDoc = await getDoc(doc(db, 'facility_requests', id));
      const requestData = requestDoc.data();
      const facilityName = requestData?.facility || 'N/A';
      
      // If approving the request, check if the user has a bad record
      if ((newStatus === 'Approved' || newStatus === '✅') && userId) {
        const hasBadRecord = await checkUserRecordStatus(userId);
        if (hasBadRecord) {
          toast.error('Cannot approve request. User has a bad record status.');
          
          // Automatically reject with a standard reason
          setRejectionRequestId(id);
          setRejectionUserId(userId);
          setRejectionReason('Request automatically rejected due to bad record status.');
          setIsRejectionModalOpen(true);
          return;
        }
      }

      // Update the status of the request
      await updateDoc(doc(db, 'facility_requests', id), {
        status: newStatus,
        ...(rejectionReason && { rejection_reason: rejectionReason }),
        last_updated: serverTimestamp()
      });

      // Prepare notification message based on status
      let notificationMessage = '';
      
      switch(newStatus) {
        case '✅':
        case 'Approved':
          notificationMessage = `Your ${facilityName} facility request has been approved.`;
          break;
        /* In-Progress status removed */
        case 'Confirmation':
          notificationMessage = `Please confirm your ${facilityName} facility request details.`;
          break;
        case 'Complete':
          notificationMessage = `Your ${facilityName} facility request has been completed.`;
          break;
        default:
          notificationMessage = `Your ${facilityName} facility request status has been updated to ${newStatus}.`;
      }

      // Send notification to user's inbox
      await addDoc(collection(db, 'notifications'), {
        user_id: userId || requestData?.user_id,
        message: notificationMessage,
        timestamp: serverTimestamp(),
        status: 'unread',
      });

      // Convert status to user-friendly message
      let successMessage = '';
      switch(newStatus) {
        case '✅':
          successMessage = 'approved';
          break;
        /* In-Progress status removed */
        case 'Confirmation':
          successMessage = 'sent for confirmation';
          break;
        case 'Complete':
          successMessage = 'marked as complete';
          break;
        default:
          successMessage = newStatus.toLowerCase();
      }

      toast.success(`Request ${successMessage} successfully`);
      fetchRequests();
    } catch (error) {
      toast.error('Error updating request: ' + error.message);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedRequest) return;
    
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      // Check if comment already exists
      const q = query(
        collection(db, 'facility_comments'),
        where('request_id', '==', selectedRequest.id)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing comment
        await updateDoc(doc(db, 'facility_comments', querySnapshot.docs[0].id), {
          comment: commentText,
          is_done: commentDone,
          updated_at: serverTimestamp()
        });
        
        toast.success("Comment updated successfully");
      } else {
        // Add new comment
        await addDoc(collection(db, 'facility_comments'), {
          request_id: selectedRequest.id,
          comment: commentText,
          admin_id: auth.currentUser?.uid || "Unknown",
          timestamp: serverTimestamp(),
          is_done: commentDone
        });
        
        // Also update the main facility_requests document with this comment
        await updateDoc(doc(db, 'facility_requests', selectedRequest.id), {
          admin_comment: commentText,
          last_updated: serverTimestamp()
        });
        
        toast.success("Comment added successfully");
      }
      
      closeDetailsModal();
    } catch (error) {
      toast.error(`Error saving comment: ${error.message}`);
    }
  };

  const showDetailsModal = async (request) => {
    setSelectedRequest(request);
    
    // Fetch any existing comment
    const comment = await fetchComment(request.id);
    if (comment !== "No comment available.") {
      setCommentText(comment);
    } else {
      setCommentText('');
    }
    
    // Check if user has bad record
    if (request.user_id) {
      const hasBadRecord = await checkUserRecordStatus(request.user_id);
      if (hasBadRecord && request.status === 'Pending') {
        toast.warning('Warning: This homeowner has a bad record status. Consider carefully before approving.');
      }
    }
  };

  const closeDetailsModal = () => {
    setSelectedRequest(null);
    setCommentText('');
    setCommentDone(false);
  };

  const showPurposeModal = (purpose) => {
    toast.info(purpose, {
      autoClose: false,
      closeOnClick: true,
      draggable: true,
    });
  };

  const showCommentModal = async (requestId) => {
    const comment = await fetchComment(requestId);
    toast.info(comment, {
      autoClose: false,
      closeOnClick: true,
      draggable: true,
    });
  };
  
  // Feedback functionality removed

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case '✅':
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case '❌':
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      /* In-Progress status removed */
      case 'Confirmation':
        return 'bg-purple-100 text-purple-800';
      case 'Complete':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      (request.facility || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.homeowner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (String(request.house_no) || '').includes(searchQuery);
    
    const matchesFacility = !facilityFilter || request.facility === facilityFilter;
    const matchesStatus = !statusFilter || request.status === statusFilter;
    
    return matchesSearch && matchesFacility && matchesStatus;
  });

  // Create a mapping of facilities with their requests
  const requestsByFacility = {};
  
  // If a specific facility filter is applied, only include that facility
  if (facilityFilter) {
    requestsByFacility[facilityFilter] = [];
    
    // Add matching requests to the selected facility
    filteredRequests.forEach(request => {
      if (request.facility === facilityFilter) {
        requestsByFacility[facilityFilter].push(request);
      }
    });
  } else {
    // If no filter is applied, initialize all facilities (even those with no requests)
    facilities.forEach(facility => {
      requestsByFacility[facility.name] = [];
    });
    
    // Then add all matching requests to their respective facilities
    filteredRequests.forEach(request => {
      const facility = request.facility || 'Unspecified';
      if (!requestsByFacility[facility]) {
        requestsByFacility[facility] = [];
      }
      requestsByFacility[facility].push(request);
    });
  }

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Facility Requests Management</h1>
            </div>

        {/* Add New Facility */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Add New Facility</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Facility Name"
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
              className="flex-grow px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            <button 
                  onClick={handleAddFacility}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
              Add
            </button>
              </div>
            </div>
            
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select 
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Facilities</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.name}>
                    {facility.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                {/* In-Progress option removed */}
                <option value="Confirmation">Confirmation</option>
                <option value="✅">Approved</option>
                <option value="Complete">Complete</option>
                <option value="❌">Rejected</option>
              </select>
            </div>

        {/* Loading Indicator */}
        {loading && (
              <div className="text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading requests...</p>
              </div>
        )}

        {/* Grouped Request Tables */}
        {!loading && (
          <>
            {facilities.length === 0 && (
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <p className="text-gray-500">No facilities found. Add a facility above to get started.</p>
              </div>
            )}
            
            {facilities.length > 0 && Object.keys(requestsByFacility).length === 0 && (
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <p className="text-gray-500">No facilities match the current filters.</p>
              </div>
            )}
          </>
        )}

        {Object.entries(requestsByFacility).map(([facility, facilityRequests]) => (
          <div key={facility} className="mb-8">
            <div className="border-b pb-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{facility} Requests</h2>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Homeowner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      House No.
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time In
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Out
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {facilityRequests.length > 0 ? (
                    facilityRequests.map((request, index) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {request.homeowner_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.house_no || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.usage_date || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.time_in || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.time_out || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => showPurposeModal(request.purpose || 'No purpose specified')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <InformationCircleIcon className="h-5 w-5" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              request.status === 'Pending' ? 'warning' : 
                              /* In-Progress status removed */
                              request.status === 'Confirmation' ? 'secondary' :
                              request.status === '✅' || request.status === 'Approved' ? 'success' :
                              request.status === 'Complete' ? 'success' :
                              request.status === '❌' || request.status === 'Rejected' ? 'danger' : 
                              'default'
                            }
                          >
                            {request.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {request.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(request.id, '✅', request.user_id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Approve"
                                >
                                  <CheckIcon className="h-5 w-5" />
                                </button>
                                {/* In-Progress button removed */}
                                <button
                                  onClick={() => handleUpdateStatus(request.id, '❌', request.user_id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Reject"
                                >
                                  <XMarkIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                            {/* In-Progress status actions removed */}
                            {request.status === 'Confirmation' && (
                              <button
                                onClick={() => handleUpdateStatus(request.id, 'Complete', request.user_id)}
                                className="text-emerald-600 hover:text-emerald-900"
                                title="Mark Complete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => showDetailsModal(request)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Details"
                            >
                              <InformationCircleIcon className="h-5 w-5" />
                            </button>
                            {/* Feedback button removed */}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-gray-500">
                        No requests for this facility yet. Homeowners can submit requests using the mobile app.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
          </div>
        ))}

        {/* Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Request Details</h2>
                <button onClick={closeDetailsModal} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">🏠 Homeowner:</span>
                  <div className="flex items-center">
                    <span>{selectedRequest.homeowner_name || 'N/A'}</span>
                    {selectedRequest.hasBadRecord && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        <ExclamationIcon className="h-3 w-3 mr-1" />
                        Bad Record
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">🏡 House No.:</span>
                  <span>{selectedRequest.house_no || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">🏀 Facility:</span>
                  <span>{selectedRequest.facility || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">📅 Requested On:</span>
                  <span>{formatDate(selectedRequest.created_at)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">📆 Usage Date:</span>
                  <span>{selectedRequest.usage_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">⏰ Time In:</span>
                  <span>{selectedRequest.time_in || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">⏳ Time Out:</span>
                  <span>{selectedRequest.time_out || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold">📌 Status:</span>
                  <Badge 
                    variant={
                      selectedRequest.status === 'Pending' ? 'warning' : 
                      /* In-Progress status removed */
                      selectedRequest.status === 'Confirmation' ? 'secondary' :
                      selectedRequest.status === '✅' || selectedRequest.status === 'Approved' ? 'success' :
                      selectedRequest.status === 'Complete' ? 'success' :
                      selectedRequest.status === '❌' || selectedRequest.status === 'Rejected' ? 'danger' : 
                      'default'
                    }
                  >
                    {selectedRequest.status || 'Unknown'}
                  </Badge>
                </div>

                {selectedRequest.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <h4 className="font-medium text-red-800 dark:text-red-300">Rejection Reason:</h4>
                    <p className="text-red-700 dark:text-red-200">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              {/* Admin Comment Section */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Admin Comment:</span>
                    <button 
                    onClick={() => showCommentModal(selectedRequest.id)}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <EyeIcon className="h-5 w-5 mr-1" /> View
                    </button>
                </div>
                
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Enter your comment here..."
                ></textarea>
                
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="commentDone"
                    checked={commentDone}
                    onChange={(e) => setCommentDone(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="commentDone">Mark as done</label>
                </div>
              </div>
            </div>
              
              <div className="flex justify-end mt-6 space-x-2">
                <button
                  onClick={handleSaveComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Comment
                </button>
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Comment Modal */}
      <Modal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        title="Reject Facility Request"
        size="md"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsRejectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectionSubmit}
            >
              Submit Rejection
            </Button>
          </div>
        }
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rejection Reason (Required)
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary dark:focus:ring-secondary dark:bg-gray-700 dark:text-white"
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a detailed reason for rejection. This will be visible to the homeowner."
          ></textarea>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This comment will be stored in the database and sent as a notification to the homeowner.
          </p>
        </div>
      </Modal>
      
      {/* Feedback Modal removed */}
    </AdminLayout>
  );
}

export default FacilityRequests;