import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { toast } from 'react-toastify';
import { FaUserShield, FaUser, FaTimes, FaSpinner, FaClock, FaSearch, FaSyncAlt, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle, FaCheck } from 'react-icons/fa';
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

  // Auto-update shift statuses based on real time
  useEffect(() => {
    const updateShiftStatuses = () => {
      updateGuardsShiftStatus();
    };

    // Run immediately
    updateShiftStatuses();

    // Then run every minute
    const interval = setInterval(updateShiftStatuses, 60000);

    return () => clearInterval(interval);
  }, [guards]);

  // Function to check if a guard should be on duty based on current time and shift schedule
  const shouldGuardBeOnDuty = (guard) => {
    if (!guard.shift_start || !guard.shift_end || !guard.shiftDays) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

    // Map day numbers to shiftDays keys
    const dayMapping = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };

    const todayKey = dayMapping[currentDay];

    // Check if today is a shift day for this guard
    if (!guard.shiftDays[todayKey]) {
      return false;
    }

    // Parse shift times
    const [startHours, startMinutes] = guard.shift_start.split(':').map(Number);
    const [endHours, endMinutes] = guard.shift_end.split(':').map(Number);

    const shiftStartMinutes = startHours * 60 + startMinutes;
    const shiftEndMinutes = endHours * 60 + endMinutes;

    // Handle overnight shifts (e.g., 22:00 to 06:00)
    if (shiftEndMinutes < shiftStartMinutes) {
      // Shift spans midnight
      return currentTime >= shiftStartMinutes || currentTime <= shiftEndMinutes;
    } else {
      // Normal shift within same day
      return currentTime >= shiftStartMinutes && currentTime <= shiftEndMinutes;
    }
  };

  // Function to update all guards' shift statuses based on current time
  const updateGuardsShiftStatus = async () => {
    if (guards.length === 0) return;

    try {
      const updates = [];

      for (const guard of guards) {
        const shouldBeOnDuty = shouldGuardBeOnDuty(guard);
        const currentStatus = guard.shift_status || 'Off-duty';
        const newStatus = shouldBeOnDuty ? 'On-duty' : 'Off-duty';

        // Only update if status needs to change
        if (currentStatus !== newStatus) {
          const guardRef = doc(db, 'guards', guard.id);
          updates.push(
            updateDoc(guardRef, {
              shift_status: newStatus,
              updatedAt: serverTimestamp(),
            })
          );

          // Update local state immediately
          setGuards(prev => prev.map(g =>
            g.id === guard.id ? { ...g, shift_status: newStatus } : g
          ));
        }
      }

      // Execute all updates
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`Updated ${updates.length} guard shift statuses`);
      }

    } catch (error) {
      console.error("Error updating guard shift statuses:", error);
    }
  };

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
    // Limit to 10 characters
    const limitedValue = value.slice(0, 10);
    setFormData({...formData, contactNumber: limitedValue});
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
      isActive: guard.isActive !== undefined ? guard.isActive : true,
      fcmToken: guard.fcmToken || ''
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

    setFormData({
      name: selectedGuard.name || '',
      username: selectedGuard.username || '',
      email: selectedGuard.email || '',
      contactNumber: selectedGuard.contactNumber || '',
      role: selectedGuard.role || 'Guard',
      shift_status: selectedGuard.shift_status || 'Off-duty',
      shift_start: selectedGuard.shift_start || '',
      shift_end: selectedGuard.shift_end || '',
      shiftDays: selectedGuard.shiftDays || {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      },
      isActive: selectedGuard.isActive !== undefined ? selectedGuard.isActive : true,
      fcmToken: selectedGuard.fcmToken || ''
    });

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

  // Function to calculate shift end time (12 hours after start time)
  const calculateShiftEnd = (startTime) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const endTotalMinutes = (totalMinutes + 12 * 60) % (24 * 60); // Add 12 hours, wrap around if needed
    
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMinutes = endTotalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Function to handle shift start time change
  const handleShiftStartChange = (startTime) => {
    const endTime = calculateShiftEnd(startTime);
    setFormData({
      ...formData,
      shift_start: startTime,
      shift_end: endTime
    });
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

  // Validate Philippine phone number (10 digits)
  const isValidPhilippineNumber = (number) => {
    return /^9\d{9}$/.test(number); // Starts with 9, followed by 9 digits (total 10 digits)
  };

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
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Add New Guard</h2>
                        <p className="text-blue-100 text-sm sm:text-base">Create a new security guard account</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setShowPassword(false);
                      }}
                      className="text-white hover:text-blue-100 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6 sm:p-8">
                  <form onSubmit={handleAddGuard} className="space-y-8">
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
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                            placeholder="Enter guard's full name"
                          />
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
                            Username *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={handleUsernameChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                            placeholder="Enter username"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                            placeholder={formData.username ? `${formData.username}@guard.com` : "guard@guard.com"}
                          />
                          <p className="mt-2 text-xs text-gray-500 flex items-center">
                            <i className="fas fa-info-circle mr-1 text-blue-500"></i>
                            Auto-generated from username
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={formData.password}
                              onChange={(e) => setFormData({...formData, password: e.target.value})}
                              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                              placeholder="Create a strong password"
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
                          Contact Number
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={formData.contactNumber}
                            onChange={handleContactNumberChange}
                            className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                              formData.contactNumber && !isValidPhilippineNumber(formData.contactNumber)
                                ? 'border-red-300 focus:ring-red-500'
                                : formData.contactNumber && isValidPhilippineNumber(formData.contactNumber)
                                ? 'border-green-300 focus:ring-green-500'
                                : 'border-gray-300 focus:ring-green-500'
                            }`}
                            placeholder="9123456789"
                            maxLength="10"
                          />
                          {formData.contactNumber && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {isValidPhilippineNumber(formData.contactNumber) ? (
                                <FaCheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <FaExclamationCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <p className={`text-sm ${
                            formData.contactNumber && !isValidPhilippineNumber(formData.contactNumber)
                              ? 'text-red-600'
                              : formData.contactNumber && isValidPhilippineNumber(formData.contactNumber)
                              ? 'text-green-600'
                              : 'text-gray-500'
                          }`}>
                            {formData.contactNumber && !isValidPhilippineNumber(formData.contactNumber)
                              ? 'Please enter a valid 10-digit Philippine mobile number'
                              : formData.contactNumber && isValidPhilippineNumber(formData.contactNumber)
                              ? '✓ Valid Philippine mobile number'
                              : 'Enter 10-digit mobile number (e.g., 9123456789)'}
                          </p>
                          <span className="text-sm text-gray-400 font-medium">
                            {formData.contactNumber?.length || 0}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Shift Information Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                        <div className="bg-amber-500 p-2 rounded-lg mr-3">
                          <FaClock className="h-5 w-5 text-white" />
                        </div>
                        Shift Schedule
                      </h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Shift Start Time
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaClock className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                type="time"
                                value={formData.shift_start}
                                onChange={(e) => handleShiftStartChange(e.target.value)}
                                className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Shift End Time
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaClock className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                type="time"
                                value={formData.shift_end}
                                onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                                className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
                              />
                            </div>
                            {formData.shift_start && (
                              <p className="mt-2 text-xs text-amber-600 flex items-center">
                                <i className="fas fa-info-circle mr-1"></i>
                                Auto-calculated: 12 hours after start time
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Working Days
                          </label>
                          <div className="bg-white bg-opacity-50 rounded-lg p-4 border border-amber-200">
                            <div className="grid grid-cols-7 gap-3">
                              {[
                                { key: 'monday', label: 'Mon', icon: 'M' },
                                { key: 'tuesday', label: 'Tue', icon: 'T' },
                                { key: 'wednesday', label: 'Wed', icon: 'W' },
                                { key: 'thursday', label: 'Thu', icon: 'TH' },
                                { key: 'friday', label: 'Fri', icon: 'F' },
                                { key: 'saturday', label: 'Sat', icon: 'S' },
                                { key: 'sunday', label: 'Sun', icon: 'SU' }
                              ].map(({ key, label, icon }) => (
                                <label key={key} className="flex flex-col items-center cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={formData.shiftDays[key]}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      shiftDays: { ...formData.shiftDays, [key]: e.target.checked }
                                    })}
                                    className="sr-only"
                                  />
                                  <div className={`relative w-12 h-12 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                                    formData.shiftDays[key]
                                      ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                                      : 'bg-white border-gray-300 text-gray-600 hover:border-amber-300 group-hover:bg-amber-50'
                                  }`}>
                                    {icon}
                                    {formData.shiftDays[key] && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                        <FaCheck className="w-2 h-2 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <span className={`text-xs mt-1 font-medium ${
                                    formData.shiftDays[key] ? 'text-amber-700' : 'text-gray-500'
                                  }`}>
                                    {label}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center justify-center">
                              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                <i className="fas fa-calendar-check mr-1 text-amber-500"></i>
                                {Object.values(formData.shiftDays).filter(Boolean).length} day{Object.values(formData.shiftDays).filter(Boolean).length !== 1 ? 's' : ''} selected
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
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
                            Creating Guard Account...
                          </>
                        ) : (
                          <>
                            <FaUserShield className="mr-2" />
                            Add New Guard
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

        {/* Guard Details/Edit Modal */}
        {showGuardDetails && selectedGuard && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeGuardDetails();
              }
            }}
          >
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4 py-4 sm:py-8">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-white sticky top-0 z-10">
                  <h2 className="text-base sm:text-lg font-semibold text-black flex items-center" style={{ color: '#000' }}>
                    {isEditing ? 'Edit Guard' : 'Guard Details'}
                  </h2>
                  <button
                    onClick={closeGuardDetails}
                    className="!text-black hover:text-gray-700"
                    style={{ color: '#000' }}
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="p-4 sm:p-6">
                  {/* Header with Edit Toggle */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg">
                        {selectedGuard.name ? selectedGuard.name.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold !text-black">
                          {selectedGuard.name || 'Unknown Guard'}
                        </h2>
                        <p className="!text-black text-sm sm:text-base" style={{ color: '#000' }}>@{selectedGuard.username}</p>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedGuard.shift_status === 'On-duty' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            <span className={`mr-1 h-1.5 w-1.5 rounded-full ${
                              selectedGuard.shift_status === 'On-duty' ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            {selectedGuard.shift_status || 'Off-duty'}
                          </span>
                          <span className={`ml-2 px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                            selectedGuard.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            <i className={`fas ${selectedGuard.isActive ? 'fa-check-circle mr-1' : 'fa-pause-circle mr-1'} text-xs`}></i>
                            {selectedGuard.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setIsEditing(false);
                          } else {
                            handleEditGuard();
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isEditing
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <i className={`fas ${isEditing ? 'fa-times' : 'fa-edit'} mr-2`}></i>
                        {isEditing ? 'Cancel' : 'Edit Guard'}
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    /* Edit Mode */
                    <form onSubmit={handleUpdateGuard} className="space-y-6">
                      {/* Personal Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <FaUser className="mr-2 text-blue-500" />
                          Personal Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder="Enter guard's full name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Contact Number
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                value={formData.contactNumber}
                                onChange={handleContactNumberChange}
                                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                                  formData.contactNumber && !isValidPhilippineNumber(formData.contactNumber)
                                    ? 'border-red-300 focus:ring-red-500'
                                    : formData.contactNumber && isValidPhilippineNumber(formData.contactNumber)
                                    ? 'border-green-300 focus:ring-green-500'
                                    : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder="9123456789"
                                maxLength="10"
                              />
                              {formData.contactNumber && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                  {isValidPhilippineNumber(formData.contactNumber) ? (
                                    <FaCheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <FaExclamationCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="mt-1 flex justify-between items-center">
                              <p className={`text-xs ${
                                formData.contactNumber && !isValidPhilippineNumber(formData.contactNumber)
                                  ? 'text-red-600'
                                  : formData.contactNumber && isValidPhilippineNumber(formData.contactNumber)
                                  ? 'text-green-600'
                                  : 'text-gray-500'
                              }`}>
                                {formData.contactNumber && !isValidPhilippineNumber(formData.contactNumber)
                                  ? 'Please enter a valid 10-digit Philippine mobile number'
                                  : formData.contactNumber && isValidPhilippineNumber(formData.contactNumber)
                                  ? 'Valid Philippine mobile number'
                                  : 'Enter 10-digit mobile number (e.g., 9123456789)'}
                              </p>
                              <span className="text-xs text-gray-400">
                                {formData.contactNumber?.length || 0}/10
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Account Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <i className="fas fa-user-lock mr-2 text-indigo-500"></i>
                          Account Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Username *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.username}
                              onChange={handleUsernameChange}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder="Enter username"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder="guard@guard.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Role
                            </label>
                            <input
                              type="text"
                              value={formData.role}
                              onChange={(e) => setFormData({...formData, role: e.target.value})}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder="Guard"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Shift Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <FaClock className="mr-2 text-amber-500" />
                          Shift Information
                        </h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium !text-black mb-2">
                                Shift Start Time
                              </label>
                              <input
                                type="time"
                                value={formData.shift_start}
                                onChange={(e) => handleShiftStartChange(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium !text-black mb-2">
                                Shift End Time
                              </label>
                              <input
                                type="time"
                                value={formData.shift_end}
                                onChange={(e) => setFormData({...formData, shift_end: e.target.value})}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium !text-black mb-3">
                              Shift Days
                            </label>
                            <div className="grid grid-cols-7 gap-2">
                              {[
                                { key: 'monday', label: 'Mon' },
                                { key: 'tuesday', label: 'Tue' },
                                { key: 'wednesday', label: 'Wed' },
                                { key: 'thursday', label: 'Thu' },
                                { key: 'friday', label: 'Fri' },
                                { key: 'saturday', label: 'Sat' },
                                { key: 'sunday', label: 'Sun' }
                              ].map(({ key, label }) => (
                                <label key={key} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.shiftDays[key]}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      shiftDays: { ...formData.shiftDays, [key]: e.target.checked }
                                    })}
                                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm !text-black">{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status & Settings Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <i className="fas fa-cog mr-2 text-gray-500"></i>
                          Status & Settings
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Shift Status
                            </label>
                            <select
                              value={formData.shift_status}
                              onChange={(e) => setFormData({...formData, shift_status: e.target.value})}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option value="Off-duty">Off-duty</option>
                              <option value="On-duty">On-duty</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium !text-black mb-2">
                              Account Status
                            </label>
                            <select
                              value={formData.isActive}
                              onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option value={true}>Active</option>
                              <option value={false}>Inactive</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
                        <button
                          type="button"
                          disabled={formSubmitting}
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-3 border border-gray-300 rounded-lg !text-black hover:bg-gray-50 disabled:opacity-50 transition-all font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-all font-medium"
                        >
                          {formSubmitting ? (
                            <>
                              <FaSpinner className="animate-spin mr-2" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Update Guard
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* View Mode */
                    <div className="space-y-6">
                      {/* Personal Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <FaUser className="mr-2 text-blue-500" />
                          Personal Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <p className="text-sm !text-black font-medium mb-1">Full Name</p>
                            <p className="text-base !text-black font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-l-4 border-blue-500" style={{ color: '#000' }}>{selectedGuard.name || 'N/A'}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-sm !text-black font-medium mb-1">Contact Number</p>
                            <p className="text-base !text-black font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-l-4 border-green-500 flex items-center" style={{ color: '#000' }}>
                              <i className="fas fa-phone-alt mr-2 text-green-600"></i>
                              {selectedGuard.contactNumber || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Account Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <i className="fas fa-user-lock mr-2 text-indigo-500"></i>
                          Account Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm !text-black font-medium mb-1">Username</p>
                            <p className="text-base !text-black font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-l-4 border-purple-500 flex items-center" style={{ color: '#000' }}>
                              <span className="text-purple-600 font-bold mr-1">@</span>
                              {selectedGuard.username || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm !text-black font-medium mb-1">Email</p>
                            <p className="text-base !text-black font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-l-4 border-indigo-500 flex items-center" style={{ color: '#000' }}>
                              <i className="fas fa-envelope mr-2 text-indigo-600"></i>
                              {selectedGuard.email || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm !text-black font-medium mb-1">Role</p>
                            <p className="text-base !text-black font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-l-4 border-orange-500 flex items-center" style={{ color: '#000' }}>
                              <i className="fas fa-user-shield mr-2 text-orange-600"></i>
                              {selectedGuard.role || 'Guard'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Shift Information Card */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold !text-black mb-4 flex items-center">
                          <FaClock className="mr-2 text-amber-500" />
                          Shift Information
                        </h3>
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="!text-black font-medium mb-1">Shift Time</p>
                              <p className="!text-black">
                                {selectedGuard.shift_start && selectedGuard.shift_end
                                  ? `${formatTime(selectedGuard.shift_start)} - ${formatTime(selectedGuard.shift_end)}`
                                  : 'Not set'}
                              </p>
                            </div>
                            <div>
                              <p className="!text-black font-medium mb-1">Shift Days</p>
                              <p className="!text-black">{formatShiftDays(selectedGuard.shiftDays)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
