import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { UserCircleIcon } from '@heroicons/react/outline';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';

function Staff() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState(null);
  
  // Updated form data to match new structure
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    name: '', // Auto-generated from firstName + lastName
    email: '',
    role: 'staff',
    position: '',
    status: 'Active',
    contactNumber: '',
    specialization: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  // Position and Specialization Management States
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [currentPositionId, setCurrentPositionId] = useState(null);
  const [positionFormData, setPositionFormData] = useState({
    id: '',
    name: '',
    specializations: []
  });
  const [newSpecialization, setNewSpecialization] = useState('');

  // Dynamic positions loaded from Firestore
  const [availablePositions, setAvailablePositions] = useState([]);

  // Get specializations based on selected position
  const getSpecializationsForPosition = (positionId) => {
    const position = availablePositions.find(p => p.id === positionId);
    return position ? position.specializations : [];
  };

  useEffect(() => {
    document.title = "Staff list";
    fetchStaff();
    fetchPositions();
  }, []);

  // Fetch positions from Firestore
  const fetchPositions = async () => {
    try {
      const positionsSnapshot = await getDocs(collection(db, 'positionSpecialization'));
      const positionsData = positionsSnapshot.docs.map(doc => ({
        id: doc.id, // Firestore document ID
        ...doc.data()
      }));
      console.log('Fetched positions:', positionsData); // Debug log
      
      // Remove duplicates based on ID
      const uniquePositions = positionsData.filter((position, index, self) => 
        index === self.findIndex(p => p.id === position.id)
      );
      console.log('Unique positions:', uniquePositions); // Debug log
      
      setAvailablePositions(uniquePositions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Failed to load positions');
      // Fallback to default positions if fetch fails
      setAvailablePositions([
        { id: 'electrician', name: 'Electrician', specializations: ['Electrical Wiring', 'Panel Installation', 'Motor Repair', 'Lighting Systems'] },
        { id: 'plumber', name: 'Plumber', specializations: ['Pipe Installation', 'Leak Repair', 'Drain Cleaning', 'Water Heater Service'] },
        { id: 'street_sweeper', name: 'Street Sweeper', specializations: ['Street Cleaning', 'Waste Collection', 'Park Maintenance', 'Drainage Cleaning'] }
      ]);
    }
  };

  // Position Management Functions
  const handleAddPosition = async (e) => {
    e.preventDefault();
    
    if (!positionFormData.name.trim()) {
      toast.error('Position name is required');
      return;
    }
    
    try {
      const documentId = positionFormData.id || positionFormData.name.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, 'positionSpecialization', documentId), {
        id: documentId,
        name: positionFormData.name,
        specializations: positionFormData.specializations
      });
      
      toast.success('Position added successfully');
      fetchPositions();
      closePositionForm();
    } catch (error) {
      console.error('Error adding position:', error);
      toast.error('Failed to add position');
    }
  };

  const handleUpdatePosition = async (e) => {
    e.preventDefault();
    
    if (!positionFormData.name.trim()) {
      toast.error('Position name is required');
      return;
    }
    
    try {
      console.log('Updating position with ID:', currentPositionId); // Debug log
      const positionRef = doc(db, 'positionSpecialization', currentPositionId);
      
      // Check if document exists
      const docSnap = await getDoc(positionRef);
      
      if (docSnap.exists()) {
        // Document exists, update it
        await updateDoc(positionRef, {
          name: positionFormData.name,
          specializations: positionFormData.specializations
        });
      } else {
        // Document doesn't exist, create it with setDoc
        await setDoc(positionRef, {
          id: currentPositionId,
          name: positionFormData.name,
          specializations: positionFormData.specializations
        });
      }
      
      toast.success('Position updated successfully');
      fetchPositions();
      closePositionForm();
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error('Failed to update position');
    }
  };

  const handleEditPosition = (position) => {
    console.log('Editing position:', position); // Debug log
    setPositionFormData({
      id: position.id,
      name: position.name,
      specializations: position.specializations || []
    });
    setCurrentPositionId(position.id); // This should be the Firestore document ID
    setIsEditingPosition(true);
    setShowPositionForm(true);
  };

  const handleDeletePosition = async (positionId) => {
    if (window.confirm('Are you sure you want to delete this position? This may affect existing staff assignments.')) {
      try {
        await deleteDoc(doc(db, 'positionSpecialization', positionId));
        toast.success('Position deleted successfully');
        fetchPositions();
      } catch (error) {
        console.error('Error deleting position:', error);
        toast.error('Failed to delete position');
      }
    }
  };

  const handleAddSpecialization = () => {
    const trimmedSpec = newSpecialization.trim();
    
    if (!trimmedSpec) {
      toast.error('Please enter a specialization');
      return;
    }
    
    if (positionFormData.specializations.includes(trimmedSpec)) {
      toast.error('This specialization already exists');
      return;
    }
    
    setPositionFormData(prev => ({
      ...prev,
      specializations: [...(prev.specializations || []), trimmedSpec]
    }));
    setNewSpecialization('');
  };

  const handleRemoveSpecialization = (index) => {
    setPositionFormData(prev => ({
      ...prev,
      specializations: (prev.specializations || []).filter((_, i) => i !== index)
    }));
  };

  const closePositionForm = () => {
    setShowPositionForm(false);
    setIsEditingPosition(false);
    setCurrentPositionId(null);
    setPositionFormData({
      id: '',
      name: '',
      specializations: []
    });
    setNewSpecialization('');
  };

  const fetchStaff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staffData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaffMembers(staffData);
    } catch (error) {
      toast.error('Error fetching staff members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    
    if (!formData.position) {
      toast.error('Please select a position');
      return;
    }
    
    if (!validatePhoneNumber(formData.contactNumber)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    try {
      // Create the staff data object
      const staffData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        role: 'staff',
        position: formData.position,
        status: formData.status,
        contactNumber: formData.contactNumber,
        specialization: formData.specialization,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'staff'), staffData);
      
      toast.success('Staff member added successfully');
      setShowForm(false);
      resetForm();
      fetchStaff();
    } catch (error) {
      toast.error('Error adding staff member: ' + error.message);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    
    if (!formData.position) {
      toast.error('Please select a position');
      return;
    }
    
    if (!validatePhoneNumber(formData.contactNumber)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    try {
      const staffData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        role: 'staff',
        position: formData.position,
        status: formData.status,
        contactNumber: formData.contactNumber,
        specialization: formData.specialization,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'staff', currentStaffId), staffData);
      
      toast.success('Staff member updated successfully');
      setShowForm(false);
      setIsEditing(false);
      setCurrentStaffId(null);
      resetForm();
      fetchStaff();
    } catch (error) {
      toast.error('Error updating staff member: ' + error.message);
    }
  };

  const handleEditStaff = (staff) => {
    setFormData({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      name: staff.name || '',
      email: staff.email || '',
      role: staff.role || 'staff',
      position: staff.position || '',
      status: staff.status || 'Active',
      contactNumber: staff.contactNumber || '',
      specialization: staff.specialization || ''
    });
    setCurrentStaffId(staff.id);
    setIsEditing(true);
    setShowForm(true);
  };

  // Helper function to auto-generate name
  const handleNameChange = () => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    setFormData(prev => ({ ...prev, name: fullName }));
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      role: 'staff',
      position: '',
      status: 'Active',
      contactNumber: '',
      specialization: ''
    });
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'staff', id), { 
        status: currentStatus === 'Active' ? 'Inactive' : 'Active' 
      });
      toast.success('Staff status updated successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Error updating staff status: ' + error.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteDoc(doc(db, 'staff', id));
        toast.success('Staff member deleted successfully');
        fetchStaff();
      } catch (error) {
        toast.error('Error deleting staff member: ' + error.message);
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentStaffId(null);
    resetForm();
  };

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = 
      (staff.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.position || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPosition = !positionFilter || staff.position === positionFilter;
    
    return matchesSearch && matchesPosition;
  });

  // Update the formatPhoneNumber function for Philippine numbers
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Handle different input formats
    let numberPart = cleaned;
    
    // Remove country code if present (63 or +63)
    if (numberPart.startsWith('63') && numberPart.length === 12) {
      numberPart = numberPart.substring(2);
    }
    
    // Format as 09XX XXX XXXX
    if (numberPart.length > 0) {
      if (numberPart.length <= 4) {
        return numberPart;
      } else if (numberPart.length <= 7) {
        return `${numberPart.substring(0, 4)} ${numberPart.substring(4)}`;
      } else {
        return `${numberPart.substring(0, 4)} ${numberPart.substring(4, 7)} ${numberPart.substring(7, 11)}`;
      }
    }
    return '';
  };

  // Update the validatePhoneNumber function
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    // Philippine mobile numbers: 11 digits starting with 09
    return cleaned.length === 11 && cleaned.startsWith('09');
  };

  return (
    <AdminLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Staff Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Manage maintenance personnel and community staff members</p>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                setIsEditing(false);
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Staff
            </button>
            <button 
              onClick={() => {
                setIsEditingPosition(false);
                setCurrentPositionId(null);
                setPositionFormData({ id: '', name: '', specializations: [] });
                setNewSpecialization('');
                setShowPositionForm(true);
              }}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Manage Positions
            </button>
          </div>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search staff by name, email, or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select 
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Positions</option>
            {availablePositions.map((position, index) => (
              <option key={`${position.id}-${index}`} value={position.id}>{position.name}</option>
            ))}
          </select>
        </div>

        {/* Add/Edit Staff Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h2>
                <button 
                  onClick={closeForm}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={isEditing ? handleUpdateStaff : handleAddStaff} className="p-6 space-y-6">
                {/* Personal Information Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({...formData, firstName: e.target.value});
                          setTimeout(handleNameChange, 0);
                        }}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => {
                          setFormData({...formData, lastName: e.target.value});
                          setTimeout(handleNameChange, 0);
                        }}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name (Auto-generated)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      readOnly
                      className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      placeholder="Full name will appear here"
                    />
                  </div>
                </div>

                {/* Job Information Section */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H8a2 2 0 00-2-2V6m8 0h2a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2" />
                    </svg>
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Position <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value, specialization: ''})}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Position</option>
                        {availablePositions.map((position, index) => (
                          <option key={`${position.id}-${index}`} value={position.id}>{position.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Specialization
                      </label>
                      <select
                        value={formData.specialization}
                        onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!formData.position}
                      >
                        <option value="">Select Specialization</option>
                        {formData.position && getSpecializationsForPosition(formData.position).map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.contactNumber}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setFormData({...formData, contactNumber: formatted});
                        }}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0912 345 6789"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Format: 09XX XXX XXXX</p>
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {isEditing ? 'Update Staff' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Staff table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 border-b border-gray-100 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Staff Members
              <span className="ml-3 px-3 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                {filteredStaff.length} {filteredStaff.length === 1 ? 'member' : 'members'}
              </span>
            </h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading staff members...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Staff Member</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H8a2 2 0 00-2-2V6m8 0h2a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2" />
                        </svg>
                        <span>Position & Specialization</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Contact</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No staff members found</h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first staff member.</p>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              resetForm();
                              setShowForm(true);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Add First Staff Member
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {staff.firstName && staff.lastName 
                                  ? `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase()
                                  : staff.name ? staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                                  : 'ST'}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {staff.role || 'Staff'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {availablePositions.find(p => p.id === staff.position)?.name || staff.position || 'No position assigned'}
                          </div>
                          {staff.specialization && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {staff.specialization}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{staff.email || 'No email'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{staff.contactNumber || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            staff.status === 'Active' 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {staff.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleEditStaff(staff)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              title="Edit staff member"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(staff.id, staff.status)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                              title="Toggle status"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                              </svg>
                              Toggle
                            </button>
                            <button 
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                              title="Delete staff member"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Position Management Modal */}
        {showPositionForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {isEditingPosition ? 'Edit Position' : 'Manage Positions & Specializations'}
                </h2>
                <button 
                  onClick={closePositionForm}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                {isEditingPosition ? (
                  // Edit Position Form
                  <form onSubmit={handleUpdatePosition} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Position Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={positionFormData.name}
                        onChange={(e) => setPositionFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Electrician"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Specializations
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newSpecialization}
                          onChange={(e) => setNewSpecialization(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSpecialization();
                            }
                          }}
                          className="flex-1 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Add specialization"
                        />
                        <button
                          type="button"
                          onClick={handleAddSpecialization}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(positionFormData.specializations || []).map((spec, index) => (
                          <span key={`edit-spec-${index}-${spec}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {spec}
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecialization(index)}
                              className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={closePositionForm}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Update Position
                      </button>
                    </div>
                  </form>
                ) : (
                  // Position List and Add New Position Form
                  <div className="space-y-6">
                    {/* Add New Position Form */}
                    <form onSubmit={handleAddPosition} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <h3 className="font-medium text-green-800 dark:text-green-200 mb-3">Add New Position</h3>
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            required
                            value={positionFormData.name}
                            onChange={(e) => setPositionFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Position name (e.g., Electrician)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSpecialization}
                            onChange={(e) => setNewSpecialization(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSpecialization();
                              }
                            }}
                            className="flex-1 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add specialization"
                          />
                          <button
                            type="button"
                            onClick={handleAddSpecialization}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(positionFormData.specializations || []).map((spec, index) => (
                            <span key={`add-spec-${index}-${spec}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {spec}
                              <button
                                type="button"
                                onClick={() => handleRemoveSpecialization(index)}
                                className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Add Position
                        </button>
                      </div>
                    </form>

                    {/* Existing Positions List */}
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white mb-3">Existing Positions</h3>
                      <div className="space-y-3">
                        {availablePositions.map((position, index) => (
                          <div key={`${position.id}-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-white">{position.name}</h4>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {position.specializations?.map((spec, specIndex) => (
                                    <span key={`${position.id}-spec-${specIndex}`} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                      {spec}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => handleEditPosition(position)}
                                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePosition(position.id)}
                                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Staff;