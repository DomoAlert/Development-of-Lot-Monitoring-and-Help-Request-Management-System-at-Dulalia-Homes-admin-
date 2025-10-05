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
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Dialog, Transition } from '@headlessui/react';
import AdminLayout from '../../components/AdminLayout';
import { 
  Card, CardHeader, CardBody, Button, Table, TableHead, 
  TableBody, TableRow, TableCell, TableHeaderCell, Badge, 
  Modal, DataSearch 
} from '../../components/AdminUI';
import withAdminPage from '../../components/withAdminPage';

function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staffList, setStaffList] = useState([]);
  
  // Service management state
  const [availableServices, setAvailableServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isServiceManagementModalOpen, setIsServiceManagementModalOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    price: '',
    status: 'active',
    estimated_time: '',
    category: 'general',
    duration_unit: 'hours'
  });
  const [serviceFormErrors, setServiceFormErrors] = useState({});
  const [isEditingService, setIsEditingService] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isConfirmStatusModalOpen, setIsConfirmStatusModalOpen] = useState(false);
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isNoCommentModalOpen, setIsNoCommentModalOpen] = useState(false);
  const [isNoIssueModalOpen, setIsNoIssueModalOpen] = useState(false);
  const [isNotifyResidentModalOpen, setIsNotifyResidentModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState('');
  const [currentComment, setCurrentComment] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [currentNotifyDetails, setCurrentNotifyDetails] = useState({
    residentName: '',
    residentUid: '',
    staffName: '',
    issue: ''
  });
  
  // Service types management state
  const [serviceTypes, setServiceTypes] = useState([]);
  const [serviceTypeFormData, setServiceTypeFormData] = useState({
    name: '',
    description: '',
    active: true
  });
  const [serviceTypeFormErrors, setServiceTypeFormErrors] = useState({});
  const [isEditingServiceType, setIsEditingServiceType] = useState(false);
  const [currentServiceTypeId, setCurrentServiceTypeId] = useState(null);
  
  // New service request state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    house_no: '',
    resident_name: '',
    type_of_request: '',
    issue: '',
    additional_notes: '',
    scheduled_date: '',
    scheduled_time: '',
    image_url: '',
    status: 'Pending'
  });
  const [requestFormErrors, setRequestFormErrors] = useState({});
  const [homeownerList, setHomeownerList] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to manually refresh data
  const refreshData = () => {
    setLoading(true);
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    document.title = "Service Requests";
    fetchRequests();
    fetchStaffList();
    fetchAvailableServices();
    fetchHomeownerList();
    fetchServiceTypes();
  }, [refreshTrigger]);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'services'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Request data:', data); // Debug log to see what's coming from Firebase
        
        // Ensure we have a consistent field for resident name
        // Prefer fullName if it exists, otherwise fall back to resident_name
        const formattedData = {
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to JS Date if needed
          timestamp: data.timestamp ? data.timestamp : null
        };
        
        return formattedData;
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
  
  // Fetch service types
  const fetchServiceTypes = async () => {
    try {
      const serviceTypesSnapshot = await getDocs(collection(db, 'service_types'));
      
      // Sort service types by name
      const serviceTypesData = serviceTypesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setServiceTypes(serviceTypesData);
      
      // Display a message if no service types found, suggesting to run the migration script
      if (serviceTypesData.length === 0) {
        console.log('No service types found in database. Consider running the migration script: npm run seed-service-types');
      }
    } catch (error) {
      console.error('Error fetching service types:', error);
      toast.error('Failed to load service types');
    }
  };

  // Fetch available services
  const fetchAvailableServices = async () => {
    try {
      setLoading(true);
      const servicesSnapshot = await getDocs(collection(db, 'available_services'));
      
      // Sort services by status (active first) and then by name
      const servicesData = servicesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure we have default values for any potentially missing fields
          category: doc.data().category || 'general',
          duration_unit: doc.data().duration_unit || 'hours'
        }))
        .sort((a, b) => {
          // First sort by status (active first)
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          
          // Then sort by name
          return a.name.localeCompare(b.name);
        });
      
      setAvailableServices(servicesData);
      filterServices(servicesData, serviceSearchQuery, serviceStatusFilter);
    } catch (error) {
      console.error("Error fetching available services:", error);
      toast.error('Error fetching available services: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter services based on search query and status filter
  const filterServices = (services = availableServices, query = serviceSearchQuery, statusFilter = serviceStatusFilter) => {
    let filtered = [...services];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter);
    }
    
    // Apply search query filter
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(lowercaseQuery) ||
        service.description.toLowerCase().includes(lowercaseQuery) ||
        service.category?.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    setFilteredServices(filtered);
  };
  
  // Fetch homeowner list
  const fetchHomeownerList = async () => {
    try {
      const homeownerSnapshot = await getDocs(collection(db, 'users'));
      const homeownerData = homeownerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fullName: doc.data().name || `${doc.data().first_name || ''} ${doc.data().last_name || ''}`.trim()
      }));
      setHomeownerList(homeownerData);
    } catch (error) {
      console.error("Error fetching homeowners:", error);
      toast.error('Error fetching homeowner list: ' + error.message);
    }
  };
  
  const getStaffDetails = (name) => {
    return staffList.find(staff => staff.name === name) || {};
  };
  
  // Service management functions
  const handleAddService = () => {
    setServiceFormData({
      name: '',
      description: '',
      price: '',
      status: 'active',
      estimated_time: '',
      category: 'general',
      duration_unit: 'hours'
    });
    setIsEditingService(false);
    setCurrentServiceId(null);
    setServiceFormErrors({});
    setIsServiceModalOpen(true);
  };
  
  const handleEditService = (service) => {
    setServiceFormData({
      name: service.name || '',
      description: service.description || '',
      price: service.price || '',
      status: service.status || 'active',
      estimated_time: service.estimated_time || '',
      category: service.category || 'general',
      duration_unit: service.duration_unit || 'hours'
    });
    // Set to view-only mode
    setIsEditingService(false);
    setCurrentServiceId(service.id);
    setServiceFormErrors({});
    setIsServiceModalOpen(true);
  };
  
  const handleToggleServiceStatus = (service) => {
    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    handleConfirmStatusChange(service.id, newStatus);
  };
  
  const handleServiceFormChange = (e) => {
    const { name, value } = e.target;
    setServiceFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (serviceFormErrors[name]) {
      setServiceFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Service Type Management Functions
  const handleAddServiceType = () => {
    setServiceTypeFormData({
      name: '',
      description: ''
    });
    setServiceTypeFormErrors({});
    setIsEditingServiceType(false);
    setCurrentServiceTypeId(null);
    setIsServiceTypeModalOpen(true);
  };
  
  const handleEditServiceType = (serviceType) => {
    setServiceTypeFormData({
      name: serviceType.name,
      description: serviceType.description || '',
      active: serviceType.active !== undefined ? serviceType.active : true
    });
    setServiceTypeFormErrors({});
    setIsEditingServiceType(true);
    setCurrentServiceTypeId(serviceType.id);
    setIsServiceTypeModalOpen(true);
  };
  
  const validateServiceTypeForm = () => {
    const errors = {};
    
    if (!serviceTypeFormData.name.trim()) {
      errors.name = 'Service type name is required';
    }
    
    setServiceTypeFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleServiceTypeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setServiceTypeFormData({
      ...serviceTypeFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleServiceTypeFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateServiceTypeForm()) {
      return;
    }
    
    try {
      if (isEditingServiceType) {
        // Update existing service type
        await updateDoc(doc(db, 'service_types', currentServiceTypeId), {
          name: serviceTypeFormData.name.trim(),
          description: serviceTypeFormData.description.trim(),
          active: serviceTypeFormData.active,
          updatedAt: serverTimestamp()
        });
        
        toast.success('Service type updated successfully');
      } else {
        // Add new service type
        await addDoc(collection(db, 'service_types'), {
          name: serviceTypeFormData.name.trim(),
          description: serviceTypeFormData.description.trim(),
          active: serviceTypeFormData.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        toast.success('Service type added successfully');
      }
      // Reset form data
      setServiceTypeFormData({
        name: '',
        description: '',
        active: true
      });
      setIsEditingServiceType(false);
      setCurrentServiceTypeId(null);
      setServiceTypeFormErrors({});
      
      fetchServiceTypes();
      
      if (isEditingServiceType) {
        // If editing, close the modal
        setIsServiceTypeModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving service type:', error);
      toast.error('Failed to save service type');
    }
  };
  
  const handleDeleteServiceType = async (serviceTypeId) => {
    try {
      await deleteDoc(doc(db, 'service_types', serviceTypeId));
      toast.success('Service type deleted successfully');
      fetchServiceTypes();
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast.error('Failed to delete service type');
    }
  };
  
  const handleToggleServiceTypeStatus = async (serviceType) => {
    try {
      const newActiveStatus = !serviceType.active;
      await updateDoc(doc(db, 'service_types', serviceType.id), {
        active: newActiveStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Service type ${newActiveStatus ? 'activated' : 'deactivated'} successfully`);
      fetchServiceTypes();
    } catch (error) {
      console.error('Error toggling service type status:', error);
      toast.error('Failed to update service type status');
    }
  };
  
  // Handle search and filter changes for services
  const handleServiceSearchChange = (e) => {
    const query = e.target.value;
    setServiceSearchQuery(query);
    filterServices(availableServices, query, serviceStatusFilter);
  };
  
  const handleServiceStatusFilterChange = (e) => {
    const filter = e.target.value;
    setServiceStatusFilter(filter);
    filterServices(availableServices, serviceSearchQuery, filter);
  };
  
  // Handle service status change confirmation
  const handleConfirmStatusChange = async (serviceId, newStatus) => {
    try {
      await updateDoc(doc(db, 'available_services', serviceId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Service status updated to ${newStatus}`);
      fetchAvailableServices();
      setIsConfirmStatusModalOpen(false);
    } catch (error) {
      console.error('Error updating service status:', error);
      toast.error('Error updating service status: ' + error.message);
    }
  };
  
  // Validate service form
  const validateServiceForm = () => {
    const errors = {};
    
    // Required fields
    if (!serviceFormData.name.trim()) {
      errors.name = 'Service name is required';
    }
    
    if (!serviceFormData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!serviceFormData.price.trim()) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(serviceFormData.price.replace(/[^\d.-]/g, '')))) {
      errors.price = 'Price must be a valid number';
    }
    
    if (!serviceFormData.estimated_time.trim()) {
      errors.estimated_time = 'Estimated time is required';
    }
    
    if (!serviceFormData.category.trim()) {
      errors.category = 'Category is required';
    }
    
    setServiceFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Service request form handlers
  const handleRequestFormChange = (e) => {
    const { name, value } = e.target;
    setRequestFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear any existing error for this field
    if (requestFormErrors[name]) {
      setRequestFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // If homeowner is selected, auto-populate house number
    if (name === 'resident_name') {
      const selectedHomeowner = homeownerList.find(h => h.id === value);
      if (selectedHomeowner) {
        setRequestFormData(prev => ({
          ...prev,
          house_no: selectedHomeowner.house_no || ''
        }));
      }
    }
  };
  
  const validateRequestForm = () => {
    const errors = {};
    
    if (!requestFormData.resident_name) {
      errors.resident_name = 'Please select a homeowner';
    } else {
      // Check if resident has a bad record
      const selectedHomeowner = homeownerList.find(h => h.id === requestFormData.resident_name);
      if (selectedHomeowner && selectedHomeowner.record_status === 'Bad') {
        errors.resident_name = 'This homeowner has a bad record status';
      }
    }
    
    if (!requestFormData.house_no.trim()) {
      errors.house_no = 'House number is required';
    }
    
    if (!requestFormData.type_of_request) {
      errors.type_of_request = 'Please select a request type';
    }
    
    if (!requestFormData.issue.trim()) {
      errors.issue = 'Issue description is required';
    }
    
    // If scheduled time is provided but not date
    if (requestFormData.scheduled_time && !requestFormData.scheduled_date) {
      errors.scheduled_time = 'Please select a date along with the time';
    }
    
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!validateRequestForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Get selected homeowner name
      const selectedHomeowner = homeownerList.find(h => h.id === requestFormData.resident_name);
      
      // Create request document
      const requestData = {
        house_no: requestFormData.house_no,
        fullName: selectedHomeowner ? selectedHomeowner.fullName : 'Unknown',
        resident_name: selectedHomeowner ? selectedHomeowner.fullName : 'Unknown', // Keep for backward compatibility
        resident_id: requestFormData.resident_name,
        type_of_request: requestFormData.type_of_request,
        issue: requestFormData.issue,
        additional_notes: requestFormData.additional_notes || null,
        scheduled_date: requestFormData.scheduled_date || null,
        scheduled_time: requestFormData.scheduled_time || null,
        status: 'Pending',
        created_at: serverTimestamp(),
        last_updated: serverTimestamp()
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'services'), requestData);
      
      // Reset form and close modal
      setRequestFormData({
        house_no: '',
        resident_name: '',
        type_of_request: '',
        issue: '',
        additional_notes: '',
        scheduled_date: '',
        scheduled_time: '',
        status: 'Pending'
      });
      setIsRequestModalOpen(false);
      
      // Refresh requests list
      fetchRequests();
      
      toast.success('Service request submitted successfully');
    } catch (error) {
      console.error('Error submitting service request:', error);
      toast.error('Failed to submit service request');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveService = async () => {
    // Validate form before saving
    if (!validateServiceForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }
    
    try {
      // Format price value
      const formattedPrice = serviceFormData.price.startsWith('₱') 
        ? serviceFormData.price 
        : `₱${parseFloat(serviceFormData.price.replace(/[^\d.-]/g, '')).toFixed(2)}`;
      
      // Format estimated time with duration unit if not already included
      let formattedTime = serviceFormData.estimated_time;
      if (!formattedTime.includes(serviceFormData.duration_unit)) {
        formattedTime = `${formattedTime} ${serviceFormData.duration_unit}`;
      }
      
      const serviceData = {
        ...serviceFormData,
        price: formattedPrice,
        estimated_time: formattedTime,
        updatedAt: serverTimestamp()
      };
      
      if (isEditingService && currentServiceId) {
        // Update existing service
        await updateDoc(doc(db, 'available_services', currentServiceId), serviceData);
        toast.success('Service updated successfully!');
      } else {
        // Add new service
        serviceData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'available_services'), serviceData);
        toast.success('Service added successfully!');
      }
      
      // Close modal and refresh services
      setIsServiceModalOpen(false);
      setServiceFormErrors({});
      fetchAvailableServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Error saving service: ' + error.message);
    }
  };
  
  const handleShowDeleteConfirmation = (service) => {
    setServiceToDelete(service);
    setIsConfirmDeleteModalOpen(true);
  };
  
  const handleCancelDelete = () => {
    setServiceToDelete(null);
    setIsConfirmDeleteModalOpen(false);
  };
  
  const handleDeleteService = async () => {
    if (!serviceToDelete || !serviceToDelete.id) {
      setIsConfirmDeleteModalOpen(false);
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'available_services', serviceToDelete.id));
      toast.success('Service deleted successfully!');
      fetchAvailableServices();
      setIsConfirmDeleteModalOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Error deleting service: ' + error.message);
    }
  };
  
  const handleShowIssueDetails = (issue) => {
    if (!issue || issue === 'null' || issue === 'undefined' || issue.trim() === '') {
      setIsNoIssueModalOpen(true);
    } else {
      setCurrentIssue(issue);
      setIsIssueModalOpen(true);
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
  
  // REMOVED FOR WEB ADMIN VIEW: These functions are commented out as they're not needed in the view-only version
  /*
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
      residentName: request.fullName || request.resident_name || `${request.first_name || ''} ${request.last_name || ''}`.trim(),
      residentUid: request.uid || request.user_id || '',
      staffName: request.staff,
      issue: request.issue || ''
    });
    
    setIsNotifyModalOpen(true);
    setIsNotifyResidentModalOpen(true);
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
  */

  const getStatusVariant = (status) => {
    if (!status) return 'warning';
    
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'in-progress':
        return 'info';
      case 'confirmed':
        return 'success';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'danger';
      default:
        return 'outline';
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
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Service Requests
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Manage maintenance and repair requests from residents</p>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              } transition-colors mt-4 md:mt-0`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            
            <Button 
              variant="secondary" 
              onClick={() => setIsServiceTypeModalOpen(true)}
              className="flex items-center mt-4 md:mt-0 bg-blue-50 hover:bg-blue-100 text-blue-700"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Manage Service Types
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <DataSearch
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3"
          />
          <select 
            value={requestTypeFilter}
            onChange={(e) => setRequestTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Request Types</option>
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Help Requests Table */}
        <Card>
          <CardHeader 
            title="Service Requests" 
            action={
              <Button 
                variant="primary" 
                onClick={() => setIsRequestModalOpen(true)}
                size="sm"
              >
                + New Request
              </Button>
            }
          />
          <CardBody>
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-lg text-gray-600">Loading requests...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resident Info
                      </TableHeaderCell>
                      <TableHeaderCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request Details
                      </TableHeaderCell>
                      <TableHeaderCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </TableHeaderCell>
                      <TableHeaderCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </TableHeaderCell>
                      <TableHeaderCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </TableHeaderCell>
                      <TableHeaderCell className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignment
                      </TableHeaderCell>
                      
                    </TableRow>
                  </TableHead>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7" className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium text-gray-500">No service requests found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gray-50">
                      {/* Resident Info Column */}
                      <TableCell className="px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">House #{request.house_no !== undefined ? request.house_no : 'N/A'}</div>
                            <div className="text-sm text-gray-500">{request.fullName || request.resident_name || 'Unnamed resident'}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Request Details Column */}
                      <TableCell className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.type_of_request || request.request_type || 'N/A'}</div>
                        {request.scheduled_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Scheduled: {request.scheduled_date} {request.scheduled_time && `at ${request.scheduled_time}`}
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Content Column (Issue, Image, Comments) */}
                      <TableCell className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleShowIssueDetails(request.issue)}
                            className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
                            title="View Issue Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleShowComment(request.id)}
                            className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 transition-colors"
                            title="View Comments"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-6 py-4">
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
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <Badge variant={getStatusVariant(request.status)}>
                          {request.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-700">
                        {request.staff ? (
                          <span className="text-gray-800 font-medium">{request.staff}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
        

        
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

        {/* Delete Service Confirmation Modal */}
        <Modal
          isOpen={isConfirmDeleteModalOpen}
          onClose={handleCancelDelete}
          title="Delete Service"
        >
          <div className="p-4">
            {serviceToDelete && (
              <>
                <div className="bg-red-50 p-4 rounded-md mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Warning</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          Are you sure you want to delete the service <strong>{serviceToDelete.name}</strong>? This action cannot be undone.
                        </p>
                        {serviceToDelete.status === 'active' && (
                          <p className="mt-2">
                            This service is currently active and may be in use by existing service requests.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteService}
                  >
                    Delete Service
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
        
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

        {/* Notify Resident Modal - Removed in Web Admin View Only version */}
        <Transition appear show={isNotifyResidentModalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => setIsNotifyResidentModalOpen(false)}
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
                    <p className="text-sm text-gray-500">Are you sure you want to notify the resident?</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsNotifyResidentModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>

        {/* Service Management Modal */}
        <Modal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          title="View Service"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={serviceFormData.name}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                readOnly
              />
              {serviceFormErrors.name && (
                <p className="mt-1 text-sm text-red-600">{serviceFormErrors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={serviceFormData.description}
                disabled
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {serviceFormErrors.description && (
                <p className="mt-1 text-sm text-red-600">{serviceFormErrors.description}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₱</span>
                </div>
                <input
                  type="text"
                  name="price"
                  id="price"
                  value={serviceFormData.price.replace('₱', '')}
                  disabled
                  readOnly
                  className="pl-7 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              {serviceFormErrors.price && (
                <p className="mt-1 text-sm text-red-600">{serviceFormErrors.price}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                id="category"
                value={serviceFormData.category}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="general">General</option>
                {serviceTypes.map((type) => (
                  <option key={type.id} value={type.name.toLowerCase()}>
                    {type.name}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
              {serviceFormErrors.category && (
                <p className="mt-1 text-sm text-red-600">{serviceFormErrors.category}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimated_time" className="block text-sm font-medium text-gray-700">
                  Estimated Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="estimated_time"
                  id="estimated_time"
                  value={serviceFormData.estimated_time}
                  disabled
                  readOnly
                  placeholder="e.g., 2-3"
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {serviceFormErrors.estimated_time && (
                  <p className="mt-1 text-sm text-red-600">{serviceFormErrors.estimated_time}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="duration_unit" className="block text-sm font-medium text-gray-700">
                  Duration Unit
                </label>
                <select
                  name="duration_unit"
                  id="duration_unit"
                  value={serviceFormData.duration_unit}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                id="status"
                value={serviceFormData.status}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Active services can be requested by homeowners, inactive services will not appear in their service request options.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setIsServiceModalOpen(false);
                  setServiceFormErrors({});
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
        {/* New Service Request Modal */}
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title="New Service Request"
        >
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label htmlFor="resident_name" className="block text-sm font-medium text-gray-700">
                Homeowner <span className="text-red-500">*</span>
              </label>
              <select
                id="resident_name"
                name="resident_name"
                value={requestFormData.resident_name}
                onChange={handleRequestFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a homeowner</option>
                {homeownerList.map((homeowner) => (
                  <option key={homeowner.id} value={homeowner.id}>
                    {homeowner.fullName} {homeowner.record_status === 'Bad' ? '(Bad Record)' : ''}
                  </option>
                ))}
              </select>
              {requestFormErrors.resident_name && (
                <p className="mt-1 text-sm text-red-500">{requestFormErrors.resident_name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="house_no" className="block text-sm font-medium text-gray-700">
                House Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="house_no"
                name="house_no"
                value={requestFormData.house_no}
                onChange={handleRequestFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., 123"
                required
              />
              {requestFormErrors.house_no && (
                <p className="mt-1 text-sm text-red-500">{requestFormErrors.house_no}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="type_of_request" className="block text-sm font-medium text-gray-700">
                Request Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type_of_request"
                name="type_of_request"
                value={requestFormData.type_of_request}
                onChange={handleRequestFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select request type</option>
                {serviceTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              {requestFormErrors.type_of_request && (
                <p className="mt-1 text-sm text-red-500">{requestFormErrors.type_of_request}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="issue" className="block text-sm font-medium text-gray-700">
                Issue Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="issue"
                name="issue"
                rows={3}
                value={requestFormData.issue}
                onChange={handleRequestFormChange}
                placeholder="Please describe the issue in detail"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
              {requestFormErrors.issue && (
                <p className="mt-1 text-sm text-red-500">{requestFormErrors.issue}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                id="additional_notes"
                name="additional_notes"
                rows={2}
                value={requestFormData.additional_notes}
                onChange={handleRequestFormChange}
                placeholder="Any additional information that might help with the service request"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional: Include any special instructions or context that might be helpful
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700">
                  Preferred Date
                </label>
                <input
                  type="date"
                  id="scheduled_date"
                  name="scheduled_date"
                  value={requestFormData.scheduled_date}
                  onChange={handleRequestFormChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  When would you prefer the service to be performed?
                </p>
              </div>
              
              <div>
                <label htmlFor="scheduled_time" className="block text-sm font-medium text-gray-700">
                  Preferred Time
                </label>
                <input
                  type="time"
                  id="scheduled_time"
                  name="scheduled_time"
                  value={requestFormData.scheduled_time}
                  onChange={handleRequestFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {requestFormErrors.scheduled_time && (
                  <p className="mt-1 text-sm text-red-500">{requestFormErrors.scheduled_time}</p>
                )}
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsRequestModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
        
        {/* Status Change Confirmation Modal */}
        <Modal
          isOpen={isConfirmStatusModalOpen}
          onClose={() => setIsConfirmStatusModalOpen(false)}
          title="Confirm Status Change"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to change this service's status?
            </p>
            {serviceToDelete && serviceToDelete.status === 'active' ? (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Making this service inactive will hide it from homeowners requesting services. Any existing requests for this service will not be affected.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Information</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Making this service active will allow homeowners to request it.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsConfirmStatusModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant={serviceToDelete && serviceToDelete.status === 'active' ? 'danger' : 'success'}
                onClick={() => handleConfirmStatusChange(
                  serviceToDelete.id, 
                  serviceToDelete.status === 'active' ? 'inactive' : 'active'
                )}
              >
                {serviceToDelete && serviceToDelete.status === 'active' ? 'Make Inactive' : 'Make Active'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Service Type Management Modal */}
        <Modal
          isOpen={isServiceTypeModalOpen}
          onClose={() => {
            setIsServiceTypeModalOpen(false);
            setServiceTypeFormData({
              name: '',
              description: '',
              active: true
            });
            setIsEditingServiceType(false);
            setCurrentServiceTypeId(null);
            setServiceTypeFormErrors({});
          }}
          title={isEditingServiceType ? "Edit Service Type" : "Add New Service Type"}
        >
          <form onSubmit={handleServiceTypeFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Service Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={serviceTypeFormData.name}
                onChange={handleServiceTypeFormChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  serviceTypeFormErrors.name ? 'border-red-300' : ''
                }`}
                placeholder="Plumbing, Electrical, etc."
              />
              {serviceTypeFormErrors.name && (
                <p className="mt-1 text-sm text-red-600">{serviceTypeFormErrors.name}</p>
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
                value={serviceTypeFormData.description}
                onChange={handleServiceTypeFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Optional description of this service type"
              />
            </div>
            
            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  id="active"
                  checked={serviceTypeFormData.active}
                  onChange={(e) => setServiceTypeFormData({
                    ...serviceTypeFormData,
                    active: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Active service types can be selected when creating new requests
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsServiceTypeModalOpen(false);
                  setServiceTypeFormData({
                    name: '',
                    description: '',
                    active: true
                  });
                  setIsEditingServiceType(false);
                  setCurrentServiceTypeId(null);
                  setServiceTypeFormErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {isEditingServiceType ? "Update" : "Add"} Service Type
              </Button>
            </div>
          </form>
          
          {/* List of existing service types */}
          {serviceTypes.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Existing Service Types</h3>
              <div className="overflow-auto max-h-64 border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                     
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceTypes.map((serviceType) => (
                      <tr key={serviceType.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {serviceType.name}
                          {serviceType.description && (
                            <p className="text-xs text-gray-500 mt-1">{serviceType.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              serviceType.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            } cursor-pointer`}
                            onClick={() => handleToggleServiceTypeStatus(serviceType)}
                          >
                            {serviceType.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditServiceType(serviceType)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteServiceType(serviceType.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export default ServiceRequests;