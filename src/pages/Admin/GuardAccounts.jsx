import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { toast } from 'react-toastify';
import { FaUserShield, FaEdit, FaTrash, FaTimes, FaSpinner, FaClock, FaToggleOn, FaToggleOff } from 'react-icons/fa';
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
    isActive: true,
    fcmToken: ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch guards
  useEffect(() => {
    document.title = "Guard Accounts";
    fetchGuards();
  }, []);

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
      toast.error('Error fetching guards: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuard = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    
    try {
      // Generate email from username if not provided
      const guardEmail = formData.email || `${formData.username}@guard.com`;
      const guardPassword = formData.password || formData.username; // Default password is username if not specified
      
      // First create the auth account
      const userCredential = await createUserWithEmailAndPassword(auth, guardEmail, guardPassword);
      const uid = userCredential.user.uid;
      
      // Then create the guard document in Firestore with the same ID as the Auth UID
      await setDoc(doc(db, 'guards', uid), {
        name: formData.name,
        username: formData.username,
        email: guardEmail,
        password: guardPassword, // Store password for reference (not recommended in production)
        contactNumber: formData.contactNumber,
        role: 'Guard',
        shift_status: 'Off-duty',
        shift_start: formData.shift_start,
        shift_end: formData.shift_end,
        isActive: true,
        fcmToken: '',
        uid: uid, // Still include uid in the document for reference
        created_at: serverTimestamp(),
        last_active: serverTimestamp()
      });
      
      toast.success('Guard added successfully');
      setShowForm(false);
      resetForm();
      fetchGuards();
    } catch (error) {
      // Handle different Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password.');
      } else {
        toast.error('Error adding guard: ' + error.message);
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateGuard = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    
    if (!selectedGuard) return;
    
    try {
      // Generate email from username if not provided
      const guardEmail = formData.email || `${formData.username}@guard.com`;
      
      await updateDoc(doc(db, 'guards', selectedGuard.id), { // Changed 'users' to 'guards'
        name: formData.name,
        username: formData.username,
        email: guardEmail,
        contactNumber: formData.contactNumber,
        shift_start: formData.shift_start,
        shift_end: formData.shift_end,
        last_active: serverTimestamp()
      });
      
      toast.success('Guard updated successfully');
      setShowGuardDetails(false);
      setIsEditing(false);
      setSelectedGuard(null);
      resetForm();
      fetchGuards();
    } catch (error) {
      toast.error('Error updating guard: ' + error.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleShiftStatus = async (id, currentStatus) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'guards', id), { // Changed 'users' to 'guards'
        shift_status: currentStatus === 'On-duty' ? 'Off-duty' : 'On-duty',
        last_active: serverTimestamp()
      });
      toast.success('Guard shift status updated');
      fetchGuards();
    } catch (error) {
      toast.error('Error updating guard shift status: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'guards', id), { // Changed 'users' to 'guards'
        isActive: !currentActive,
        last_active: serverTimestamp()
      });
      toast.success('Guard active status updated');
      fetchGuards();
    } catch (error) {
      toast.error('Error updating guard active status: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGuard = async (id) => {
    if (window.confirm('Are you sure you want to delete this guard?')) {
      setActionLoading(id);
      try {
        // Delete the Firestore document
        await deleteDoc(doc(db, 'guards', id));
        
        // Note: To properly delete the Auth user, you would need to do this from a secure backend
        // with Firebase Admin SDK, as client-side code cannot delete users for security reasons
        toast.info('Note: The authentication account must be deleted via Firebase console');
        
        toast.success('Guard deleted successfully');
        fetchGuards();
      } catch (error) {
        toast.error('Error deleting guard: ' + error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleViewGuard = (guard) => {
    setSelectedGuard(guard);
    setShowGuardDetails(true);
    setIsEditing(false);
  };

  const handleEditGuard = () => {
    if (!selectedGuard) return;
    
    setFormData({
      name: selectedGuard.name || '',
      username: selectedGuard.username || '',
      email: selectedGuard.email || '',
      password: selectedGuard.password || '',
      contactNumber: selectedGuard.contactNumber || '',
      role: 'Guard',
      shift_status: selectedGuard.shift_status || 'Off-duty',
      shift_start: selectedGuard.shift_start || '',
      shift_end: selectedGuard.shift_end || '',
      isActive: selectedGuard.isActive !== undefined ? selectedGuard.isActive : true,
      fcmToken: selectedGuard.fcmToken || ''
    });
    
    setIsEditing(true);
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData({
      ...formData,
      username,
      email: `${username}@guard.com`
    });
  };

  const resetForm = () => {
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
      isActive: true,
      fcmToken: ''
    });
  };

  const closeGuardDetails = () => {
    setShowGuardDetails(false);
    setSelectedGuard(null);
    setIsEditing(false);
  };

  const filteredGuards = guards.filter(guard => 
    ((guard.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (guard.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (guard.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const onDutyCount = guards.filter(guard => guard.shift_status === 'On-duty').length;
  const offDutyCount = guards.filter(guard => guard.shift_status === 'Off-duty').length;
  const totalShiftsToday = guards.filter(guard => guard.shift_start && guard.shift_end).length;
  const activeAccounts = guards.filter(guard => guard.isActive).length;

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Guard Accounts</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New Guard
          </button>
        </div>

        {/* Status Dashboard */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Guard Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">On-duty Guards</p>
              <p className="text-2xl font-bold text-green-600">{onDutyCount}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Off-duty Guards</p>
              <p className="text-2xl font-bold text-red-600">{offDutyCount}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Shifts Today</p>
              <p className="text-2xl font-bold text-yellow-600">{totalShiftsToday}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Active Accounts</p>
              <p className="text-2xl font-bold text-blue-600">{activeAccounts}</p>
            </div>
          </div>
        </div>

        {/* Search and filter section */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search guards by name, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Add Guard Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add New Guard</h2>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleAddGuard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={formData.username ? `${formData.username}@guard.com` : "guard@guard.com"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If left empty, email will be automatically generated from username
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If left empty, password will be the same as username
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 09123456789"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Start
                    </label>
                    <input
                      type="time"
                      value={formData.shift_start}
                      onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    disabled={formSubmitting}
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {formSubmitting ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      'Add Guard'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Guard Details/Edit Modal */}
        {showGuardDetails && selectedGuard && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
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
              
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl">
                      <FaUserShield />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedGuard.name || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{selectedGuard.username || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedGuard.email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{selectedGuard.contactNumber || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium">{selectedGuard.role || 'Guard'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Shift Status</p>
                    <p className={`font-medium ${selectedGuard.shift_status === 'On-duty' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedGuard.shift_status || 'Off-duty'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Shift Start</p>
                      <p className="font-medium flex items-center">
                        <FaClock className="text-gray-400 mr-1" />
                        {selectedGuard.shift_start || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shift End</p>
                      <p className="font-medium flex items-center">
                        <FaClock className="text-gray-400 mr-1" />
                        {selectedGuard.shift_end || 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Last Active</p>
                    <p className="font-medium">
                      {selectedGuard.last_active ? new Date(selectedGuard.last_active.seconds * 1000).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      onClick={handleEditGuard}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <FaEdit className="mr-2" />
                      Edit Guard
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
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 09123456789"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shift Start
                      </label>
                      <input
                        type="time"
                        value={formData.shift_start}
                        onChange={(e) => setFormData({...formData, shift_start: e.target.value})}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      disabled={formSubmitting}
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {formSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        'Update Guard'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Guards table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <FaSpinner className="animate-spin text-primary mx-auto h-8 w-8 mb-4" />
              <p className="text-gray-600">Loading guards...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guard
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shift Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuards.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      No guards found
                    </td>
                  </tr>
                ) : (
                  filteredGuards.map((guard) => (
                    <tr key={guard.id} className={actionLoading === guard.id ? "bg-gray-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleViewGuard(guard)}
                          className="flex items-center hover:text-primary"
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center mr-3">
                            {guard.username ? guard.username.charAt(0).toUpperCase() : 'G'}
                          </div>
                          <div className="ml-0">
                            <div className="text-sm font-medium text-gray-900">
                              {guard.name || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {guard.username || 'N/A'}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {guard.shift_start && guard.shift_end ? (
                          <div className="text-sm text-gray-900 flex items-center">
                            <FaClock className="text-gray-400 mr-1" />
                            {`${guard.shift_start} - ${guard.shift_end}`}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Not set</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-2 ${
                            guard.shift_status === 'On-duty' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {guard.shift_status || 'Off-duty'}
                          </span>
                          
                          <span className={`inline-flex h-2 w-2 rounded-full ${
                            guard.isActive ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {actionLoading === guard.id ? (
                          <div className="flex items-center justify-center">
                            <FaSpinner className="animate-spin text-primary" />
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleToggleShiftStatus(guard.id, guard.shift_status)}
                              className="text-primary hover:text-blue-700 mr-3 flex items-center"
                            >
                              {guard.shift_status === 'On-duty' ? (
                                <>
                                  <FaToggleOff className="mr-1" />
                                  Set Off-duty
                                </>
                              ) : (
                                <>
                                  <FaToggleOn className="mr-1" />
                                  Set On-duty
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => handleToggleActive(guard.id, guard.isActive)}
                              className={`mr-3 flex items-center ${guard.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                            >
                              {guard.isActive ? (
                                <>
                                  <FaToggleOff className="mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <FaToggleOn className="mr-1" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => handleDeleteGuard(guard.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default GuardAccounts;