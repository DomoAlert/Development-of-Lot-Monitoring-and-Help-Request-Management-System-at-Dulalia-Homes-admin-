import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { FaUser, FaEdit, FaTrash, FaTimes, FaSpinner } from 'react-icons/fa';

function UserAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nextHouseNumber, setNextHouseNumber] = useState(1);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    contactNumber: '', // Added contact number
    house_no: 1,
    role: 'Homeowner',
    status: 'Active',
    isActive: true,
    recordStatus: 'Neutral', // Default record status
    password: '', // Default password
    fcmToken: '' // Empty token initially
  });
  
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users and determine next house number
  useEffect(() => {
    document.title = "Homeowner Accounts";
    fetchUsers();
    determineNextHouseNumber();
  }, []);

  const determineNextHouseNumber = async () => {
    try {
      // Get the user with the highest house number
      const q = query(collection(db, 'users'), orderBy('house_no', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const highestHouseNo = querySnapshot.docs[0].data().house_no || 0;
        setNextHouseNumber(highestHouseNo + 1);
        setFormData(prev => ({ ...prev, house_no: highestHouseNo + 1 }));
      } else {
        setNextHouseNumber(1);
        setFormData(prev => ({ ...prev, house_no: 1 }));
      }
    } catch (error) {
      console.error("Error determining next house number:", error);
      toast.error('Error determining next house number');
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
        house_no: formData.house_no,
        role: 'Homeowner',
        status: 'Active',
        isActive: true,
        recordStatus: 'Neutral', // Default record status
        password: userPassword, // Storing for reference (not recommended in production)
        fcmToken: '',
        uid: uid, // Still include uid in the document for reference
        created_at: serverTimestamp(),
        last_updated: serverTimestamp()
      });
      
      toast.success('User added successfully');
      setShowForm(false);
      resetForm();
      fetchUsers();
      determineNextHouseNumber(); // Update next house number
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
      
      await updateDoc(doc(db, 'users', selectedUser.id), {
        ...formData,
        email: userEmail,
        last_updated: serverTimestamp()
      });
      
      toast.success('User updated successfully');
      setShowUserDetails(false);
      setIsEditing(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
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
      toast.success(`Homeowner marked as ${recordStatus}`);
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
    
    setFormData({
      firstName: selectedUser.firstName || '',
      lastName: selectedUser.lastName || '',
      username: selectedUser.username || '',
      email: selectedUser.email || '',
      contactNumber: selectedUser.contactNumber || '', // Added contact number
      house_no: selectedUser.house_no || 1,
      role: selectedUser.role || 'Homeowner',
      status: selectedUser.status || 'Active',
      isActive: selectedUser.isActive !== undefined ? selectedUser.isActive : true,
      password: selectedUser.password || '',
      fcmToken: selectedUser.fcmToken || ''
    });
    
    setIsEditing(true);
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData({
      ...formData,
      username,
      email: `${username}@example.com`
    });
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      contactNumber: '', // Added contact number
      house_no: nextHouseNumber,
      role: 'Homeowner',
      status: 'Active',
      isActive: true,
      password: '',
      fcmToken: ''
    });
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
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Accounts</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New User
          </button>
        </div>

        {/* Search and filter section */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by name, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Add User Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add New User</h2>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="flex justify-between items-start">
                <div className="user-details flex-1">
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
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
                        placeholder={formData.username ? `${formData.username}@example.com` : "email@example.com"}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If left empty, email will be automatically generated from username
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        House Number
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.house_no}
                        readOnly
                        className="w-full px-4 py-2 rounded-md border border-gray-300 bg-gray-50 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        House number is automatically assigned
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
                          'Add User'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
                <div className="user-preview bg-white p-4 rounded-lg shadow-md w-64 ml-4">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-2xl font-bold mb-2">
                      {formData.firstName && formData.lastName ? formData.firstName[0] + formData.lastName[0] : 'U'}
                    </div>
                    <h3 className="font-semibold text-lg">{formData.firstName} {formData.lastName}</h3>
                    <p className="text-sm text-gray-500">House #{formData.house_no}</p>
                    <div className="mt-3 flex justify-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${formData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Details/Edit Modal */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {isEditing ? 'Edit User' : 'User Details'}
                </h2>
                <button 
                  onClick={closeUserDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl">
                      <FaUser />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">First Name</p>
                      <p className="font-medium">{selectedUser.firstName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Name</p>
                      <p className="font-medium">{selectedUser.lastName || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{selectedUser.username || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedUser.email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">House Number</p>
                    <p className="font-medium">{selectedUser.house_no || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium">{selectedUser.role || 'Homeowner'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className={`font-medium ${selectedUser.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedUser.status || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Contact Number</p>
                    <p className="font-medium">{selectedUser.contactNumber || 'N/A'}</p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      onClick={handleEditUser}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <FaEdit className="mr-2" />
                      Edit User
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
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
    House Number
  </label>
  <input
    type="number"
    value={formData.house_no}
    readOnly
    className="w-full px-4 py-2 rounded-md border border-gray-300 bg-gray-50 focus:outline-none"
  />
  <p className="text-xs text-gray-500 mt-1">
    House number cannot be changed
  </p>
</div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value, isActive: e.target.value === 'Active'})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                        'Update User'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <FaSpinner className="animate-spin text-primary mx-auto h-8 w-8 mb-4" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    House No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Record
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className={actionLoading === user.id ? "bg-gray-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleViewUser(user)}
                          className="flex items-center hover:text-primary"
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center mr-3">
                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="ml-0">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getFullName(user)}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.house_no || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.recordStatus === 'Good' ? 'bg-green-100 text-green-800' : 
                          user.recordStatus === 'Bad' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.recordStatus || 'Neutral'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {actionLoading === user.id ? (
                          <div className="flex items-center justify-center">
                            <FaSpinner className="animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleToggleStatus(user.id, user.status)}
                                className="text-primary hover:text-blue-700"
                              >
                                Toggle Status
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleSetRecordStatus(user.id, 'Good')}
                                className="text-green-600 hover:text-green-700 text-xs"
                              >
                                Mark Good
                              </button>
                              <button 
                                onClick={() => handleSetRecordStatus(user.id, 'Bad')}
                                className="text-red-600 hover:text-red-700 text-xs"
                              >
                                Mark Bad
                              </button>
                              <button 
                                onClick={() => handleSetRecordStatus(user.id, 'Neutral')}
                                className="text-gray-600 hover:text-gray-700 text-xs"
                              >
                                Reset
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
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default UserAccounts;