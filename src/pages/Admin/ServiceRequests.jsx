import React, { useState, useEffect, Fragment } from 'react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  getDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Dialog, Transition } from '@headlessui/react';
import AdminLayout from '../../components/AdminLayout';

function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isNoCommentModalOpen, setIsNoCommentModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isNoIssueModalOpen, setIsNoIssueModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState('');
  const [currentComment, setCurrentComment] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [currentNotifyDetails, setCurrentNotifyDetails] = useState({
    residentName: '',
    residentUid: '',
    staffName: '',
    issue: ''
  });

  useEffect(() => {
    document.title = "Service Requests";
    fetchRequests();
    fetchStaffList();
  }, []);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'services'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Request data:', data); // Debug log to see what's coming from Firebase
        return {
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to JS Date if needed
          timestamp: data.timestamp ? data.timestamp : null
        };
      });
      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error('Error fetching service requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStaffList = async () => {
    try {
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      const staffData = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaffList(staffData);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error('Error fetching staff list: ' + error.message);
    }
  };
  
  const getStaffDetails = (name) => {
    return staffList.find(staff => staff.name === name) || {};
  };
  
  const handleShowIssueDetails = (issue) => {
    if (!issue || issue === 'null' || issue === 'undefined' || issue.trim() === '') {
      setIsNoIssueModalOpen(true);
    } else {
      setCurrentIssue(issue);
      setIsIssueModalOpen(true);
    }
  };
  
  const handleShowImage = (imageUrl) => {
    if (imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined') {
      setCurrentImage(imageUrl);
      setIsImageModalOpen(true);
    }
  };
  
  const handleShowComment = async (requestId) => {
    try {
      // Set the selected request ID for reference
      setSelectedRequestId(requestId);
      
      // Get the document from Firestore
      const requestDoc = await getDoc(doc(db, 'services', requestId));
      
      if (requestDoc.exists()) {
        const requestData = requestDoc.data();
        // Check if comment exists and is not empty
        if (requestData.comment && requestData.comment.trim() !== '') {
          setCurrentComment(requestData.comment);
          setIsCommentModalOpen(true);
        } else {
          // If no comment, show the "no comment" modal
          setIsNoCommentModalOpen(true);
        }
      } else {
        // If document doesn't exist, show the "no comment" modal
        setIsNoCommentModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching comment:', error);
      toast.error('Error fetching comment: ' + error.message);
      // On error, default to the "no comment" modal
      setIsNoCommentModalOpen(true);
    }
  };
  
  const sendNotification = async ({ residentName, residentUid, staffName, issue }) => {
    try {
      const staff = getStaffDetails(staffName);
      const position = staff?.position || 'staff';
      
      const message = `${staffName} (${position}) is on the way to fix the issue: ${issue}`;
      
      await addDoc(collection(db, 'notifications'), {
        to: residentName,
        user_id: residentUid,
        message: message,
        timestamp: serverTimestamp()
      });
      
      toast.success(`Notification sent to ${residentName}`);
      setIsNotifyModalOpen(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Error sending notification: ' + error.message);
    }
  };
  
  const handleAssignStaff = async (requestId, staffName) => {
    try {
      await updateDoc(doc(db, 'services', requestId), {
        staff: staffName,
        updatedAt: new Date()
      });
      toast.success(`Staff assigned successfully`);
      fetchRequests();
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error('Error assigning staff: ' + error.message);
    }
  };
  
  const handleNotifyButtonClick = (request) => {
    if (!request.staff) {
      toast.warning('Please assign a staff member first');
      return;
    }
    
    setCurrentNotifyDetails({
      residentName: request.resident_name || `${request.first_name || ''} ${request.last_name || ''}`.trim(),
      residentUid: request.uid || request.user_id || '',
      staffName: request.staff,
      issue: request.issue || ''
    });
    
    setIsNotifyModalOpen(true);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'services', id), {
        status: newStatus,
        updatedAt: new Date()
      });
      toast.success(`Request ${newStatus.toLowerCase()} successfully`);
      fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating request: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Updated to match the Firestore field structure
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      (request.issue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.house_no || '').toString().includes(searchQuery);
    
    const matchesRequestType = !requestTypeFilter || 
      request.type_of_request === requestTypeFilter || 
      request.request_type === requestTypeFilter;
    
    const matchesStatus = !statusFilter || request.status === statusFilter;
    
    return matchesSearch && matchesRequestType && matchesStatus;
  });

  // Update the formatDate function to remove the reference to 'request'
const formatDate = (timestamp) => {
  if (!timestamp) {
    return 'N/A';
  }
  
  try {
    // Handle Firestore timestamps or string dates
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return timestamp.toString ? timestamp.toString().substring(0, 10) : 'Invalid date';
  }
};

// Update the formatTime function to remove the reference to 'request'
const formatTime = (timestamp) => {
  if (!timestamp) {
    return 'N/A';
  }
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  } catch (error) {
    return timestamp.toString ? timestamp.toString().substring(11, 19) : 'Invalid time';
  }
};

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Service Requests</h1>
        </div>
        
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select 
            value={requestTypeFilter}
            onChange={(e) => setRequestTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Request Types</option>
            <option value="Repair Request">Repair Request</option>
            <option value="Plumbing Repair">Plumbing Repair</option>
            <option value="Street Sweeper">Cleaning Request</option>
            <option value="Electrician">Electrical Repair</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Help Requests Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    House Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assign Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          House #{request.house_no !== undefined ? request.house_no : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          {request.service_provider || request.request_type || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {request.type_of_request || request.request_type || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleShowIssueDetails(request.issue)}
                          className="p-2 rounded-full hover:bg-gray-100"
                          title="View Issue"
                        >
                          <span role="img" aria-label="View Issue" className="text-lg">📝</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {request.image_url && request.image_url !== "null" && request.image_url !== "undefined" ? (
                          <button
                            onClick={() => handleShowImage(request.image_url)}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="View Image"
                          >
                            <span role="img" aria-label="View Image" className="text-lg">🖼️</span>
                          </button>
                        ) : (
                          <div className="text-sm text-gray-500">None</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleShowComment(request.id)}
                          className="p-2 rounded-full hover:bg-gray-100"
                          title="View Comments"
                        >
                          <span role="img" aria-label="View Comments" className="text-lg">💬</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                          <div className="flex flex-col text-sm text-gray-900">
                                <div className="flex items-center">
                                        <span className="mr-1">📅</span>
                                              {formatDate(request.timestamp || request.created_at)}
                            </div>
                          <div className="flex items-center mt-1">
                            <span className="mr-1">⏰</span>
                              {formatTime(request.timestamp || request.created_at)}
                              </div>
                            </div>
                                </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={request.staff || ''}
                          onChange={(e) => handleAssignStaff(request.id, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Assign Staff</option>
                          {staffList.map((staff) => (
                            <option key={staff.id} value={staff.name}>
                              {staff.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            disabled={!request.staff}
                            onClick={() => handleNotifyButtonClick(request)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            Notify
                          </button>
                          
                          {(!request.status || request.status === 'Pending') && (
                            <button 
                              onClick={() => handleUpdateStatus(request.id, 'Confirmed')}
                              className="bg-green-500 text-white px-3 py-1 rounded-md"
                            >
                              Confirm
                            </button>
                          )}
                          {request.status === 'Confirmed' && (
                            <button 
                              onClick={() => handleUpdateStatus(request.id, 'Completed')}
                              className="bg-blue-500 text-white px-3 py-1 rounded-md"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Issue Details Modal */}
        <Transition appear show={isIssueModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsIssueModalOpen(false)}
          >
            <div className="flex min-h-screen items-center justify-center px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-6 py-4 text-left align-middle shadow-xl transition-all sm:max-w-lg sm:w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Issue Details
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{currentIssue}</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsIssueModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        {/* No Issue Modal */}
        <Transition appear show={isNoIssueModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsNoIssueModalOpen(false)}
          >
            <div className="flex min-h-screen items-center justify-center px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-6 py-4 text-left align-middle shadow-xl transition-all sm:max-w-lg sm:w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    No Issue Details
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">No issue details were provided for this request.</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsNoIssueModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        {/* Image Modal */}
        <Transition appear show={isImageModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsImageModalOpen(false)}
          >
            <div className="flex min-h-screen items-center justify-center px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-6 py-4 text-left align-middle shadow-xl transition-all sm:max-w-lg sm:w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Image
                  </Dialog.Title>
                  <div className="mt-2">
                    <img 
                      src={currentImage} 
                      alt="Request" 
                      className="w-full h-auto rounded-md"
                      onError={(e) => {
                        e.target.src = "/placeholder-image.png";
                        e.target.alt = "Failed to load image";
                      }} 
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsImageModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        {/* Comment Modal */}
        <Transition appear show={isCommentModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsCommentModalOpen(false)}
          >
            <div className="flex min-h-screen items-center justify-center px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-6 py-4 text-left align-middle shadow-xl transition-all sm:max-w-lg sm:w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Comment
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{currentComment}</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsCommentModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        {/* No Comment Modal */}
        <Transition appear show={isNoCommentModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsNoCommentModalOpen(false)}
          >
            <div className="flex min-h-screen items-center justify-center px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

<Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-6 py-4 text-left align-middle shadow-xl transition-all sm:max-w-lg sm:w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    No Comment Available
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">There are no comments available for this request.</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsNoCommentModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        {/* Notify Resident Modal */}
        <Transition appear show={isNotifyModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsNotifyModalOpen(false)}
          >
            <div className="flex min-h-screen items-center justify-center px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block transform overflow-hidden rounded-lg bg-white px-6 py-4 text-left align-middle shadow-xl transition-all sm:max-w-lg sm:w-full">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Notify Resident
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Send a notification to {currentNotifyDetails.residentName} that {currentNotifyDetails.staffName} is on the way to address their issue.
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Issue:</p>
                      <p className="text-sm text-gray-500">{currentNotifyDetails.issue}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsNotifyModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => sendNotification(currentNotifyDetails)}
                    >
                      Send Notification
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    </AdminLayout>
  );
}

export default ServiceRequests;