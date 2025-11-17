import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { 
  LocationMarkerIcon as MapPinIcon, 
  CheckIcon, 
  XIcon as XMarkIcon, 
  InformationCircleIcon,
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
  deleteDoc, 
  limit
} from 'firebase/firestore';
import { Button,  Badge, Modal } from '../../components/AdminUI';
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
  const [isFacilityManagementModalOpen, setIsFacilityManagementModalOpen] = useState(false);
  const [isFacilityFormModalOpen, setIsFacilityFormModalOpen] = useState(false);
  const [facilityFormData, setFacilityFormData] = useState({
    name: '',
    description: '',
    opening_time: '00:00',
    closing_time: '00:00',
    status: 'active',
    location: '',
    purposes: ['', '', ''] // Array for 3 possible purposes
  });
  const [facilityFormErrors, setFacilityFormErrors] = useState({});
  const [currentFacility, setCurrentFacility] = useState(null);
  const [facilityStatusFilter, setFacilityStatusFilter] = useState('all');
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentDone, setCommentDone] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionRequestId, setRejectionRequestId] = useState(null);
  const [rejectionUserId, setRejectionUserId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Feedback functionality removed

  // Function to manually refresh data
  const refreshData = () => {
    setLoading(true);
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    document.title = "Facility Requests";
    fetchRequests();
    fetchFacilities();
  }, [refreshTrigger]);

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
  
  // Convert 24-hour time format to 12-hour format with AM/PM
  const formatTime = (time24h) => {
    if (!time24h) return "N/A";
    
    // Parse the time string (expected format: "HH:MM")
    const [hours, minutes] = time24h.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return time24h; // Return original if invalid format
    }
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    
    // Format with leading zeros for minutes
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
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
        name: doc.data().name,
        description: doc.data().description || '',
        opening_time: doc.data().opening_time || '08:00',
        closing_time: doc.data().closing_time || '20:00',
        status: doc.data().status || 'active',
        location: doc.data().location || '',
        purposes: doc.data().purposes || []
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
  
  const openFacilityManagementModal = () => {
    setIsFacilityManagementModalOpen(true);
  };
  
  const openFacilityFormModal = () => {
    // Reset form data for adding a new facility
    setFacilityFormData({
      name: '',
      description: '',
      opening_time: '08:00',
      closing_time: '20:00',
      status: 'active',
      location: '',
      purposes: ['', '', ''] // Reset to 3 empty purpose strings
    });
    setCurrentFacility(null);
    setFacilityFormErrors({});
    setIsFacilityFormModalOpen(true);
  };
  
  const handleFacilityFormChange = (e) => {
    const { name, value } = e.target;
    
    // Check if this is a purpose field (purpose-0, purpose-1, purpose-2)
    if (name.startsWith('purpose-')) {
      const index = parseInt(name.split('-')[1], 10);
      setFacilityFormData(prev => {
        // Make sure prev.purposes exists, and if not, create an empty array
        const prevPurposes = prev.purposes || ['', '', ''];
        const updatedPurposes = [...prevPurposes];
        updatedPurposes[index] = value;
        return {
          ...prev,
          purposes: updatedPurposes
        };
      });
    } else {
      // Regular field update
      setFacilityFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear the error for this field if it exists
    if (facilityFormErrors[name]) {
      setFacilityFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const validateFacilityForm = () => {
    const errors = {};
    
    if (!facilityFormData.name.trim()) {
      errors.name = 'Facility name is required';
    } else {
      // Check for duplicate facility names
      const trimmedName = facilityFormData.name.trim().toLowerCase();
      const existingFacility = facilities.find(facility => 
        facility.name.toLowerCase() === trimmedName && 
        (!currentFacility || facility.id !== currentFacility.id)
      );
      
      if (existingFacility) {
        errors.name = 'A facility with this name already exists. Please choose a different name.';
      }
    }
    
    if (!facilityFormData.opening_time) {
      errors.opening_time = 'Opening time is required';
    }
    
    if (!facilityFormData.closing_time) {
      errors.closing_time = 'Closing time is required';
    }
    
    setFacilityFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSaveFacility = async () => {
    if (!validateFacilityForm()) {
      return;
    }

    try {
      if (currentFacility) {
        // Update existing facility
        await updateDoc(doc(db, 'facilities', currentFacility.id), {
          name: facilityFormData.name.trim(),
          description: facilityFormData.description.trim(),
          opening_time: facilityFormData.opening_time,
          closing_time: facilityFormData.closing_time,
          status: facilityFormData.status,
          location: facilityFormData.location.trim(),
          // Filter out empty purpose strings before saving
          purposes: (facilityFormData.purposes || []).filter(purpose => purpose && purpose.trim() !== ''),
          updated_at: serverTimestamp()
        });
        
        toast.success('Facility updated successfully!');
      } else {
        // Add new facility
        await addDoc(collection(db, 'facilities'), {
          name: facilityFormData.name.trim(),
          description: facilityFormData.description.trim(),
          opening_time: facilityFormData.opening_time,
          closing_time: facilityFormData.closing_time,
          status: facilityFormData.status,
          location: facilityFormData.location.trim(),
          // Filter out empty purpose strings before saving
          purposes: (facilityFormData.purposes || []).filter(purpose => purpose && purpose.trim() !== ''),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        toast.success('New facility added successfully!');
      }
      
      // Reset and switch back to list tab after saving
      setCurrentFacility(null);
      setIsFacilityFormModalOpen(false);
      fetchFacilities();
    } catch (error) {
      toast.error(`Error ${currentFacility ? 'updating' : 'adding'} facility: ${error.message}`);
    }
  };
  
  // Handle filtering facilities
  const filterFacilities = () => {
    return facilities.filter(facility => {
      // Filter by status
      const matchesStatus = facilityStatusFilter === 'all' || facility.status === facilityStatusFilter;
      
      // Filter by search query
      const matchesSearch = facility.name.toLowerCase().includes(facilitySearchQuery.toLowerCase()) ||
                          (facility.description && facility.description.toLowerCase().includes(facilitySearchQuery.toLowerCase())) ||
                          (facility.location && facility.location.toLowerCase().includes(facilitySearchQuery.toLowerCase()));
      
      return matchesStatus && matchesSearch;
    });
  };
  
  // Handle changing facility status
  const handleChangeFacilityStatus = async (facilityId, newStatus) => {
    try {
      await updateDoc(doc(db, 'facilities', facilityId), {
        status: newStatus,
        updated_at: serverTimestamp()
      });
      
      toast.success(`Facility status changed to ${newStatus}`);
      fetchFacilities();
    } catch (error) {
      toast.error('Error updating facility status: ' + error.message);
    }
  };
  
  // Handle editing facility
  const handleEditFacility = (facility) => {
    // Get existing purposes or create an array of 3 empty strings if none exist
    const existingPurposes = facility.purposes || [];
    const formattedPurposes = [
      existingPurposes[0] || '',
      existingPurposes[1] || '',
      existingPurposes[2] || ''
    ];
    
    setFacilityFormData({
      name: facility.name || '',
      description: facility.description || '',
      opening_time: facility.opening_time || '08:00',
      closing_time: facility.closing_time || '20:00',
      status: facility.status || 'active',
      location: facility.location || '',
      purposes: formattedPurposes
    });
    setCurrentFacility(facility);
    setFacilityFormErrors({});
    setIsFacilityFormModalOpen(true);
  };
  
  // Handle deleting facility
  const handleDeleteFacility = async (facilityId) => {
    if (!facilityId) return;
    
    if (window.confirm('Are you sure you want to delete this facility? This action cannot be undone.')) {
      try {
        // Check if there are any pending requests for this facility
        const requestsQuery = query(
          collection(db, 'facility_requests'),
          where('facility_id', '==', facilityId),
          limit(1)
        );
        
        const requestsSnapshot = await getDocs(requestsQuery);
        
        if (!requestsSnapshot.empty) {
          toast.error('Cannot delete facility that has pending requests. Please resolve all requests first.');
          return;
        }
        
        // Delete the facility
        await deleteDoc(doc(db, 'facilities', facilityId));
        
        toast.success('Facility deleted successfully!');
        
        // Refresh the facilities list
        fetchFacilities();
      } catch (error) {
        toast.error(`Error deleting facility: ${error.message}`);
      }
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
    <ResponsiveLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <div className="flex flex-wrap justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Facility Requests Management
              </h1>
              <p className="text-gray-600 text-gray-700 mt-2">Manage community facilities and facility usage requests</p>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              } transition-colors mt-2 sm:mt-0`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Facility Management */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow flex justify-between items-center">
          <h2 className="text-lg font-semibold">Facilities Management</h2>
          <div>
            <Button
              variant="primary"
              onClick={() => openFacilityManagementModal()}
              className="flex items-center"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Manage Facilities
            </Button>
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
                              request.status === 'Approved' || request.status === 'Approved' ? 'success' :
                              request.status === 'Complete' ? 'success' :
                              request.status === 'Rejected' || request.status === 'Rejected' ? 'danger' : 
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
                                  onClick={() => handleUpdateStatus(request.id, 'Approved', request.user_id)}
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
                      <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
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
                    <div className="mt-4 p-3 bg-red-50 bg-red-50 border border-red-200 border-red-200 rounded-md">
                    <h4 className="font-medium text-red-800 text-red-700">Rejection Reason:</h4>
                    <p className="text-red-700 text-red-600">{selectedRequest.rejection_reason}</p>
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
          <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
            Rejection Reason (Required)
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 border-gray-300 rounded-md focus:ring-primary focus:ring-primary bg-white text-black"
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
      
      {/* Facility Management Modal - List View */}
      <Modal
        isOpen={isFacilityManagementModalOpen}
        onClose={() => {
          setIsFacilityManagementModalOpen(false);
          setCurrentFacility(null);
        }}
        title="Facility Management"
        size="lg"
      >
        <div className="space-y-6">
          {/* Header with Add Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Facilities List</h3>
              <p className="text-sm text-gray-600">
                View and manage all facilities. Click edit to modify or change status.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openFacilityFormModal}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Facility
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search facilities..."
                value={facilitySearchQuery}
                onChange={(e) => setFacilitySearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={facilityStatusFilter}
              onChange={(e) => setFacilityStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="maintenance">Maintenance Only</option>
            </select>
          </div>

          {/* Facilities Table */}
          <div className="overflow-x-auto max-h-96">
            {facilities.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="mt-2 text-gray-500 text-lg">No facilities available</p>
                <p className="mt-1 text-gray-400 text-sm">Click "Add Facility" to create your first facility</p>
              </div>
            ) : filterFacilities().length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mt-2 text-gray-500 text-lg">No matching facilities found</p>
                <p className="mt-1 text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterFacilities().map((facility) => (
                    <tr key={facility.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center mb-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{facility.name}</div>
                              <div className="text-sm text-gray-500">{facility.location}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={facility.status}
                              onChange={(e) => handleChangeFacilityStatus(facility.id, e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            >
                              <option value="active">Set Active</option>
                              <option value="inactive">Set Inactive</option>
                              <option value="maintenance">Set Maintenance</option>
                            </select>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleEditFacility(facility)}
                              className="text-xs px-2 py-1 h-7"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => handleDeleteFacility(facility.id)}
                              className="text-xs px-2 py-1 h-7"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          facility.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : facility.status === 'inactive'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {facility.status.charAt(0).toUpperCase() + facility.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {/* Facility Form Modal - Add/Edit Form */}
      <Modal
        isOpen={isFacilityFormModalOpen}
        onClose={() => {
          setIsFacilityFormModalOpen(false);
          setCurrentFacility(null);
          setFacilityFormData({
            name: '',
            description: '',
            opening_time: '00:00',
            closing_time: '00:00',
            status: 'active',
            location: '',
            purposes: ['', '', '']
          });
          setFacilityFormErrors({});
        }}
        title={currentFacility ? 'Edit Facility' : 'Add New Facility'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Facility Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={facilityFormData.name}
              onChange={handleFacilityFormChange}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                facilityFormErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Swimming Pool, Basketball Court, etc."
            />
            {facilityFormErrors.name && (
              <p className="mt-1 text-sm text-red-600">{facilityFormErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={facilityFormData.description}
              onChange={handleFacilityFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Describe the facility, its features, capacity, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="opening_time" className="block text-sm font-medium text-gray-700">
                Opening Time <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(Current: {formatTime(facilityFormData.opening_time)})</span>
              </label>
              <input
                type="time"
                name="opening_time"
                id="opening_time"
                value={facilityFormData.opening_time}
                onChange={handleFacilityFormChange}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  facilityFormErrors.opening_time ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {facilityFormErrors.opening_time && (
                <p className="mt-1 text-sm text-red-600">{facilityFormErrors.opening_time}</p>
              )}
            </div>

            <div>
              <label htmlFor="closing_time" className="block text-sm font-medium text-gray-700">
                Closing Time <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(Current: {formatTime(facilityFormData.closing_time)})</span>
              </label>
              <input
                type="time"
                name="closing_time"
                id="closing_time"
                value={facilityFormData.closing_time}
                onChange={handleFacilityFormChange}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  facilityFormErrors.closing_time ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {facilityFormErrors.closing_time && (
                <p className="mt-1 text-sm text-red-600">{facilityFormErrors.closing_time}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              name="location"
              id="location"
              value={facilityFormData.location}
              onChange={handleFacilityFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., Building B, Ground Floor, etc."
            />
          </div>

          {/* Purposes Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purposes (Up to 3)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              List up to 3 specific purposes for which this facility can be used.
            </p>

            {[0, 1, 2].map((index) => (
              <div key={index} className="mb-2">
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-500">{index + 1}.</span>
                  <input
                    type="text"
                    name={`purpose-${index}`}
                    value={(facilityFormData.purposes && facilityFormData.purposes[index]) || ''}
                    onChange={handleFacilityFormChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder={`e.g., ${index === 0 ? 'Celebration' : index === 1 ? 'Meeting' : 'Exercise'}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              id="status"
              value={facilityFormData.status}
              onChange={handleFacilityFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Under Maintenance</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Active facilities can be booked by homeowners, inactive facilities will not appear in their booking options.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsFacilityFormModalOpen(false);
                setCurrentFacility(null);
                setFacilityFormData({
                  name: '',
                  description: '',
                  opening_time: '08:00',
                  closing_time: '20:00',
                  status: 'active',
                  location: '',
                  purposes: ['', '', '']
                });
                setFacilityFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveFacility}
            >
              {currentFacility ? "Update Facility" : "Add Facility"}
            </Button>
          </div>
        </div>
      </Modal>
    </ResponsiveLayout>
  );
}

export default FacilityRequests;
