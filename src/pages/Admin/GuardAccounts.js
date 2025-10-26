import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { toast } from 'react-toastify';
import { FaUserShield, FaEdit, FaTrash, FaTimes, FaSpinner, FaClock, FaToggleOn, FaToggleOff, FaSearch, FaFilter, FaSyncAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { createUserWithEmailAndPassword } from 'firebase/auth';

function GuardAccounts() {
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGuardDetails, setShowGuardDetails] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    contactNumber: '',
    role: 'Guard',
    shift_status: 'Off-duty',
    shift_start: '',
    shift_end: '',
    shiftDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    isActive: true,
    fcmToken: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');

  // Function to manually refresh data
  const refreshData = () => {
    setIsRefreshing(true);
    fetchGuards().finally(() => {
      setIsRefreshing(false);
    });
  };

  // Fetch guards
  useEffect(() => {
    document.title = "Guard Accounts";
    fetchGuards();
  }, [refreshTrigger]);

  const fetchGuards = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'guards'), where('role', '==', 'Guard'));
      const querySnapshot = await getDocs(q);
      const guardsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGuards(guardsData);
    } catch (error) {
      console.error("Error fetching guards: ", error);
      toast.error("Error loading guards");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuard = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    
    try {
      // Create user in Authentication
      const authResult = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = authResult.user.uid;
      
      // Add guard to Firestore
      await setDoc(doc(db, 'guards', uid), {
        ...formData,
        id: uid,
        password: null,  // Don't store password in Firestore
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Guard account created successfully!");
      setShowForm(false);
      setShowPassword(false);
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        contactNumber: '',
        role: 'Guard',
        shift_status: 'Off-duty',
        shift_start: '',
        shift_end: '',
        shiftDays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        },
        isActive: true,
        fcmToken: ''
      });
      
      // Refresh guard list
      fetchGuards();
      
    } catch (error) {
      console.error("Error creating guard account: ", error);
      toast.error(error.message || "Failed to create guard account");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData({
      ...formData,
      username,
      email: username ? `${username}@guard.com` : ''
    });
  };

  const handleContactNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    setFormData({...formData, contactNumber: value});
  };

  const handleViewGuard = (guard) => {
    setSelectedGuard(guard);
    setFormData({
      name: guard.name || '',
      username: guard.username || '',
      email: guard.email || '',
      contactNumber: guard.contactNumber || '',
      role: guard.role || 'Guard',
      shift_status: guard.shift_status || 'Off-duty',
      shift_start: guard.shift_start || '',
      shift_end: guard.shift_end || '',
      shiftDays: guard.shiftDays || {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      isActive: guard.isActive !== undefined ? guard.isActive : true
    });
    setShowGuardDetails(true);
    setIsEditing(false);
  };

  const closeGuardDetails = () => {
    setShowGuardDetails(false);
    setSelectedGuard(null);
    setIsEditing(false);
  };

  const handleEditGuard = () => {
    if (!selectedGuard) return;
    setIsEditing(true);
  };

  const handleUpdateGuard = async (e) => {
    e.preventDefault();
    if (!selectedGuard) return;
    
    setFormSubmitting(true);
    
    try {
      const guardRef = doc(db, 'guards', selectedGuard.id);
      
      await updateDoc(guardRef, {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        contactNumber: formData.contactNumber,
        shift_start: formData.shift_start,
        shift_end: formData.shift_end,
        shiftDays: formData.shiftDays,
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Guard information updated successfully!");
      
      // Update local state and close modal
      fetchGuards();
      closeGuardDetails();
      
    } catch (error) {
      console.error("Error updating guard: ", error);
      toast.error(error.message || "Failed to update guard information");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteGuard = async (guardId) => {
    if (!window.confirm("Are you sure you want to delete this guard account? This action cannot be undone.")) {
      return;
    }
    
    setActionLoading(guardId);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'guards', guardId));
      
      toast.success("Guard account deleted successfully!");
      
      // Update UI
      setGuards(prev => prev.filter(guard => guard.id !== guardId));
      
    } catch (error) {
      console.error("Error deleting guard: ", error);
      toast.error(error.message || "Failed to delete guard account");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleGuardStatus = async (guardId, currentStatus) => {
    setActionLoading(guardId);
    
    try {
      const guardRef = doc(db, 'guards', guardId);
      
      await updateDoc(guardRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      
      toast.success(`Guard ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      
      // Update UI
      setGuards(prev => prev.map(guard => {
        if (guard.id === guardId) {
          return { ...guard, isActive: !currentStatus };
        }
        return guard;
      }));
      
    } catch (error) {
      console.error("Error toggling guard status: ", error);
      toast.error("Failed to update guard status");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleShiftStatus = async (guardId, currentShiftStatus) => {
    setActionLoading(guardId);
    
    try {
      const guardRef = doc(db, 'guards', guardId);
      const newShiftStatus = currentShiftStatus === 'On-duty' ? 'Off-duty' : 'On-duty';
      
      await updateDoc(guardRef, {
        shift_status: newShiftStatus,
        updatedAt: serverTimestamp(),
      });
      
      toast.success(`Guard is now ${newShiftStatus.toLowerCase()}`);
      
      // Update UI
      setGuards(prev => prev.map(guard => {
        if (guard.id === guardId) {
          return { ...guard, shift_status: newShiftStatus };
        }
        return guard;
      }));
      
    } catch (error) {
      console.error("Error toggling shift status: ", error);
      toast.error("Failed to update shift status");
    } finally {
      setActionLoading(null);
    }
  };

  // Function to convert 24-hour time to 12-hour format with AM/PM
  const formatTime = (time) => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hourNum = parseInt(hours, 10);
    
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    
    return `${hour12}:${minutes} ${period}`;
  };

  // Function to format shift days display
  const formatShiftDays = (shiftDays) => {
    if (!shiftDays) return 'Not set';
    
    const days = [];
    if (shiftDays.monday) days.push('M');
    if (shiftDays.tuesday) days.push('T');
    if (shiftDays.wednesday) days.push('W');
    if (shiftDays.thursday) days.push('TH');
    if (shiftDays.friday) days.push('F');
    if (shiftDays.saturday) days.push('SAT');
    if (shiftDays.sunday) days.push('SUN');
    
    return days.length > 0 ? days.join(' ') : 'Not set';
  };

  // Filtered guards based on search
  const filteredGuards = guards.filter(guard => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (guard.name?.toLowerCase().includes(query)) ||
      (guard.username?.toLowerCase().includes(query)) ||
      (guard.email?.toLowerCase().includes(query)) ||
      (guard.contactNumber?.toLowerCase().includes(query))
    );
  });

  // Stats
  const onDutyGuards = guards.filter(guard => guard.shift_status === 'On-duty').length;
  const totalShiftsToday = guards.filter(guard => guard.shift_start && guard.shift_end).length;
  const activeAccounts = guards.filter(guard => guard.isActive).length;

  return (
    <ResponsiveLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <div className="flex flex-wrap justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
                <FaUserShield className="mr-3 text-blue-500 h-8 w-8" />
                Guard Accounts
              </h1>
              <p className="text-gray-600 text-gray-700 mt-2">
                Manage security guard accounts and credentials
              </p>
            </div>
            <div className="flex mt-4 md:mt-0">
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Guard
              </button>
              <button 
                onClick={refreshData}
                className="ml-3 bg-gray-100 bg-gray-100 hover:bg-gray-200 hover:bg-gray-200 text-gray-700 text-gray-700 px-3 py-2 rounded-lg flex items-center shadow-sm transition-colors"
                disabled={isRefreshing}
              >
                <FaSyncAlt className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-blue-500' : 'text-gray-500 text-gray-500'}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <div className="bg-blue-50 bg-blue-50 p-4 rounded-lg border border-blue-100 border-blue-200">
              <div className="flex items-center">
                <div className="bg-blue-100 bg-blue-100 p-3 rounded-full">
                  <FaUserShield className="h-6 w-6 text-blue-600 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h2 className="font-semibold text-gray-800 text-black">Total Guards</h2>
                  <p className="text-2xl font-bold text-blue-600 text-blue-600">{guards.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 bg-green-50 p-4 rounded-lg border border-green-100 border-green-200">
              <div className="flex items-center">
                <div className="bg-green-100 bg-green-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="font-semibold text-gray-800 text-black">On Duty</h2>
                  <p className="text-2xl font-bold text-green-600 text-green-600">{onDutyGuards}</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 bg-indigo-50 p-4 rounded-lg border border-indigo-100 border-indigo-200">
              <div className="flex items-center">
                <div className="bg-indigo-100 bg-indigo-100 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="font-semibold text-gray-800 text-black">Active Accounts</h2>
                  <p className="text-2xl font-bold text-indigo-600 text-indigo-600">{activeAccounts}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative rounded-md shadow-sm w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guards..."
              className="pl-10 w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Add Guard Form Modal */}
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
              <div className="bg-white bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
                <div className="p-6 sticky top-0 bg-white bg-white border-b border-gray-200 border-gray-200 z-10">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800 text-black">Add New Guard</h2>
                  <button 
                    onClick={() => {
                      setShowForm(false);
                      setShowPassword(false);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              
                <form onSubmit={handleAddGuard} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      placeholder="Enter guard's full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleUsernameChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                      placeholder="Enter username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.username ? `${formData.username}@guard.com` : "guard@guard.com"}
                    />
                    <p className="mt-1 text-xs text-gray-500">Auto-generated from username</p>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Create a strong password"
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
                    <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={handleContactNumberChange}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 09123456789"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shift Start
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaClock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="time"
                          value={formData.shift_start}
                          onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                          className="pl-10 w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shift End
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaClock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="time"
                          value={formData.shift_end}
                          onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                          className="pl-10 w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.monday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, monday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mon</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.tuesday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, tuesday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Tue</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.wednesday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, wednesday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Wed</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.thursday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, thursday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Thu</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.friday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, friday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Fri</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.saturday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, saturday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sat</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.sunday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, sunday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sun</span>
                      </label>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        disabled={formSubmitting}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSubmitting}
                        className={`px-4 py-2 rounded-lg text-white ${
                          formSubmitting 
                            ? 'bg-blue-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        } transition-colors inline-flex items-center`}
                      >
                        {formSubmitting ? (
                          <>
                            <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Creating...
                          </>
                        ) : (
                          <>Add Guard</>
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

        {/* Guard Details Modal */}
        {showGuardDetails && selectedGuard && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeGuardDetails();
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-4 py-8">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0 z-10">
                <h2 className="text-lg font-semibold">
                  {isEditing ? 'Edit Guard' : 'Guard Details'}
                </h2>
                <button 
                  onClick={closeGuardDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="p-6">
              {!isEditing ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="h-20 w-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-semibold">
                      {selectedGuard?.name?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedGuard?.name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{selectedGuard?.username || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedGuard?.email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="font-medium">{selectedGuard?.contactNumber || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Shift</p>
                    <p className="font-medium">
                      {selectedGuard?.shift_start && selectedGuard?.shift_end
                        ? `${formatTime(selectedGuard?.shift_start)} - ${formatTime(selectedGuard?.shift_end)}`
                        : 'Not set'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Shift Days</p>
                    <p className="font-medium">{formatShiftDays(selectedGuard?.shiftDays)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex items-center mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full mr-2 ${
                        selectedGuard?.shift_status === 'On-duty' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedGuard?.shift_status || 'Off-duty'}
                      </span>
                      
                      <span className={`inline-flex h-2 w-2 rounded-full ${
                        selectedGuard?.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}></span>
                      <span className="ml-1 text-xs text-gray-500">
                        {selectedGuard?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={handleEditGuard}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FaEdit className="inline mr-1" /> Edit
                    </button>
                    <button 
                      onClick={() => {
                        closeGuardDetails();
                        handleDeleteGuard(selectedGuard.id);
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <FaTrash className="inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateGuard} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleUsernameChange}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={handleContactNumberChange}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 09123456789"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Start
                    </label>
                    <input
                      type="time"
                      value={formData.shift_start}
                      onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift End
                    </label>
                    <input
                      type="time"
                      value={formData.shift_end}
                      onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.monday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, monday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mon</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.tuesday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, tuesday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Tue</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.wednesday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, wednesday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Wed</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.thursday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, thursday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Thu</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.friday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, friday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Fri</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.saturday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, saturday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sat</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.shiftDays.sunday}
                          onChange={(e) => setFormData({
                            ...formData,
                            shiftDays: { ...formData.shiftDays, sunday: e.target.checked }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sun</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Status
                    </label>
                    <select
                      value={formData.shift_status}
                      onChange={(e) => setFormData({...formData, shift_status: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Off-duty">Off-duty</option>
                      <option value="On-duty">On-duty</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Status
                    </label>
                    <select
                      value={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={formSubmitting}
                    >
                      {formSubmitting ? (
                        <div className="flex items-center">
                          <FaSpinner className="animate-spin mr-2" />
                          Updating...
                        </div>
                      ) : (
                        'Update Guard'
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

        {/* Guards table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <FaSpinner className="animate-spin text-blue-500 mx-auto h-8 w-8 mb-4" />
              <p className="text-gray-600">Loading guards...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guard
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Days
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
                  {filteredGuards.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-lg font-medium">No guards found</p>
                        <p className="mt-1">Try adjusting your search criteria or add a new guard.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGuards.map((guard) => (
                      <tr 
                        key={guard.id} 
                        className="hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleViewGuard(guard)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-lg font-medium text-blue-700">
                                {guard.name?.charAt(0).toUpperCase() || 'G'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{guard.name}</div>
                              <div className="text-sm text-gray-500">{guard.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {guard.shift_start && guard.shift_end ? (
                            <span className="text-sm text-gray-900">{formatTime(guard.shift_start)} - {formatTime(guard.shift_end)}</span>
                          ) : (
                            <span className="text-sm text-gray-500">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{formatShiftDays(guard.shiftDays)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-2 ${
                              guard.shift_status === 'On-duty' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {guard.shift_status || 'Off-duty'}
                            </span>
                            
                            <span className={`inline-flex h-2 w-2 rounded-full ${
                              guard.isActive ? 'bg-green-500' : 'bg-gray-300'
                            }`}></span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                          {actionLoading === guard.id ? (
                            <div className="flex items-center justify-center">
                              <FaSpinner className="animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {/* Top Section: Activate/Deactivate, Delete */}
                              <div className="flex flex-wrap gap-1">
                                <button
                                  onClick={() => toggleGuardStatus(guard.id, guard.isActive)}
                                  className={`px-2 py-1 text-xs rounded border flex items-center ${
                                    guard.isActive 
                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                                    : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'
                                  }`}
                                >
                                  <i className={`fas fa-toggle-${guard.isActive ? 'off' : 'on'} mr-1`}></i>
                                  {guard.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteGuard(guard.id)}
                                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 flex items-center"
                                >
                                  <i className="fas fa-trash-alt mr-1"></i>
                                  Delete
                                </button>
                              </div>
                              
                              {/* Bottom Section: Shift Status Toggle */}
                              <div className="flex flex-wrap gap-1">
                                <button
                                  onClick={() => toggleShiftStatus(guard.id, guard.shift_status)}
                                  className={`px-2 py-1 text-xs rounded border flex items-center ${
                                    guard.shift_status === 'On-duty'
                                    ? 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                                    : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                  }`}
                                >
                                  <i className={`fas ${guard.shift_status === 'On-duty' ? 'fa-moon' : 'fa-sun'} mr-1`}></i>
                                  {guard.shift_status === 'On-duty' ? 'Go Off Duty' : 'Go On Duty'}
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
        </div>
      </div>
    </ResponsiveLayout>
  );
}

export default GuardAccounts;
