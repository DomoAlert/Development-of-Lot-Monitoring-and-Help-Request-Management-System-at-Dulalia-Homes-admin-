import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { UserCircleIcon } from '@heroicons/react/outline';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser, getAuth } from 'firebase/auth';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Modal, Button } from '../../components/AdminUI';
import { FaUser, FaTimes, FaSpinner, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle, FaUserShield } from 'react-icons/fa';

function HeadStaffAccounts() {
  const [headStaff, setHeadStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentHeadStaffId, setCurrentHeadStaffId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  
  // Form data for head staff
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    position: 'Electrician',
    role: 'electrician', // New role field
    department: '', // New department field
    status: 'active'
  });

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Department Management States
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [currentDepartmentId, setCurrentDepartmentId] = useState(null);
  const [departmentFormData, setDepartmentFormData] = useState({
    id: '',
    name: '',
    description: ''
  });

  // Positions Management Modal State
  const [isPositionsManagementModalOpen, setIsPositionsManagementModalOpen] = useState(false);

  // Dynamic departments loaded from Firestore
  const [staffRoles, setStaffRoles] = useState([]);

  useEffect(() => {
    document.title = "Head Staff Accounts";
    fetchHeadStaff();
    fetchDepartments();
  }, []);

  // Fetch departments from Firestore
  const fetchDepartments = async () => {
    try {
      const departmentsSnapshot = await getDocs(collection(db, 'department'));
      const departmentsData = departmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaffRoles(departmentsData);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
      // Fallback to default departments if fetch fails
      setStaffRoles([
        { id: 'electrician', name: 'Electrician', description: 'Electrical maintenance and installations' },
        { id: 'street_sweeper', name: 'Street Sweeper', description: 'Community cleaning and street maintenance' },
        { id: 'plumber', name: 'Plumber', description: 'Plumbing repairs and water system maintenance' }
      ]);
    }
  };

  // Department Management Functions
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    
    if (!departmentFormData.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    
    try {
      await setDoc(doc(db, 'department', departmentFormData.id || departmentFormData.name.toLowerCase().replace(/\s+/g, '_')), {
        id: departmentFormData.id || departmentFormData.name.toLowerCase().replace(/\s+/g, '_'),
        name: departmentFormData.name,
        description: departmentFormData.description
      });
      
      toast.success('Department added successfully');
      fetchDepartments();
      closeDepartmentForm();
      setIsPositionsManagementModalOpen(true);
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error('Failed to add department');
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    
    if (!departmentFormData.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    
    try {
      const departmentRef = doc(db, 'department', currentDepartmentId);
      await updateDoc(departmentRef, {
        name: departmentFormData.name,
        description: departmentFormData.description
      });
      
      toast.success('Department updated successfully');
      fetchDepartments();
      closeDepartmentForm();
      setIsPositionsManagementModalOpen(true);
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error('Failed to update department');
    }
  };

  const handleEditDepartment = (department) => {
    setDepartmentFormData({
      id: department.id,
      name: department.name,
      description: department.description || ''
    });
    setCurrentDepartmentId(department.id);
    setIsEditingDepartment(true);
    setShowDepartmentForm(true);
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (window.confirm('Are you sure you want to delete this department? This may affect existing head staff assignments.')) {
      try {
        await deleteDoc(doc(db, 'department', departmentId));
        toast.success('Department deleted successfully');
        fetchDepartments();
      } catch (error) {
        console.error('Error deleting department:', error);
        toast.error('Failed to delete department');
      }
    }
  };

  const closeDepartmentForm = () => {
    setShowDepartmentForm(false);
    setIsEditingDepartment(false);
    setCurrentDepartmentId(null);
    setDepartmentFormData({
      id: '',
      name: '',
      description: ''
    });
    setIsPositionsManagementModalOpen(true);
  };

  const fetchHeadStaff = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'head_staff'));
      const staffData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHeadStaff(staffData);
    } catch (error) {
      toast.error('Error fetching head staff: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      // Auto-generate email based on name
      const emailPrefix = value.toLowerCase()
        .replace(/\s+/g, '.') // Replace spaces with dots
        .replace(/[^a-z0-9.]/g, '') // Remove special characters except dots
        .replace(/\.+/g, '.') // Replace multiple dots with single dot
        .replace(/^\./, '') // Remove leading dot
        .replace(/\.$/, ''); // Remove trailing dot
      
      const email = emailPrefix ? `${emailPrefix}@headstaff.com` : '';
      
      setFormData({
        ...formData,
        [name]: value,
        email: email
      });
    } else if (name === 'role') {
      // Update position based on selected role
      const selectedRole = staffRoles.find(role => role.id === value);
      setFormData({
        ...formData,
        [name]: value,
        position: selectedRole ? selectedRole.name : 'Head Staff',
        department: selectedRole ? selectedRole.description : ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle phone number input - only allow numbers and limit to 10 digits
  const handlePhoneNumberChange = (e) => {
    const { value } = e.target;
    // Only allow digits and limit to 10 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 10);

    setFormData({
      ...formData,
      phone: numericValue
    });
  };

  // Handle status toggle
  const handleStatusToggle = (e) => {
    setFormData({
      ...formData,
      status: e.target.checked ? 'active' : 'inactive'
    });
  };

  // Form validation
  const validateForm = () => {
    let isValid = true;
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      isValid = false;
    }
    
    if (!formData.email.trim()) {
      toast.error('Email is required');
      isValid = false;
    } else if (!/^\S+@headstaff\.com$/.test(formData.email)) {
      toast.error('Email must use @headstaff.com domain');
      isValid = false;
    }
    
    if (!formData.role || formData.role === '') {
      toast.error('Please select a role/department');
      isValid = false;
    }
    
    if (!isEditing && !formData.password.trim()) {
      toast.error('Password is required');
      isValid = false;
    } else if (!isEditing && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      isValid = false;
    }
    
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      isValid = false;
    } else if (!validatePhoneNumber(formData.phone)) {
      toast.error('Please enter a valid phone number');
      isValid = false;
    }
    
    return isValid;
  };

  // Validate phone number format (10-digit Philippine mobile number)
  const validatePhoneNumber = (phone) => {
    // Philippine mobile numbers: exactly 10 digits starting with 9
    const pattern = /^9\d{9}$/;
    return pattern.test(phone);
  };

  // Handle add head staff submission
  const handleAddHeadStaff = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormSubmitting(true);
    const auth = getAuth();
    
    try {
      // Create user in Firebase Authentication
      const authResult = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = authResult.user.uid;
      
      // Add to Firestore collection
      await setDoc(doc(db, 'head_staff', uid), {
        uid: uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        role: formData.role,
        department: formData.department,
        status: formData.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Head Staff account created successfully!');
      setShowForm(false);
      resetForm();
      fetchHeadStaff();
    } catch (error) {
      console.error('Error creating head staff account:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email address is already in use. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password.');
      } else {
        toast.error('Error creating head staff account: ' + error.message);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle update head staff submission
  const handleUpdateHeadStaff = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormSubmitting(true);
    
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'head_staff', currentHeadStaffId), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        role: formData.role,
        department: formData.department,
        status: formData.status,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Head Staff account updated successfully!');
      setShowForm(false);
      setIsEditing(false);
      resetForm();
      fetchHeadStaff();
    } catch (error) {
      toast.error('Error updating head staff account: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEditClick = async (id) => {
    try {
      const docRef = doc(db, 'head_staff', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '', // No password for editing
          position: data.position || 'Electrician',
          role: data.role || 'electrician',
          department: data.department || '',
          status: data.status || 'active'
        });
        setCurrentHeadStaffId(id);
        setIsEditing(true);
        setShowForm(true);
      } else {
        toast.error('Head Staff account not found');
      }
    } catch (error) {
      toast.error('Error loading head staff details: ' + error.message);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (staff) => {
    setStaffToDelete(staff);
    setConfirmDelete(true);
  };

  // Confirm deletion of head staff
  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'head_staff', staffToDelete.id));
      
      // Attempt to delete the auth user if it exists
      try {
        // Note: Deleting auth users from client-side is usually restricted
        // You may need a cloud function or server-side code for this in production
        const auth = getAuth();
        await deleteUser(staffToDelete.uid);
      } catch (authError) {
        console.error('Could not delete auth user:', authError);
        // Continue since we still want to remove from Firestore
      }
      
      toast.success('Head Staff account deleted successfully!');
      setConfirmDelete(false);
      setStaffToDelete(null);
      fetchHeadStaff();
    } catch (error) {
      toast.error('Error deleting head staff account: ' + error.message);
    }
  };

  // Cancel form
  const handleCancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    resetForm();
    setShowPassword(false);
  };

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      position: 'Electrician',
      role: 'electrician',
      department: '',
      status: 'active'
    });
    setCurrentHeadStaffId(null);
    setShowPassword(false);
  };

  // Filter head staff based on search query and status filter
  const filteredHeadStaff = headStaff.filter(staff => {
    const matchesSearch = staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         staff.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === '' || staff.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <ResponsiveLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Head Staff Accounts
          </h1>
          <p className="text-gray-600 text-gray-700 mt-2">Manage head staff accounts and their information</p>
        </div>

        {/* Add Button Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setShowForm(true);
                resetForm();
              }}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Head Staff
            </button>
            <button
              type="button"
              onClick={() => setIsPositionsManagementModalOpen(true)}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Manage Departments
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name or email..."
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 px-4 py-2 rounded-md border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100 border-gray-200">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 from-blue-50 to-indigo-50 border-b border-gray-100 border-gray-300">
            <h2 className="text-lg font-semibold text-gray-800 text-black flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Head Staff Accounts
              <span className="ml-3 px-3 py-0.5 text-xs rounded-full bg-blue-100 bg-blue-100 text-blue-600 text-blue-700">
                {filteredHeadStaff.length} {filteredHeadStaff.length === 1 ? 'staff' : 'staff'}
              </span>
            </h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-600 text-gray-700">Loading head staff accounts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 divide-gray-200 border-collapse">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 from-blue-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Staff Details</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Email</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Department</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Phone</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 text-gray-700 uppercase tracking-wider">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white bg-white divide-y divide-gray-200 divide-gray-200">
                  {filteredHeadStaff.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <h3 className="text-lg font-medium text-gray-900 text-black mb-2">No head staff accounts found</h3>
                          <p className="text-gray-500 text-gray-600 mb-4">Get started by creating your first head staff account.</p>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setShowForm(true);
                              resetForm();
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Add First Head Staff
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHeadStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {staff.name ? staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'HS'}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 text-black">
                                {staff.name}
                              </div>
                              <div className="text-sm text-gray-500 text-gray-600">
                                {staff.position}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-black">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 text-black">
                            {staff.position || 'Staff'}
                          </div>
                          <div className="text-xs text-gray-500 text-gray-600">
                            {staff.department || staffRoles.find(r => r.id === staff.role)?.description || 'Community maintenance staff'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-black">
                          {staff.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              staff.status === 'active'
                                ? 'bg-green-100 bg-green-100 text-green-800 text-green-800'
                                : 'bg-red-100 bg-red-100 text-red-800 text-red-800'
                            }`}
                          >
                            {staff.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEditClick(staff.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              title="Edit staff account"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(staff)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                              title="Delete staff account"
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

        {/* Add/Edit Head Staff Form Modal */}
        {showForm && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelForm();
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4 py-4 sm:py-8">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 sm:px-8 sm:py-6 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white bg-opacity-20 p-3 rounded-full">
                        <FaUserShield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{isEditing ? 'Edit Head Staff' : 'Add New Head Staff'}</h2>
                        <p className="text-blue-100 text-sm sm:text-base">Manage head staff account information</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelForm}
                      className="text-white hover:text-blue-100 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6 sm:p-8">
                  <form onSubmit={isEditing ? handleUpdateHeadStaff : handleAddHeadStaff} className="space-y-8">
                    {/* Personal Information Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                        <div className="bg-blue-500 p-2 rounded-lg mr-3">
                          <FaUser className="h-5 w-5 text-white" />
                        </div>
                        Personal Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                            placeholder="Enter head staff's full name"
                          />
                          {!isEditing && (
                            <p className="mt-2 text-xs text-gray-500 flex items-center">
                              <i className="fas fa-info-circle mr-1 text-blue-500"></i>
                              Email will be auto-generated based on name
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account Information Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                        <div className="bg-purple-500 p-2 rounded-lg mr-3">
                          <i className="fas fa-user-lock h-5 w-5 text-white"></i>
                        </div>
                        Account Credentials
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role/Department *
                          </label>
                          <select
                            value={formData.role}
                            onChange={handleInputChange}
                            name="role"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                            required
                          >
                            <option value="">Select a role/department...</option>
                            {staffRoles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          {formData.role && (
                            <p className="mt-2 text-xs text-purple-600 flex items-center">
                              <i className="fas fa-info-circle mr-1"></i>
                              {staffRoles.find(r => r.id === formData.role)?.description}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              name="email"
                              disabled={isEditing}
                              className={`w-full px-4 py-3 pr-32 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                                isEditing
                                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                  : 'border-gray-300 focus:ring-purple-500'
                              }`}
                              placeholder={isEditing ? formData.email : "Auto-generated from name"}
                              required
                              readOnly={!isEditing}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">
                                @headstaff.com
                              </span>
                            </div>
                          </div>
                          {isEditing && (
                            <p className="mt-2 text-xs text-gray-500 flex items-center">
                              <i className="fas fa-lock mr-1 text-gray-400"></i>
                              Email cannot be changed after account creation
                            </p>
                          )}
                        </div>

                        {!isEditing && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Password *
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                name="password"
                                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                                placeholder="Create a strong password"
                                minLength="6"
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <FaEyeSlash className="h-5 w-5" />
                                ) : (
                                  <FaEye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 flex items-center">
                              <i className="fas fa-shield-alt mr-1 text-green-500"></i>
                              Must be at least 6 characters
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Information Card */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                        <div className="bg-green-500 p-2 rounded-lg mr-3">
                          <i className="fas fa-phone-alt h-5 w-5 text-white"></i>
                        </div>
                        Contact Information
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Number *
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={handlePhoneNumberChange}
                            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                              formData.phone && !validatePhoneNumber(formData.phone)
                                ? 'border-red-300 focus:ring-red-500'
                                : formData.phone && validatePhoneNumber(formData.phone)
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-green-500'
                            }`}
                            placeholder="9123456789"
                            maxLength="10"
                            required
                          />
                          {formData.phone && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {validatePhoneNumber(formData.phone) ? (
                                <FaCheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <FaExclamationCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <p className={`text-sm ${
                            formData.phone && !validatePhoneNumber(formData.phone)
                              ? 'text-red-600'
                              : formData.phone && validatePhoneNumber(formData.phone)
                              ? 'text-green-600'
                              : 'text-gray-500'
                          }`}>
                            {formData.phone && !validatePhoneNumber(formData.phone)
                              ? 'Please enter a valid 10-digit Philippine mobile number'
                              : formData.phone && validatePhoneNumber(formData.phone)
                              ? '✓ Valid Philippine mobile number'
                              : 'Enter 10-digit mobile number (e.g., 9123456789)'}
                          </p>
                          <span className="text-sm text-gray-400 font-medium">
                            {formData.phone?.length || 0}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Settings Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                        <div className="bg-gray-500 p-2 rounded-lg mr-3">
                          <i className="fas fa-cog h-5 w-5 text-white"></i>
                        </div>
                        Account Status
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center p-4 bg-white rounded-lg border border-gray-200">
                          <input
                            id="status"
                            name="status"
                            type="checkbox"
                            checked={formData.status === 'active'}
                            onChange={handleStatusToggle}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="status" className="ml-3 block text-sm font-medium text-gray-700">
                            <span className="flex items-center">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                formData.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              {formData.status === 'active' ? 'Active Account' : 'Inactive Account'}
                            </span>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center">
                          <i className="fas fa-info-circle mr-1 text-blue-500"></i>
                          {formData.status === 'active'
                            ? 'Active accounts can access the system and perform their duties'
                            : 'Inactive accounts cannot log in or access system features'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        disabled={formSubmitting}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all font-medium shadow-sm"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSubmitting}
                        className={`px-6 py-3 rounded-lg text-white font-medium shadow-sm transition-all flex items-center justify-center ${
                          formSubmitting
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        }`}
                      >
                        {formSubmitting ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            {isEditing ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <FaUserShield className="mr-2" />
                            {isEditing ? 'Update Head Staff' : 'Add New Head Staff'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Confirm Delete Modal */}
        {confirmDelete && staffToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                aria-hidden="true"
                onClick={() => setConfirmDelete(false)}
              ></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white bg-white rounded-lg px-6 pt-5 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 text-black mb-2" id="modal-title">
                      Delete Head Staff Account
                    </h3>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 text-gray-600">
                        Are you sure you want to delete <strong className="text-gray-900 text-black">{staffToDelete.name}'s</strong> account? 
                        This action cannot be undone and will permanently remove their access to the system.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 border-gray-300 rounded-md text-gray-700 text-gray-700 bg-white bg-white hover:bg-gray-50 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    onClick={() => {
                      setConfirmDelete(false);
                      setStaffToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    onClick={handleConfirmDelete}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Positions Management Modal */}
        <Modal
          isOpen={isPositionsManagementModalOpen}
          onClose={() => setIsPositionsManagementModalOpen(false)}
          title="Manage Positions & Specializations"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Positions & Specializations</h3>
                <p className="text-sm text-gray-500">Manage the different positions and specializations for head staff</p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setIsPositionsManagementModalOpen(false);
                  setShowDepartmentForm(true);
                }}
                size="sm"
              >
                + Add Position
              </Button>
            </div>

            {staffRoles.length === 0 ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium text-gray-500 mb-2">No positions added yet</p>
                <p className="text-sm text-gray-400 mb-4">Get started by adding your first position</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsPositionsManagementModalOpen(false);
                    setShowDepartmentForm(true);
                  }}
                >
                  Add First Position
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position/Specialization
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffRoles.map((department) => (
                      <tr key={department.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center mb-2">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{department.name}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => {
                                  setIsPositionsManagementModalOpen(false);
                                  handleEditDepartment(department);
                                }}
                                className="text-xs px-2 py-1 h-7"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="xs"
                                onClick={() => handleDeleteDepartment(department.id)}
                                className="text-xs px-2 py-1 h-7"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {department.description || 'No description provided'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>

        {/* Department Management Modal */}
        {showDepartmentForm && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDepartmentForm(false);
                setIsEditingDepartment(false);
                setCurrentDepartmentId(null);
                setDepartmentFormData({
                  id: '',
                  name: '',
                  description: ''
                });
              }
            }}
          >
            <div className="bg-white bg-white rounded-lg shadow-xl w-full max-w-md my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 text-black">
                  {isEditingDepartment ? 'Edit Department' : 'Manage Positions & Specializations'}
                </h2>
                <button 
                  onClick={closeDepartmentForm}
                  className="text-gray-500 hover:text-gray-700 text-gray-600 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 max-h-[80vh] overflow-y-auto">
                {isEditingDepartment ? (
                  // Edit Department Form
                  <form onSubmit={handleUpdateDepartment} className="space-y-4 max-w-md mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                        Department Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={departmentFormData.name}
                        onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Electrician"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={departmentFormData.description}
                        onChange={(e) => setDepartmentFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                        className="w-full px-4 py-2 rounded-md border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Department description..."
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 border-gray-200">
                      <button
                        type="button"
                        onClick={closeDepartmentForm}
                        className="px-4 py-2 border border-gray-300 border-gray-300 rounded-md text-gray-700 text-gray-700 bg-white bg-white hover:bg-gray-50 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Update Department
                      </button>
                    </div>
                  </form>
                ) : (
                  // Add New Department Form - Single Column Layout
                  <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-semibold text-gray-800 text-black border-b border-gray-200 border-gray-200 pb-2 mb-4">
                      Add New Position/Specialization
                    </h3>
                    <form onSubmit={handleAddDepartment} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                          Position Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={departmentFormData.name}
                          onChange={(e) => setDepartmentFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 rounded-md border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Electrician"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                          Description/Specialization
                        </label>
                        <textarea
                          value={departmentFormData.description}
                          onChange={(e) => setDepartmentFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows="3"
                          className="w-full px-4 py-2 rounded-md border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe the role and responsibilities..."
                        />
                      </div>
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 border-gray-200">
                        <button
                          type="button"
                          onClick={closeDepartmentForm}
                          className="px-4 py-2 border border-gray-300 border-gray-300 rounded-md text-gray-700 text-gray-700 bg-white bg-white hover:bg-gray-50 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          Add Position
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}

export default HeadStaffAccounts;
