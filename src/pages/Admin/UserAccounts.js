import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { FaUser, FaEdit, FaTrash, FaTimes, FaSpinner, FaHome, FaMapMarkerAlt, FaEye, FaEyeSlash, FaExclamationTriangle, FaSave } from 'react-icons/fa';
import { UserService } from '../../services/UserService';

function UserAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [originalUser, setOriginalUser] = useState(null);
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    contactNumber: '',
    role: 'Homeowner',
    status: 'Active',
    isActive: true,
    recordStatus: 'Neutral',
    password: '',
    fcmToken: '',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editFormData, setEditFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Fetch users
  useEffect(() => {
    document.title = "Homeowner Accounts";
    fetchUsers();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showForm || showUserDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm, showUserDetails]);


  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Load assigned lots from subcollection
        try {
          const assignedLotsRef = collection(db, 'users', doc.id, 'assignedLots');
          const assignedLotsSnapshot = await getDocs(assignedLotsRef);
          userData.assignedLots = assignedLotsSnapshot.docs.map(lotDoc => ({
            id: lotDoc.id,
            ...lotDoc.data()
          }));
        } catch (error) {
          // If subcollection doesn't exist or error, assignedLots will be empty array
          userData.assignedLots = [];
        }
        
        return userData;
      }));
      
      setUsers(usersData);
    } catch (error) {
      toast.error('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Check for validation errors
    if (errors.username) {
      toast.error('Please fix the username validation error before submitting.');
      return;
    }
    
    setFormSubmitting(true);
    
    // Generate email from username if not provided
    const userEmail = formData.email || `${formData.username}@example.com`;
    const userPassword = formData.password || formData.username; // Default password is username
    
    // Validate password strength before attempting to create user
    if (userPassword.length < 6) {
      toast.error('Password must be at least 6 characters long. Please enter a stronger password.');
      setFormSubmitting(false);
      return;
    }
    
    try {
      // First create the auth account
      const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
      const uid = userCredential.user.uid;
      
      // Then create the user document in Firestore with the same ID as the Auth UID
      await setDoc(doc(db, 'users', uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: userEmail,
        contactNumber: formData.contactNumber,
        role: 'Homeowner',
        status: 'Active',
        isActive: true,
        recordStatus: 'Neutral',
        password: userPassword,
        fcmToken: '',
        uid: uid,
        created_at: serverTimestamp(),
        last_updated: serverTimestamp()
      });
      
      toast.success('User added successfully');
      setShowForm(false);
      setShowPassword(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Firebase Auth Error:', error);
      
      // Handle different Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password (at least 6 characters).');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/password authentication is not enabled in Firebase. Please contact administrator.');
      } else if (error.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your internet connection and try again.');
      } else {
        toast.error(`Error creating account: ${error.message}`);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setActionLoading(id);
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await UserService.updateUserDetails(id, { 
        status: newStatus,
        isActive: currentStatus !== 'Active'
      });
      toast.success('User status updated');
      
      // Update selectedUser if it's the same user
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser({
          ...selectedUser,
          status: newStatus,
          isActive: currentStatus !== 'Active'
        });
      }
      
      fetchUsers();
    } catch (error) {
      toast.error('Error updating user status: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleSetRecordStatus = async (id, recordStatus) => {
    setActionLoading(id);
    try {
      await UserService.updateUserDetails(id, { 
        recordStatus: recordStatus
      });
      
      // Update selectedUser if it's the same user
      if (selectedUser && selectedUser.id === id) {
        setSelectedUser({
          ...selectedUser,
          recordStatus: recordStatus
        });
      }
      
      // Send notification to user based on record status
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const username = userData.username || 'Homeowner';
        
        // Create notification message based on record status
        let message = '';
        if (recordStatus === 'Good') {
          message = `${username}, your record status has been set to Good. You have full access to all community amenities and services.`;
        } else if (recordStatus === 'Bad') {
          message = `${username}, your record status has been set to Bad. This may restrict your access to some community amenities and services. Please contact the admin office.`;
        } else {
          message = `${username}, your record status has been updated to Neutral.`;
        }
        
        
        
      }
      
      toast.success(`Homeowner record status marked as ${recordStatus}`);
      fetchUsers();
    } catch (error) {
      toast.error(`Error updating homeowner record: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Check if user has assigned lots (new structure)
    if (user.assignedLots && user.assignedLots.length > 0) {
      toast.error('Cannot delete user with assigned properties. Please remove all property assignments first.');
      return;
    }

    // Legacy check for backward compatibility
    if (user.house_no) {
      toast.error('Cannot delete user with assigned property. Please remove the property assignment first.');
      return;
    }

    // If no lots assigned, proceed with normal deletion
    if (window.confirm('Are you sure you want to delete this user?')) {
      setActionLoading(userId);
      try {
        // Delete all owned lots from subcollection first (though this shouldn't exist for new structure)
        const ownedLotsRef = collection(db, 'users', userId, 'ownedLots');
        const ownedLotsSnapshot = await getDocs(ownedLotsRef);

        const deletePromises = ownedLotsSnapshot.docs.map(lotDoc => deleteDoc(lotDoc.ref));
        await Promise.all(deletePromises);

        // Then delete the user document
        await deleteDoc(doc(db, 'users', userId));
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Error deleting user: ' + error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleViewUser = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (!userDoc.exists()) {
        toast.error('User not found');
        return;
      }
      let viewUser = { id: userDoc.id, ...userDoc.data() };

      // Load assigned lots from subcollection
      try {
        const assignedLotsRef = collection(db, 'users', user.id, 'assignedLots');
        const assignedLotsSnapshot = await getDocs(assignedLotsRef);
        viewUser.assignedLots = assignedLotsSnapshot.docs.map(lotDoc => ({
          id: lotDoc.id,
          ...lotDoc.data()
        }));
      } catch (error) {
        // If subcollection doesn't exist or error, assignedLots will be empty array
        viewUser.assignedLots = [];
      }

      setSelectedUser(viewUser);
      setShowUserDetails(true);
    } catch (error) {
      toast.error('Error loading user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setFormSubmitting(true); // Use formSubmitting to show loading on edit button
    
    try {
      setOriginalUser(selectedUser);
      setIsEditingInModal(true);
      setEditFormData({
        firstName: selectedUser.firstName || '',
        lastName: selectedUser.lastName || '',
        username: selectedUser.username || '',
        email: selectedUser.email || '',
        contactNumber: selectedUser.contactNumber || '',
      });
    } catch (error) {
      toast.error('Error loading edit data');
      setIsEditingInModal(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveInlineEdit = async (e) => {
    if (e) e.preventDefault(); // Prevent form submission if called from form
    if (!selectedUser) return;
    setFormSubmitting(true);

    try {
      // Validate phone
      if (editFormData.contactNumber && !/^09\d{9}$/.test(editFormData.contactNumber)) {
        toast.error('Invalid phone: must be 11 digits starting with 09');
        return;
      }

      const updateData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        username: editFormData.username,
        email: editFormData.email,
        contactNumber: editFormData.contactNumber,
      };

      // Use UserService to update user details
      await UserService.updateUserDetails(selectedUser.id, updateData);

      toast.success('Homeowner updated');

      const updated = await getDoc(doc(db, 'users', selectedUser.id));
      if (updated.exists()) {
        let updatedUser = { id: updated.id, ...updated.data() };
        
        // Re-fetch assigned lots from subcollection after update
        try {
          const assignedLotsRef = collection(db, 'users', selectedUser.id, 'assignedLots');
          const assignedLotsSnapshot = await getDocs(assignedLotsRef);
          updatedUser.assignedLots = assignedLotsSnapshot.docs.map(lotDoc => ({
            id: lotDoc.id,
            ...lotDoc.data()
          }));
        } catch (error) {
          // If subcollection doesn't exist or error, assignedLots will be empty array
          updatedUser.assignedLots = [];
        }
        
        setSelectedUser(updatedUser);
      }
      setIsEditingInModal(false);
      await fetchUsers();
    } catch (error) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData({
      ...formData,
      username,
      email: `${username}@example.com`
    });
    
    // Validate username length
    if (username.length > 0 && username.length < 6) {
      setErrors({...errors, username: 'Username must be at least 6 characters long'});
    } else {
      setErrors({...errors, username: ''});
    }
  };

  const handleContactNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters

    // Limit to exactly 11 digits for Philippine numbers
    if (value.length <= 11) {
      setFormData({...formData, contactNumber: value});
    }

    // Optional: Add visual feedback for valid Philippine number format
    // Philippine numbers start with 09 and are exactly 11 digits
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({...formData, email});
    
    // If password is empty and email contains @, set password to username part
    if (!formData.password && email.includes('@')) {
      const usernameFromEmail = email.split('@')[0];
      setFormData(prev => ({...prev, password: usernameFromEmail}));
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      contactNumber: '',
      role: 'Homeowner',
      status: 'Active',
      isActive: true,
      recordStatus: 'Neutral',
      password: '',
      fcmToken: ''
    });
    setErrors({});
  };

  const closeUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUser(null);
    setIsEditingInModal(false);
  };

  const filteredUsers = users.filter(user => 
    ((user.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (user.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get full name function
  const getFullName = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.name) return user.name;
    return user.username || 'Unknown';
  };

  // FIX: Phone validation
  const isValidPhilippineNumber = (num) => /^09\d{9}$/.test(num);

  return (
    <ResponsiveLayout>
      <div className="pt-4 sm:pt-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 border-l-4 border-blue-500">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Homeowner Accounts
          </h1>
          <p className="text-black-600 mt-2 text-sm sm:text-base" style={{ color: 'black' }}>Manage resident accounts and their access permissions</p>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Homeowner
          </button>
        </div>

        {/* Search and filter section */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Search homeowners by name, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
          />
        </div>

        {/* Add User Form Modal */}
        {showForm && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowForm(false);
                setShowPassword(false);
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-4 py-8">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0 z-10">
                  <h2 className="text-xl font-semibold text-gray-800">Create New Homeowner Account</h2>
                  <button 
                    onClick={() => {
                      setShowForm(false);
                      setShowPassword(false);
                    }}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6">
                  <form onSubmit={handleAddUser} className="space-y-5">
                    <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                      <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                        <FaUser className="mr-2" /> Personal Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            placeholder="Juan"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            placeholder="Dela Cruz"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50 rounded-lg p-4 mb-6 border border-indigo-100">
                      <h3 className="font-medium text-indigo-800 mb-2 flex items-center">
                        <i className="fas fa-user-lock mr-2"></i> Account Information
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Username *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">@</span>
                              </div>
                              <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleUsernameChange}
                                className="w-full pl-8 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="juandelacruz"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contact Number
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">+63</span>
                              </div>
                              <input
                                type="tel"
                                value={formData.contactNumber}
                                onChange={handleContactNumberChange}
                                className={`w-full pl-12 pr-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors ${
                                  formData.contactNumber.length === 11 && isValidPhilippineNumber(formData.contactNumber)
                                    ? 'border-green-300 focus:ring-green-500 bg-green-50'
                                    : formData.contactNumber.length > 0 && formData.contactNumber.length !== 11
                                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                    : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder="9123456789"
                                maxLength="11"
                              />
                              {formData.contactNumber.length > 0 && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                  {formData.contactNumber.length === 11 && isValidPhilippineNumber(formData.contactNumber) ? (
                                    <i className="fas fa-check-circle text-green-500"></i>
                                  ) : formData.contactNumber.length !== 11 ? (
                                    <span className="text-xs text-red-500 font-medium">
                                      {11 - formData.contactNumber.length}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Philippine mobile number (11 digits, starts with 09)
                            </p>
                            {formData.contactNumber.length > 0 && formData.contactNumber.length !== 11 && (
                              <p className="text-xs text-red-500 mt-1">
                                Please enter exactly 11 digits
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={handleEmailChange}
                              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                              placeholder={formData.username ? `${formData.username}@example.com` : "email@example.com"}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Auto-generated if left empty. Password will be set to username part if password field is empty.
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full px-4 py-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Leave blank to use username"
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <FaEyeSlash className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                ) : (
                                  <FaEye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Default: username part from email (if email provided) or same as username
                            </p>
                            {errors.username && (
                              <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    

                    
                    <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-200">
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          disabled={formSubmitting}
                          onClick={() => setShowForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors duration-150 ease-in-out shadow-sm"
                        >
                          <i className="fas fa-times mr-2"></i>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="px-5 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors duration-150 ease-in-out shadow-sm"
                        >
                          {formSubmitting ? (
                            <>
                              <FaSpinner className="animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-user-plus mr-2"></i>
                              Create Homeowner Account
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeUserDetails();
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-4 py-8">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                      {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {getFullName(selectedUser)}
                      </h2>
                      <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeUserDetails}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FaTimes className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Basic Information */}
                    <div className="lg:col-span-2 space-y-6">
                      {isEditingInModal ? (
                        <>
                          <form onSubmit={handleSaveInlineEdit}>
                            {/* Personal Information Card */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                  <FaUser className="mr-2 text-blue-500" />
                                  Personal Information
                                </h3>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">First Name</label>
                                      <input
                                        type="text"
                                        value={editFormData.firstName}
                                        onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
                                      <input
                                        type="text"
                                        value={editFormData.lastName}
                                        onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Number</label>
                                      <input
                                        type="text"
                                        value={editFormData.contactNumber}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/\D/g, '');
                                          if (value.length <= 11) {
                                            setEditFormData({...editFormData, contactNumber: value});
                                          }
                                        }}
                                        placeholder="09XXXXXXXXX"
                                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                      <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
                                      <input
                                        type="text"
                                        value={editFormData.username}
                                        onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                                        className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.role || 'Homeowner'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </form>

                          {/* Property Information Card - Read Only */}
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-4 border-b border-gray-100 bg-amber-50 rounded-t-lg">
                              <h3 className="text-lg font-semibold text-amber-800 flex items-center">
                                <FaHome className="mr-2 text-amber-600" />
                                Property Information
                                {selectedUser.assignedLots && selectedUser.assignedLots.length > 0 && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                    {selectedUser.assignedLots.length} lot{selectedUser.assignedLots.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-amber-600 mt-1">Read-only view - property assignments cannot be modified here</p>
                            </div>
                            <div className="p-4">
                              {selectedUser.assignedLots && selectedUser.assignedLots.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedUser.assignedLots.map((lot, index) => (
                                    <div key={lot.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full">
                                          <FaHome className="text-amber-600 text-sm" />
                                        </div>
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-amber-800">#{lot.houseNumber}</span>
                                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                              B{lot.blockNumber}-L{lot.lotNumber}
                                            </span>
                                          </div>
                                          {lot.houseModel && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              {lot.houseModel}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Lot {index + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : selectedUser.house_no ? (
                                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full">
                                      <FaHome className="text-amber-600 text-sm" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-amber-800">#{selectedUser.house_no}</span>
                                        <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                          B{selectedUser.block || Math.floor(selectedUser.house_no / 100)}-L{selectedUser.lot || selectedUser.house_no % 100}
                                        </span>
                                      </div>
                                      {selectedUser.houseModel && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          {selectedUser.houseModel}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <FaHome className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                  <p className="text-gray-500 text-sm">No property assigned</p>
                                  <p className="text-gray-400 text-xs mt-1">This homeowner doesn't own any lots yet</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Personal Information Card */}
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <FaUser className="mr-2 text-blue-500" />
                                Personal Information
                              </h3>
                            </div>
                            <div className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">First Name</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.firstName || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.lastName || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Number</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.contactNumber || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1 break-all">{selectedUser.email || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.username || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.role || 'Homeowner'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Property Information Card */}
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-4 border-b border-gray-100 bg-amber-50 rounded-t-lg">
                              <h3 className="text-lg font-semibold text-amber-800 flex items-center">
                                <FaHome className="mr-2 text-amber-600" />
                                Property Information
                                {selectedUser.assignedLots && selectedUser.assignedLots.length > 0 && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                    {selectedUser.assignedLots.length} lot{selectedUser.assignedLots.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </h3>
                            </div>
                            <div className="p-4">
                              {selectedUser.assignedLots && selectedUser.assignedLots.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedUser.assignedLots.map((lot, index) => (
                                    <div key={lot.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full">
                                          <FaHome className="text-amber-600 text-sm" />
                                        </div>
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-amber-800">#{lot.houseNumber}</span>
                                            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                              B{lot.blockNumber}-L{lot.lotNumber}
                                            </span>
                                          </div>
                                          {lot.houseModel && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              {lot.houseModel}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Lot {index + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : selectedUser.house_no ? (
                                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-full">
                                      <FaHome className="text-amber-600 text-sm" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-amber-800">#{selectedUser.house_no}</span>
                                        <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                          B{selectedUser.block || Math.floor(selectedUser.house_no / 100)}-L{selectedUser.lot || selectedUser.house_no % 100}
                                        </span>
                                      </div>
                                      {selectedUser.houseModel && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          {selectedUser.houseModel}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <FaHome className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                  <p className="text-gray-500 text-sm">No property assigned</p>
                                  <p className="text-gray-400 text-xs mt-1">This homeowner doesn't own any lots yet</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Column - Status Information */}
                    <div className="space-y-6">
                      {/* Account Status Card */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-green-50 rounded-t-lg">
                          <h3 className="text-lg font-semibold text-green-800 flex items-center">
                            <i className="fas fa-circle text-green-500 mr-2"></i>
                            Account Status
                          </h3>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</label>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              selectedUser.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`mr-2 h-2 w-2 rounded-full ${
                                selectedUser.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              {selectedUser.status || 'Active'}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Record Status</label>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              selectedUser.recordStatus === 'Good'
                                ? 'bg-green-100 text-green-800'
                                : selectedUser.recordStatus === 'Bad'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              <i className={`fas mr-2 ${
                                selectedUser.recordStatus === 'Good'
                                  ? 'fa-thumbs-up text-green-600'
                                  : selectedUser.recordStatus === 'Bad'
                                  ? 'fa-thumbs-down text-red-600'
                                  : 'fa-minus text-gray-500'
                              }`}></i>
                              {selectedUser.recordStatus || 'Neutral'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions Card */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-blue-50 rounded-t-lg">
                          <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                            <i className="fas fa-sliders-h text-blue-500 mr-2"></i>
                            Quick Actions
                          </h3>
                        </div>
                        <div className="p-4 space-y-3">
                          <button
                            onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
                            disabled={actionLoading === selectedUser.id}
                            className={`w-full px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center transition-colors duration-200 ${
                              selectedUser.status === 'Active'
                                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {actionLoading === selectedUser.id ? (
                              <FaSpinner className="animate-spin mr-2" />
                            ) : (
                              <i className={`fas fa-toggle-${selectedUser.status === 'Active' ? 'off' : 'on'} mr-2`}></i>
                            )}
                            {selectedUser.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                          </button>
                        </div>
                      </div>

                      {/* Record Status Actions */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-purple-50 rounded-t-lg">
                          <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                            <i className="fas fa-shield-alt text-purple-500 mr-2"></i>
                            Record Status
                          </h3>
                        </div>
                        <div className="p-4 space-y-2">
                          <button
                            onClick={() => handleSetRecordStatus(selectedUser.id, 'Good')}
                            disabled={actionLoading === selectedUser.id}
                            className="w-full px-3 py-2 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors duration-200"
                          >
                            <i className="fas fa-thumbs-up mr-2"></i>
                            Mark Good
                          </button>

                          <button
                            onClick={() => handleSetRecordStatus(selectedUser.id, 'Neutral')}
                            disabled={actionLoading === selectedUser.id}
                            className="w-full px-3 py-2 bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <i className="fas fa-minus mr-2"></i>
                            Mark Neutral
                          </button>

                          <button
                            onClick={() => handleSetRecordStatus(selectedUser.id, 'Bad')}
                            disabled={actionLoading === selectedUser.id}
                            className="w-full px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-medium rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors duration-200"
                          >
                            <i className="fas fa-thumbs-down mr-2"></i>
                            Mark Bad
                          </button>
                        </div>
                      </div>

                      {/* Edit/Save Actions Card */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-indigo-50 rounded-t-lg">
                          <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
                            <FaEdit className="mr-2 text-indigo-600" />
                            Edit Details
                          </h3>
                        </div>
                        <div className="p-4 space-y-3">
                          {!isEditingInModal ? (
                            <button
                              onClick={handleEditUser}
                              disabled={formSubmitting}
                              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 shadow-sm"
                            >
                              {formSubmitting ? (
                                <>
                                  <FaSpinner className="animate-spin mr-2" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <FaEdit className="mr-2" />
                                  Edit Homeowner
                                </>
                              )}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleSaveInlineEdit}
                                disabled={formSubmitting}
                                className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 shadow-sm"
                              >
                                {formSubmitting ? (
                                  <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <FaSave className="mr-2" />
                                    Save Changes
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditFormData(originalUser); // Reset to original data
                                  setIsEditingInModal(false);
                                }}
                                disabled={formSubmitting}
                                className="w-full px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 shadow-sm"
                              >
                                <FaTimes className="mr-2" />
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <i className="fas fa-users text-blue-500 mr-2"></i>
              Homeowner Accounts
              <span className="ml-3 px-3 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </span>
            </h2>
          </div>
        
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-600">Loading homeowner accounts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <FaUser className="text-blue-500" />
                        <span>User</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <FaHome className="text-amber-500" />
                        <span>Property</span>
                      </div>
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-envelope text-blue-500"></i>
                        <span>Email</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-circle text-green-500"></i>
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-shield-alt text-purple-500"></i>
                        <span>Record</span>
                      </div>
                    </th>
                    {/* <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-sliders-h text-gray-500"></i>
                        <span>Actions</span>
                      </div>
                    </th> */}
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FaUser className="h-10 w-10 text-gray-200 mb-2" />
                        <p className="text-gray-500 font-medium">No users found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className={`${actionLoading === user.id ? "bg-gray-50" : ""} 
                        hover:bg-blue-50/30 transition-colors duration-150
                        ${user.status === 'Inactive' ? 'bg-red-50/20' : ''}`}
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleViewUser(user)}
                          className="flex items-center hover:text-primary group"
                        >
                          <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center mr-2 sm:mr-3 shadow-sm group-hover:shadow group-hover:scale-105 transition-all duration-200 text-sm sm:text-base">
                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="ml-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              @{user.username || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getFullName(user)}
                            </div>
                            {user.contactNumber && (
                              <div className="text-xs text-gray-400 flex items-center mt-1">
                                <i className="fas fa-phone-alt mr-1 text-gray-300"></i>
                                {user.contactNumber}
                              </div>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {user.assignedLots && user.assignedLots.length > 0 ? (
                          <div className="flex flex-col">
                            {/* Show only the first lot */}
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs sm:text-sm">
                                #{user.assignedLots[0].houseNumber}
                              </span>
                              <span className="ml-1 text-xs text-gray-500">
                                B{user.assignedLots[0].blockNumber}-L{user.assignedLots[0].lotNumber}
                              </span>
                            </div>
                            {/* Show count badge if more than 1 lot */}
                            {user.assignedLots.length > 1 && (
                              <div className="flex items-center mt-1">
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                  +{user.assignedLots.length - 1} more lot{user.assignedLots.length - 1 !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : user.house_no ? (
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs sm:text-sm">
                                #{user.house_no}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <div className="text-xs bg-blue-50 text-blue-700 px-1 sm:px-2 py-0.5 rounded">
                                B{user.block || Math.floor(user.house_no / 100)}
                              </div>
                              <div className="text-xs bg-green-50 text-green-700 px-1 sm:px-2 py-0.5 rounded">
                                L{user.lot || user.house_no % 100}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-500 italic">No property</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-50 rounded-full p-1 mr-2">
                            <i className="fas fa-envelope text-blue-400 text-xs"></i>
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm text-gray-700">{user.email || 'N/A'}</div>
                            <div className="text-xs text-gray-400">ID: {user.id?.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.status === 'Active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            <span className={`mr-1 h-2 w-2 rounded-full ${
                              user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            {user.status || 'Active'}
                          </span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 sm:px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                          user.recordStatus === 'Good' ? 'bg-green-100 text-green-800 border border-green-200' : 
                          user.recordStatus === 'Bad' ? 'bg-red-100 text-red-800 border border-red-200' : 
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <i className={`fas ${
                            user.recordStatus === 'Good' ? 'fa-thumbs-up mr-1 text-green-600' : 
                            user.recordStatus === 'Bad' ? 'fa-thumbs-down mr-1 text-red-600' : 
                            'fa-minus mr-1 text-gray-500'
                          }`}></i>
                          {user.recordStatus || 'Neutral'}
                        </span>
                      </td>
                      {/* <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {actionLoading === user.id ? (
                          <div className="flex items-center justify-center">
                            <FaSpinner className="animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 sm:gap-2">
                            <div className="flex flex-wrap gap-1">              
                              <button
                                onClick={() => handleToggleStatus(user.id, user.status)}
                                className={`px-1 sm:px-2 py-1 text-xs rounded border flex items-center ${
                                  user.status === 'Active'
                                  ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                  : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'
                                }`}
                              >
                                <i className={`fas fa-toggle-${user.status === 'Active' ? 'off' : 'on'} mr-1`}></i>
                                <span className="hidden sm:inline">{user.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="px-1 sm:px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 flex items-center"
                              >
                                <i className="fas fa-trash-alt mr-1"></i>
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              <button 
                                onClick={() => handleSetRecordStatus(user.id, 'Good')}
                                className="px-1 sm:px-2 py-1 text-xs bg-green-50 text-green-600 rounded border border-green-100 hover:bg-green-100 flex items-center"
                                title="Mark Good Record"
                              >
                                <i className="fas fa-thumbs-up mr-1"></i>
                                <span className="hidden sm:inline">Good</span>
                              </button>
                              
                              <button 
                                onClick={() => handleSetRecordStatus(user.id, 'Neutral')}
                                className="px-1 sm:px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-gray-100 hover:bg-gray-100 flex items-center"
                                title="Reset Record Status"
                              >
                                <i className="fas fa-minus mr-1"></i>
                                <span className="hidden sm:inline">Neutral</span>
                              </button>
                              
                              <button 
                                onClick={() => handleSetRecordStatus(user.id, 'Bad')}
                                className="px-1 sm:px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 flex items-center"
                                title="Mark Bad Record"
                              >
                                <i className="fas fa-thumbs-down mr-1"></i>
                                <span className="hidden sm:inline">Bad</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          )}
          
          {!loading && filteredUsers.length > 0 && (
            <div className="bg-gray-50 px-3 sm:px-6 py-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="text-xs sm:text-sm text-gray-500">
                Showing {filteredUsers.length} homeowner account{filteredUsers.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                <span className="font-medium text-blue-600">
                  {filteredUsers.filter(u => (u.assignedLots && u.assignedLots.length > 0) || u.house_no).length}
                </span> users with property assigned
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}

export default UserAccounts;