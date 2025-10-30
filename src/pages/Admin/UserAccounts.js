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
  const [availableLots, setAvailableLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLots, setLoadingLots] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [propertyFormData, setPropertyFormData] = useState({
    selectedLotId: '',
    houseModel: 'Standard'
  });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    contactNumber: '',
    house_no: null,
    block: '',
    lot: '',
    role: 'Homeowner',
    status: 'Active',
    isActive: true,
    recordStatus: 'Neutral',
    password: '',
    fcmToken: '',
    houseModel: 'Standard'
  });
  
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users and available lots
  useEffect(() => {
    document.title = "Homeowner Accounts";
    fetchUsers();
    fetchAvailableLots();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showForm || showUserDetails || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm, showUserDetails, showDeleteModal]);

  // Blocks configuration - how many lots are in each block (same as in LotStatus.jsx)
  const blockConfig = {
    1: 20, // Block 1 has 20 lots
    2: 25, // Block 2 has 25 lots
    3: 15, // Block 3 has 15 lots
    4: 22, // Block 4 has 22 lots
    5: 18  // Block 5 has 18 lots
  };
  
  // Fetch all available lots (vacant lots)
  const fetchAvailableLots = async () => {
    try {
      setLoadingLots(true);
      
      // Create a structured array of all possible lots based on block configuration
      const allLots = [];
      
      // Populate with empty lot data for all blocks and lots
      Object.keys(blockConfig).forEach(blockNum => {
        for (let i = 1; i <= blockConfig[blockNum]; i++) {
          // Create a unique lot identifier (Block-LotNumber)
          const blockLotId = `B${blockNum}-L${i.toString().padStart(2, '0')}`;
          
          // Calculate house number as BlockNumber * 100 + LotNumber
          const houseNo = (parseInt(blockNum) * 100) + i;
          
          allLots.push({
            id: blockLotId,
            block: parseInt(blockNum),
            lot: i,
            house_no: houseNo,
            status: 'Vacant',
            house_owner: null,
            owner_id: null,
            houseModel: 'Standard',
            created_at: null,
            displayName: `Block ${blockNum}, Lot ${i} (House #${houseNo})`
          });
        }
      });
      
      // First check the dedicated lots collection in Firebase
      try {
        const lotsQuery = query(collection(db, 'lots'));
        const lotsSnapshot = await getDocs(lotsQuery);
        
        // Update lots with information from lots collection
        lotsSnapshot.docs.forEach(doc => {
          const lotData = doc.data();
          const houseNo = lotData.house_no;
          
          if (houseNo) {
            const lotIndex = allLots.findIndex(l => l.house_no === houseNo);
            if (lotIndex !== -1) {
              allLots[lotIndex] = {
                ...allLots[lotIndex],
                status: lotData.status || 'Vacant',
                house_owner: lotData.house_owner || null,
                owner_id: lotData.owner_id || null,
                houseModel: lotData.houseModel || 'Standard',
                description: lotData.description,
                price: lotData.price,
                size: lotData.size,
                created_at: lotData.created_at
              };
            }
          }
        });
      } catch (error) {
        console.log('Checking lots collection:', error);
      }
      
      // Also fetch users with house numbers to ensure data consistency
      const usersQuery = query(collection(db, 'users'));
      const querySnapshot = await getDocs(usersQuery);
      
      // Create a map of house numbers to user data for quick lookup
      const userMap = {};
      querySnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.house_no) {
          userMap[userData.house_no] = {
            owner_id: doc.id,
            house_owner: userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
            houseModel: userData.houseModel || 'Standard'
          };
        }
      });
      
      // Update lots with user data if needed (this ensures data consistency)
      for (let lot of allLots) {
        if (userMap[lot.house_no]) {
          // If a user has this house number but the lot isn't already marked as occupied
          if (lot.status !== 'Occupied') {
            lot.house_owner = userMap[lot.house_no].house_owner;
            lot.owner_id = userMap[lot.house_no].owner_id;
            lot.status = 'Occupied';
            lot.houseModel = userMap[lot.house_no].houseModel;
          }
        }
      }
      
      // Filter out lots that are already occupied, reserved or for sale
      const vacantLots = allLots.filter(lot => 
        lot.status === 'Vacant' || !lot.status
      );
      
      // Add displayName property to each lot for the dropdown
      vacantLots.forEach(lot => {
        lot.displayName = `Block ${lot.block}, Lot ${lot.lot} (House #${lot.house_no})`;
      });
      
      setAvailableLots(vacantLots);
    } catch (error) {
      console.error("Error fetching available lots:", error);
      toast.error('Error fetching available lots');
    } finally {
      setLoadingLots(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
    setFormSubmitting(true);
    
    if (!formData.house_no && selectedLot) {
      setFormData({
        ...formData, 
        house_no: selectedLot.house_no,
        block: selectedLot.block,
        lot: selectedLot.lot
      });
    }
    
    if (!formData.house_no && !selectedLot) {
      toast.error('Please select a lot for this homeowner');
      setFormSubmitting(false);
      return;
    }
    
    // Generate email from username if not provided
    const userEmail = formData.email || `${formData.username}@example.com`;
    const userPassword = formData.password || formData.username; // Default password is username
    
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
        house_no: selectedLot.house_no,
        block: selectedLot.block,
        lot: selectedLot.lot,
        role: 'Homeowner',
        status: 'Active',
        isActive: true,
        recordStatus: 'Neutral',
        password: userPassword,
        fcmToken: '',
        houseModel: formData.houseModel || 'Standard',
        uid: uid,
        created_at: serverTimestamp(),
        last_updated: serverTimestamp()
      });
      
      // Also update the lot in the 'lots' collection to mark it as occupied
      try {
        const lotDocRef = doc(db, 'lots', selectedLot.id);
        await setDoc(lotDocRef, {
          house_no: selectedLot.house_no,
          block: selectedLot.block,
          lot: selectedLot.lot,
          status: 'Occupied',
          owner_id: uid,
          house_owner: formData.username || `${formData.firstName} ${formData.lastName}`.trim(),
          houseModel: formData.houseModel || 'Standard',
          last_updated: serverTimestamp(),
          created_at: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating lot status:', error);
        // Continue even if this fails, as we've updated the user
      }
      
      toast.success('User added successfully and lot assigned');
      setShowForm(false);
      setShowPassword(false);
      resetForm();
      fetchUsers();
      fetchAvailableLots(); // Refresh available lots
    } catch (error) {
      // Handle different Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password.');
      } else {
        toast.error('Error adding user: ' + error.message);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'users', id), { 
        status: currentStatus === 'Active' ? 'Inactive' : 'Active',
        isActive: currentStatus !== 'Active',
        last_updated: serverTimestamp()
      });
      toast.success('User status updated');
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
      await updateDoc(doc(db, 'users', id), { 
        recordStatus: recordStatus,
        last_updated: serverTimestamp()
      });
      
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

    // Check if user has a lot assigned
    if (user.house_no) {
      setUserToDelete(user);
      setShowDeleteModal(true);
      return;
    }

    // If no lot assigned, proceed with normal deletion
    if (window.confirm('Are you sure you want to delete this user?')) {
      setActionLoading(userId);
      try {
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

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.id);
    try {
      // Delete user from Firestore
      await deleteDoc(doc(db, 'users', userToDelete.id));

      // Mark the lot as available
      if (userToDelete.house_no) {
        const blockNum = Math.floor(userToDelete.house_no / 100);
        const lotNum = userToDelete.house_no % 100;
        const lotId = `B${blockNum}-L${lotNum.toString().padStart(2, '0')}`;

        await setDoc(doc(db, 'lots', lotId), {
          house_no: userToDelete.house_no,
          block: blockNum,
          lot: lotNum,
          status: 'Vacant',
          owner_id: null,
          house_owner: null,
          last_updated: serverTimestamp()
        }, { merge: true });
      }

      toast.success('User deleted successfully and lot marked as available');
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
      fetchAvailableLots(); // Refresh available lots
    } catch (error) {
      toast.error('Error deleting user: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setPropertyFormData({
      selectedLotId: '',
      houseModel: user.houseModel || 'Standard'
    });
    setShowUserDetails(true);
    setIsEditing(false);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    
    // Make sure we have the latest lots data
    fetchAvailableLots();
    
    setFormData({
      firstName: selectedUser.firstName || '',
      lastName: selectedUser.lastName || '',
      username: selectedUser.username || '',
      email: selectedUser.email || '',
      contactNumber: selectedUser.contactNumber || '',
      house_no: selectedUser.house_no || null,
      block: selectedUser.block || '',
      lot: selectedUser.lot || '',
      role: selectedUser.role || 'Homeowner',
      status: selectedUser.status || 'Active',
      isActive: selectedUser.isActive !== undefined ? selectedUser.isActive : true,
      password: selectedUser.password || '',
      fcmToken: selectedUser.fcmToken || '',
      houseModel: selectedUser.houseModel || 'Standard'
    });
    
    setIsEditing(true);
  };

  const handleUpdateProperty = async (userId, newLotId, newHouseModel) => {
    setFormSubmitting(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        toast.error('User not found');
        return;
      }

      const userData = userDoc.data();
      const batch = db.batch();
      let finalLot = null;

      // Handle lot reassignment if a new lot is selected
      if (newLotId) {
        const lotDoc = await getDoc(doc(db, 'lots', newLotId));
        if (!lotDoc.exists()) {
          toast.error('Selected lot not found');
          return;
        }

        finalLot = { id: lotDoc.id, ...lotDoc.data() };

        // Mark old lot as vacant if user had one
        if (userData.house_no) {
          const oldBlockNum = Math.floor(userData.house_no / 100);
          const oldLotNum = userData.house_no % 100;
          const oldLotId = `B${oldBlockNum}-L${oldLotNum.toString().padStart(2, '0')}`;

          batch.set(doc(db, 'lots', oldLotId), {
            house_no: userData.house_no,
            block: oldBlockNum,
            lot: oldLotNum,
            status: 'Vacant',
            owner_id: null,
            house_owner: null,
            last_updated: serverTimestamp()
          }, { merge: true });
        }

        // Mark new lot as occupied
        batch.set(doc(db, 'lots', newLotId), {
          house_no: finalLot.house_no,
          block: finalLot.block,
          lot: finalLot.lot,
          status: 'Occupied',
          owner_id: userId,
          house_owner: userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
          houseModel: newHouseModel,
          last_updated: serverTimestamp()
        }, { merge: true });
      }

      // Update user document
      const updateData = {
        houseModel: newHouseModel,
        last_updated: serverTimestamp()
      };

      if (finalLot) {
        updateData.house_no = finalLot.house_no;
        updateData.block = finalLot.block;
        updateData.lot = finalLot.lot;
      }

      batch.update(doc(db, 'users', userId), updateData);

      await batch.commit();

      toast.success('Property assignment updated successfully');
      
      // Refresh data
      fetchUsers();
      fetchAvailableLots();
      
      // Reset form data
      setPropertyFormData({
        selectedLotId: '',
        houseModel: newHouseModel
      });
      
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error('Error updating property assignment: ' + error.message);
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
  };

  const handleContactNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters

    // Limit to exactly 11 digits for Philippine numbers
    if (value.length <= 10) {
      setFormData({...formData, contactNumber: value});
    }

    // Optional: Add visual feedback for valid Philippine number format
    // Philippine numbers start with 09 and are exactly 11 digits
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      contactNumber: '',
      house_no: null,
      block: '',
      lot: '',
      role: 'Homeowner',
      status: 'Active',
      isActive: true,
      recordStatus: 'Neutral',
      password: '',
      fcmToken: '',
      houseModel: 'Standard'
    });
    setSelectedLot(null);
  };

  const closeUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUser(null);
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

  // Validate Philippine phone number (exactly 11 digits, starts with 09)
  const isValidPhilippineNumber = (number) => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(number);
  };

  return (
    <ResponsiveLayout>
      <div className="pt-4 sm:pt-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 border-l-4 border-blue-500">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            User Accounts
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
            Add New User
          </button>
        </div>

        {/* Search and filter section */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Search users by name, username or email..."
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
                            placeholder="John"
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
                            placeholder="Doe"
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
                                placeholder="johndoe"
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
                                  formData.contactNumber.length === 10 && isValidPhilippineNumber(formData.contactNumber)
                                    ? 'border-green-300 focus:ring-green-500 bg-green-50'
                                    : formData.contactNumber.length > 0 && formData.contactNumber.length !== 10
                                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                    : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder="9123456789"
                                maxLength="11"
                              />
                              {formData.contactNumber.length > 0 && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                  {formData.contactNumber.length === 10 && isValidPhilippineNumber(formData.contactNumber) ? (
                                    <i className="fas fa-check-circle text-green-500"></i>
                                  ) : formData.contactNumber.length !== 10 ? (
                                    <span className="text-xs text-red-500 font-medium">
                                      {10 - formData.contactNumber.length}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Philippine mobile number (10 digits, starts with 09)
                            </p>
                            {formData.contactNumber.length > 0 && formData.contactNumber.length !== 10 && (
                              <p className="text-xs text-red-500 mt-1">
                                Please enter exactly 10 digits
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
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                              placeholder={formData.username ? `${formData.username}@example.com` : "email@example.com"}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Auto-generated if left empty
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
                              Default: same as username
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 rounded-lg p-4 mb-6 border border-amber-100">
                      <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                        <FaMapMarkerAlt className="mr-2" /> Property Assignment
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Available Lot *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaMapMarkerAlt className="text-amber-600" />
                              </div>
                              {loadingLots ? (
                                <div className="w-full px-4 py-2 pl-10 rounded-md border border-gray-300 bg-gray-50">
                                  <FaSpinner className="animate-spin inline mr-2 text-gray-500" />
                                  Loading available lots...
                                </div>
                              ) : (
                                <select
                                  value={selectedLot ? selectedLot.id : ""}
                                  onChange={(e) => {
                                    const selected = availableLots.find(lot => lot.id === e.target.value);
                                    setSelectedLot(selected);
                                    if (selected) {
                                      setFormData({
                                        ...formData,
                                        house_no: selected.house_no,
                                        block: selected.block,
                                        lot: selected.lot
                                      });
                                    }
                                  }}
                                  className="w-full px-4 py-2 pl-10 rounded-md border border-gray-300 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                                  required
                                >
                                  <option value="">-- Select a lot --</option>
                                  {availableLots.map(lot => (
                                    <option key={lot.id} value={lot.id}>
                                      {lot.displayName}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Only showing vacant lots that are available for assignment
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              House Model
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="fas fa-home text-amber-600"></i>
                              </div>
                              <select
                                value={formData.houseModel}
                                onChange={(e) => setFormData({...formData, houseModel: e.target.value})}
                                className="w-full px-4 py-2 pl-10 rounded-md border border-gray-300 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                              >
                                <option value="Standard">Standard Model</option>
                                <option value="Premium">Premium Model</option>
                                <option value="Deluxe">Deluxe Model</option>
                                <option value="Executive">Executive Model</option>
                                <option value="Custom">Custom Build</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        {selectedLot && (
                          <div className="col-span-2 mt-3 p-3 bg-white rounded-lg border border-amber-200">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-amber-700">Selected Lot Details:</span>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                #{selectedLot.house_no}
                              </span>
                            </div>
                            <div className="mt-2 text-sm">
                              <div className="flex items-center text-gray-700">
                                <FaHome className="mr-1 text-amber-500" />
                                Block {selectedLot.block}, Lot {selectedLot.lot}
                              </div>
                            </div>
                          </div>
                        )}
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
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                                <p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.role || 'Homeowner'}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</label>
                                <p className="text-xs font-mono text-gray-600 mt-1 bg-gray-100 px-2 py-1 rounded">{selectedUser.id?.substring(0, 12)}...</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Property Assignment Card */}
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="p-4 border-b border-gray-100 bg-amber-50 rounded-t-lg">
                          <h3 className="text-lg font-semibold text-amber-800 flex items-center">
                            <FaHome className="mr-2 text-amber-600" />
                            Property Assignment
                          </h3>
                        </div>
                        <div className="p-4">
                          {/* Current Property Display */}
                          <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Current Assignment</h4>
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <FaHome className="text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-amber-900">
                                      {selectedUser.house_no ? `House #${selectedUser.house_no}` : 'No Property Assigned'}
                                    </p>
                                    {selectedUser.house_no && (
                                      <p className="text-sm text-amber-700">
                                        Block {selectedUser.block || Math.floor(selectedUser.house_no / 100)}, Lot {selectedUser.lot || (selectedUser.house_no % 100)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    {selectedUser.houseModel || 'Standard'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Property Editing Form */}
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-4">Update Property Assignment</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select New Lot
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaMapMarkerAlt className="text-amber-600 text-sm" />
                                  </div>
                                  <select
                                    value={propertyFormData.selectedLotId}
                                    onChange={(e) => setPropertyFormData({...propertyFormData, selectedLotId: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                                  >
                                    <option value="">-- Keep current assignment --</option>
                                    {loadingLots ? (
                                      <option disabled>Loading available lots...</option>
                                    ) : (
                                      availableLots.map(lot => (
                                        <option key={lot.id} value={lot.id}>
                                          {lot.displayName}
                                        </option>
                                      ))
                                    )}
                                  </select>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Only vacant lots are available
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  House Model
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-home text-amber-600 text-sm"></i>
                                  </div>
                                  <select
                                    value={propertyFormData.houseModel}
                                    onChange={(e) => setPropertyFormData({...propertyFormData, houseModel: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                                  >
                                    <option value="Standard">Standard Model</option>
                                    <option value="Premium">Premium Model</option>
                                    <option value="Deluxe">Deluxe Model</option>
                                    <option value="Executive">Executive Model</option>
                                    <option value="Custom">Custom Build</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  const hasLotChange = propertyFormData.selectedLotId !== '';
                                  const hasModelChange = propertyFormData.houseModel !== (selectedUser.houseModel || 'Standard');

                                  if (hasLotChange || hasModelChange) {
                                    handleUpdateProperty(selectedUser.id, propertyFormData.selectedLotId, propertyFormData.houseModel);
                                  } else {
                                    toast.info('No changes detected');
                                  }
                                }}
                                disabled={formSubmitting}
                                className="px-6 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center transition-colors duration-200 shadow-sm"
                              >
                                {formSubmitting ? (
                                  <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <FaSave className="mr-2" />
                                    Update Property
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
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

                          <button
                            onClick={() => handleDeleteUser(selectedUser.id)}
                            disabled={actionLoading === selectedUser.id}
                            className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors duration-200"
                          >
                            <FaTrash className="mr-2" />
                            Delete Account
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-full flex items-center justify-center bg-red-100">
                  <FaExclamationTriangle className="text-red-600" size={24} />
                </div>
              </div>
              <h3 className="text-lg font-medium text-center mb-2 text-gray-900">
                Confirm Account Deletion
              </h3>
              <p className="text-sm text-center mb-4 text-gray-600">
                Are you sure you want to delete <strong>{userToDelete.username || getFullName(userToDelete)}</strong>?
              </p>

              {userToDelete.house_no && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <FaHome className="text-amber-600 mr-2" />
                    <span className="font-medium text-amber-800">Property Impact</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    This user has House #{userToDelete.house_no} assigned. Deleting this account will make the lot available for reassignment.
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-md transition-colors duration-200 bg-gray-200 hover:bg-gray-300 text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={actionLoading === userToDelete.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center"
                >
                  {actionLoading === userToDelete.id ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
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
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-sliders-h text-gray-500"></i>
                        <span>Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 sm:px-6 py-8 text-center">
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
                        {user.house_no ? (
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
                            {user.houseModel && (
                              <div className="text-xs text-gray-500 mt-1">
                                {user.houseModel}
                              </div>
                            )}
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
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {actionLoading === user.id ? (
                          <div className="flex items-center justify-center">
                            <FaSpinner className="animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 sm:gap-2">
                            {/* Top Section: View, Deactivate/Activate, Delete */}
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
                            
                            {/* Bottom Section: Record Status Buttons */}
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
                      </td>
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
                <span className="font-medium text-blue-600">{filteredUsers.filter(u => u.house_no).length}</span> users with property assigned
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}

export default UserAccounts;