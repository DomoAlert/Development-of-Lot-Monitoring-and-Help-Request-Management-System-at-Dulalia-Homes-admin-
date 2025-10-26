import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { FaUser, FaEdit, FaTimes, FaSpinner, FaHome, FaMapMarkerAlt, FaEye, FaEyeSlash } from 'react-icons/fa';

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

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    
    if (!selectedUser) return;
    
    try {
      // Generate email from username if not provided
      const userEmail = formData.email || `${formData.username}@example.com`;
      
      // Check if the lot assignment has changed
      const lotChanged = 
        selectedUser.house_no !== formData.house_no ||
        selectedUser.block !== formData.block ||
        selectedUser.lot !== formData.lot;
      
      // Update the user document
      await updateDoc(doc(db, 'users', selectedUser.id), {
        ...formData,
        email: userEmail,
        last_updated: serverTimestamp()
      });
      
      // If lot assignment changed, update the lots collection
      if (lotChanged) {
        try {
          // Handle the old lot - mark it as vacant
          if (selectedUser.house_no) {
            const oldBlockNum = Math.floor(selectedUser.house_no / 100);
            const oldLotNum = selectedUser.house_no % 100;
            const oldLotId = `B${oldBlockNum}-L${oldLotNum.toString().padStart(2, '0')}`;
            
            await setDoc(doc(db, 'lots', oldLotId), {
              house_no: selectedUser.house_no,
              block: oldBlockNum,
              lot: oldLotNum,
              status: 'Vacant',
              owner_id: null,
              house_owner: null,
              last_updated: serverTimestamp()
            }, { merge: true });
          }
          
          // Handle the new lot - mark it as occupied
          if (formData.house_no) {
            const newLotId = `B${formData.block}-L${formData.lot.toString().padStart(2, '0')}`;
            
            await setDoc(doc(db, 'lots', newLotId), {
              house_no: formData.house_no,
              block: formData.block,
              lot: formData.lot,
              status: 'Occupied',
              owner_id: selectedUser.id,
              house_owner: formData.username || `${formData.firstName} ${formData.lastName}`.trim(),
              houseModel: formData.houseModel || 'Standard',
              last_updated: serverTimestamp()
            }, { merge: true });
          }
          
          toast.success('User and lot assignment updated successfully');
        } catch (error) {
          console.error('Error updating lot status:', error);
          toast.warning('User updated but there was an issue updating lot status');
        }
      } else {
        toast.success('User updated successfully');
      }
      
      setShowUserDetails(false);
      setIsEditing(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
      fetchAvailableLots(); // Refresh available lots
    } catch (error) {
      toast.error('Error updating user: ' + error.message);
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

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setActionLoading(id);
      try {
        await deleteDoc(doc(db, 'users', id));
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Error deleting user: ' + error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
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

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData({
      ...formData,
      username,
      email: `${username}@dulalia.com`
    });
  };

  const handleContactNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    setFormData({...formData, contactNumber: value});
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
    setIsEditing(false);
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

  return (
    <ResponsiveLayout>
      <div className="pt-16 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-full xl:max-w-7xl mx-auto">
        <div className="bg-white bg-white shadow-lg rounded-lg p-4 sm:p-6 mb-6 lg:mb-8 border-l-4 border-blue-500">
          <h1 className="text-2xl sm:text-3xl font-bold text-black text-black flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            User Accounts
          </h1>
              <p className="text-gray-600 text-gray-700 mt-2">
                Manage resident accounts and their access permissions
              </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm sm:text-base"
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
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
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
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4 py-4 sm:py-8">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
                  <h2 className="text-lg sm:text-xl font-semibold text-black text-black">Create New Homeowner Account</h2>
                  <button 
                    onClick={() => {
                      setShowForm(false);
                      setShowPassword(false);
                    }}
                    className="text-black text-black hover:text-gray-700 focus:outline-none"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-4 sm:p-6">
                  <form onSubmit={handleAddUser} className="space-y-4 sm:space-y-5">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-blue-100">
                      <h3 className="font-medium text-blue-800 mb-2 flex items-center text-sm sm:text-base">
                        <FaUser className="mr-2 text-sm sm:text-base" /> Personal Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black text-black mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black text-black mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-indigo-100">
                      <h3 className="font-medium text-indigo-800 mb-2 flex items-center text-sm sm:text-base">
                        <i className="fas fa-user-lock mr-2"></i> Account Information
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Username *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-black text-black sm:text-sm">@</span>
                              </div>
                              <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleUsernameChange}
                                className="w-full pl-8 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
                                placeholder="johndoe"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black text-black mb-1">
                              Contact Number
                            </label>
                            <input
                              type="tel"
                              value={formData.contactNumber}
                              onChange={handleContactNumberChange}
                              className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
                              placeholder="e.g. 09123456789"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-black text-black mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
                              placeholder={formData.username ? `${formData.username}@example.com` : "email@example.com"}
                            />
                            <p className="text-xs text-black text-black mt-1">
                              Auto-generated if left empty
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-black text-black mb-1">
                              Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full px-3 sm:px-4 py-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm sm:text-base"
                                placeholder="Leave blank to use username"
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <FaEyeSlash className="h-4 w-4 text-black text-black hover:text-gray-600" />
                                ) : (
                                  <FaEye className="h-4 w-4 text-black text-black hover:text-gray-600" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-black text-black mt-1">
                              Default: same as username
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-amber-100">
                      <h3 className="font-medium text-amber-800 mb-2 flex items-center text-sm sm:text-base">
                        <FaMapMarkerAlt className="mr-2" /> Property Assignment
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-black text-black mb-1">
                              Select Available Lot *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaMapMarkerAlt className="text-amber-600" />
                              </div>
                              {loadingLots ? (
                                <div className="w-full px-3 sm:px-4 py-2 pl-10 rounded-md border border-gray-300 bg-gray-50">
                                  <FaSpinner className="animate-spin inline mr-2 text-black text-black" />
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
                                  className="w-full px-3 sm:px-4 py-2 pl-10 rounded-md border border-gray-300 focus:ring-amber-500 focus:border-amber-500 shadow-sm text-sm sm:text-base"
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
                            <p className="text-xs text-black text-black mt-1">
                              Only showing vacant lots that are available for assignment
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-black text-black mb-1">
                              House Model
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="fas fa-home text-amber-600"></i>
                              </div>
                              <select
                                value={formData.houseModel}
                                onChange={(e) => setFormData({...formData, houseModel: e.target.value})}
                                className="w-full px-3 sm:px-4 py-2 pl-10 rounded-md border border-gray-300 focus:ring-amber-500 focus:border-amber-500 shadow-sm text-sm sm:text-base"
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
                          <div className="col-span-1 sm:col-span-2 mt-3 p-3 bg-white rounded-lg border border-amber-200">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-amber-700 text-sm">Selected Lot Details:</span>
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                #{selectedLot.house_no}
                              </span>
                            </div>
                            <div className="mt-2 text-sm">
                              <div className="flex items-center text-black text-black">
                                <FaHome className="mr-1 text-amber-500" />
                                Block {selectedLot.block}, Lot {selectedLot.lot}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mt-4 border border-gray-200">
                      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                        <button
                          type="button"
                          disabled={formSubmitting}
                          onClick={() => setShowForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-black text-black hover:bg-gray-100 disabled:opacity-50 transition-colors duration-150 ease-in-out shadow-sm text-sm sm:text-base"
                        >
                          <i className="fas fa-times mr-2"></i>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="px-4 sm:px-5 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors duration-150 ease-in-out shadow-sm text-sm sm:text-base"
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

        {/* User Details/Edit Modal */}
        {showUserDetails && selectedUser && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeUserDetails();
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4 py-4 sm:py-8">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
                  <h2 className="text-base sm:text-lg font-semibold">
                    {isEditing ? 'Edit User' : 'User Details'}
                  </h2>
                  <button 
                    onClick={closeUserDetails}
                    className="text-black text-black hover:text-gray-700"
                  >
                    <FaTimes />
                  </button>
                </div>
                
                <div className="p-4 sm:p-6">
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl sm:text-3xl">
                      <FaUser />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-sm text-black text-black">First Name</p>
                      <p className="font-medium text-sm sm:text-base">{selectedUser.firstName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-black text-black">Last Name</p>
                      <p className="font-medium text-sm sm:text-base">{selectedUser.lastName || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-black text-black">Username</p>
                    <p className="font-medium text-sm sm:text-base">{selectedUser.username || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-black text-black">Email</p>
                    <p className="font-medium text-sm sm:text-base">{selectedUser.email || 'N/A'}</p>
                  </div>
                  
                  <div className="p-2 bg-amber-50 rounded-md">
                    <p className="text-sm text-black text-black">Property Details</p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm sm:text-base">House #{selectedUser.house_no || 'N/A'}</p>
                        {selectedUser.block && selectedUser.lot && (
                          <p className="text-xs sm:text-sm text-black">Block {selectedUser.block}, Lot {selectedUser.lot}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 self-start">
                        {selectedUser.houseModel || 'Standard'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-black text-black">Role</p>
                    <p className="font-medium text-sm sm:text-base">{selectedUser.role || 'Homeowner'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-black text-black">Status</p>
                    <p className={`font-medium text-sm sm:text-base ${selectedUser.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedUser.status || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-black text-black">Record Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedUser.recordStatus === 'Good' ? 'bg-green-100 text-green-800' : 
                      selectedUser.recordStatus === 'Bad' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUser.recordStatus || 'Neutral'}
                    </span>
                  </div>
                  
                  <div>
                    <p className="text-sm text-black text-black">Contact Number</p>
                    <p className="font-medium text-sm sm:text-base">{selectedUser.contactNumber || 'N/A'}</p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4 sm:mt-6">
                    <button
                      onClick={handleEditUser}
                      className="px-3 sm:px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 flex items-center text-sm sm:text-base"
                    >
                      <FaEdit className="mr-2" />
                      Edit User
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateUser} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black text-black mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black text-black mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black text-black mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleUsernameChange}
                      className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black text-black mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    />
                  </div>
                  
                  <div>
  <label className="block text-sm font-medium text-black text-black mb-1">
    Property Assignment
  </label>
  <div className="p-2 sm:p-3 bg-amber-50 rounded-md border border-amber-100">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
      <span className="text-sm font-medium text-amber-700">
        Current House Number:
      </span>
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 self-start">
        #{formData.house_no}
      </span>
    </div>
    <div className="text-xs sm:text-sm text-black text-black mb-2">
      Block {formData.block}, Lot {formData.lot}
    </div>
    
    <div className="mt-3">
      <label className="block text-xs font-medium text-black text-black mb-1">
        Change Lot Assignment
      </label>
      <select
        value=""
        onChange={(e) => {
          const selected = availableLots.find(lot => lot.id === e.target.value);
          if (selected) {
            setFormData({
              ...formData,
              house_no: selected.house_no,
              block: selected.block,
              lot: selected.lot
            });
          }
        }}
        className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
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
      <p className="text-xs text-black text-black mt-1">
        Only vacant lots are available for reassignment
      </p>
    </div>
  </div>
</div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black text-black mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value, isActive: e.target.value === 'Active'})}
                      className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black text-black mb-1">
                      Record Status
                    </label>
                    <select
                      value={formData.recordStatus}
                      onChange={(e) => setFormData({...formData, recordStatus: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    >
                      <option value="Neutral">Neutral</option>
                      <option value="Good">Good</option>
                      <option value="Bad">Bad</option>
                    </select>
                    <p className="text-xs text-black text-black mt-1">
                      Bad record status will restrict access to some facilities and services
                    </p>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-black text-black mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={handleContactNumberChange}
                      className="w-full px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      placeholder="e.g. 09123456789"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4 sm:mt-6">
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={() => setIsEditing(false)}
                      className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-black text-black hover:bg-gray-50 disabled:opacity-50 text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-3 sm:px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
                    >
                      {formSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        'Update User'
                      )}
                    </button>
                  </div>
                </form>
              )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100 border-gray-100">
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50  border-b border-gray-100 ">
            <h2 className="text-base sm:text-lg font-semibold text-black flex items-center">
              <i className="fas fa-users text-blue-500 mr-2"></i>
              Homeowner Accounts
              <span className="ml-2 sm:ml-3 px-2 sm:px-3 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 bg-blue-100 text-blue-700">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 border-4 border-gray-100  border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-black text-black text-sm sm:text-base">Loading homeowner accounts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 divide-gray-200 border-collapse">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 ">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black text-black uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <FaUser className="text-blue-500 text-xs sm:text-sm" />
                        <span className="hidden sm:inline">User</span>
                        <span className="sm:hidden">Info</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black text-black uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <FaHome className="text-amber-500 text-xs sm:text-sm" />
                        <span className="hidden lg:inline">Property Details</span>
                        <span className="lg:hidden">Property</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black text-black uppercase tracking-wider hidden md:table-cell">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-envelope text-blue-500 text-xs sm:text-sm"></i>
                        <span>Email</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black text-black uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-circle text-green-500 text-xs sm:text-sm"></i>
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black text-black uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-shield-alt text-purple-500 text-xs sm:text-sm"></i>
                        <span>Record Status</span>
                      </div>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-black text-black uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-sliders-h text-black text-black text-xs sm:text-sm"></i>
                        <span>Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white bg-white divide-y divide-gray-100 divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 sm:px-6 py-6 sm:py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FaUser className="h-8 w-8 sm:h-10 sm:w-10 text-gray-200 text-gray-200 mb-2" />
                          <p className="text-black text-black font-medium text-sm sm:text-base">No users found</p>
                          <p className="text-black text-black text-xs sm:text-sm">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className={`${actionLoading === user.id ? "bg-gray-50 bg-gray-50" : ""} 
                          hover:bg-blue-50/30  transition-colors duration-150
                          ${user.status === 'Inactive' ? 'bg-red-50/20 ' : ''}`}
                      >
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleViewUser(user)}
                            className="flex items-center hover:text-primary group w-full text-left cursor-pointer"
                          >
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center mr-2 sm:mr-3 shadow-sm group-hover:shadow group-hover:scale-105 transition-all duration-200 flex-shrink-0">
                              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 text-black group-hover:text-blue-600  transition-colors truncate">
                                @{user.username || 'N/A'}
                              </div>
                              <div className="text-xs text-black text-black truncate">
                                {getFullName(user)}
                              </div>
                              {user.contactNumber && (
                                <div className="text-xs text-black text-black flex items-center mt-1">
                                  <i className="fas fa-phone-alt mr-1 text-black text-black"></i>
                                  <span className="truncate">{user.contactNumber}</span>
                                </div>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {user.house_no ? (
                            <div className="flex flex-col">
                              <div className="flex items-center mb-1">
                                <span className="font-medium text-amber-700 text-amber-700 bg-amber-50 bg-amber-50 px-2 py-0.5 rounded-md text-xs sm:text-sm">
                                  #{user.house_no}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <div className="text-xs bg-blue-50 bg-blue-50 text-blue-700 text-blue-700 px-1 sm:px-2 py-0.5 rounded">
                                  Block {user.block || Math.floor(user.house_no / 100)}
                                </div>
                                <div className="text-xs bg-green-50 bg-green-50 text-green-700 text-green-700 px-1 sm:px-2 py-0.5 rounded">
                                  Lot {user.lot || user.house_no % 100}
                                </div>
                              </div>
                              {user.houseModel && (
                                <div className="text-xs text-black text-black mt-1 truncate">
                                  {user.houseModel} Model
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-black text-black italic">No property assigned</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center">
                            <div className="bg-blue-50 bg-blue-50 rounded-full p-1 mr-2 flex-shrink-0">
                              <i className="fas fa-envelope text-blue-400 text-blue-400 text-xs"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm text-black text-black truncate">{user.email || 'N/A'}</div>
                              <div className="text-xs text-black text-black truncate">ID: {user.id?.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`px-2 sm:px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'Active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              <span className={`mr-1 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${
                                user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              {user.status || 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`px-2 sm:px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                            user.recordStatus === 'Good' ? 'bg-green-100 text-green-800 border border-green-200' : 
                            user.recordStatus === 'Bad' ? 'bg-red-100 text-red-800 border border-red-200' : 
                            'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            <i className={`fas ${
                              user.recordStatus === 'Good' ? 'fa-thumbs-up mr-1 text-green-600' : 
                              user.recordStatus === 'Bad' ? 'fa-thumbs-down mr-1 text-red-600' : 
                              'fa-minus mr-1 text-black text-black'
                            } text-xs sm:text-sm`}></i>
                            {user.recordStatus || 'Neutral'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 text-gray-500">
                          {actionLoading === user.id ? (
                            <div className="flex items-center justify-center">
                              <FaSpinner className="animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 sm:gap-2">
                              {/* Status and Delete Actions */}
                              <div className="flex flex-wrap gap-1">
                                <button 
                                  onClick={() => handleToggleStatus(user.id, user.status)}
                                  className={`px-1.5 sm:px-2 py-1 text-xs rounded border flex items-center ${
                                    user.status === 'Active' 
                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                                    : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'
                                  }`}
                                >
                                  <i className={`fas fa-toggle-${user.status === 'Active' ? 'off' : 'on'} mr-1`}></i>
                                  <span className="hidden sm:inline">{user.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                                  <span className="sm:hidden">{user.status === 'Active' ? 'Off' : 'On'}</span>
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-1.5 sm:px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 flex items-center"
                                >
                                  <i className="fas fa-trash-alt mr-1"></i>
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </div>
                              
                              {/* Record Status Change Actions */}
                              <div className="flex flex-wrap gap-1">
                                <button 
                                  onClick={() => handleSetRecordStatus(user.id, 'Good')}
                                  className="px-1.5 sm:px-2 py-1 text-xs bg-green-50 text-green-600 rounded border border-green-100 hover:bg-green-100 flex items-center"
                                  title="Mark Good Record"
                                >
                                  <i className="fas fa-thumbs-up mr-1"></i>
                                  <span className="hidden sm:inline">Good</span>
                                </button>
                                
                                <button 
                                  onClick={() => handleSetRecordStatus(user.id, 'Neutral')}
                                  className="px-1.5 sm:px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-gray-100 hover:bg-gray-100 flex items-center"
                                  title="Reset Record Status"
                                >
                                  <i className="fas fa-minus mr-1"></i>
                                  <span className="hidden sm:inline">Neutral</span>
                                </button>
                                
                                <button 
                                  onClick={() => handleSetRecordStatus(user.id, 'Bad')}
                                  className="px-1.5 sm:px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 flex items-center"
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
            <div className="bg-gray-50 bg-gray-50 px-3 sm:px-6 py-2 sm:py-3 border-t border-gray-100  flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-xs sm:text-sm text-black text-black">
                Showing {filteredUsers.length} homeowner account{filteredUsers.length !== 1 ? 's' : ''}
              </div>
              <div className="text-xs sm:text-sm text-black text-black">
                <span className="font-medium text-blue-600 text-blue-600">{filteredUsers.filter(u => u.house_no).length}</span> users with property assigned
              </div>
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}

export default UserAccounts;
