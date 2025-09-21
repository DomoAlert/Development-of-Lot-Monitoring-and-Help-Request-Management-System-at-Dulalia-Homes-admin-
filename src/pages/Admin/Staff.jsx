import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { UserCircleIcon } from '@heroicons/react/outline';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';

function Staff() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState(null);
  
  // Updated form data to include positions as an array
  const [formData, setFormData] = useState({
    name: '',
    positions: [], // Changed to array for multiple roles
    email: '',
    phone: '',
    status: 'Active'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  // Available positions
  const availablePositions = ["Plumber", "Street Sweeper", "Electrician"];

  useEffect(() => {
    document.title = "Staff list";
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'staff'));
      const staffData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure positions is always an array
        positions: doc.data().positions || []
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
    
    // Validate phone number
    if (!validatePhoneNumber(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    // Validate at least one position is selected
    if (formData.positions.length === 0) {
      toast.error('Please select at least one position');
      return;
    }
    
    try {
      await addDoc(collection(db, 'staff'), formData);
      toast.success('Staff member added successfully');
      setShowForm(false);
      setFormData({ 
        name: '', 
        positions: [], 
        email: '', 
        phone: '', 
        status: 'Active' 
      });
      fetchStaff();
    } catch (error) {
      toast.error('Error adding staff member: ' + error.message);
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    
    // Validate phone number
    if (!validatePhoneNumber(formData.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    // Validate at least one position is selected
    if (formData.positions.length === 0) {
      toast.error('Please select at least one position');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'staff', currentStaffId), formData);
      toast.success('Staff member updated successfully');
      setShowForm(false);
      setIsEditing(false);
      setCurrentStaffId(null);
      setFormData({ 
        name: '', 
        positions: [], 
        email: '', 
        phone: '', 
        status: 'Active' 
      });
      fetchStaff();
    } catch (error) {
      toast.error('Error updating staff member: ' + error.message);
    }
  };

  const handleEditStaff = (staff) => {
    setFormData({
      name: staff.name || '',
      positions: staff.positions || [], // Use array of positions
      email: staff.email || '',
      phone: staff.phone || '',
      status: staff.status || 'Active'
    });
    setCurrentStaffId(staff.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handlePositionChange = (position) => {
    // Toggle position in array
    setFormData(prevData => {
      if (prevData.positions.includes(position)) {
        return {
          ...prevData,
          positions: prevData.positions.filter(p => p !== position)
        };
      } else {
        return {
          ...prevData,
          positions: [...prevData.positions, position]
        };
      }
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
    setFormData({ 
      name: '', 
      positions: [], 
      email: '', 
      phone: '', 
      status: 'Active' 
    });
  };

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = 
      (staff.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if staff has the filtered position
    const matchesPosition = !positionFilter || 
      (staff.positions && staff.positions.includes(positionFilter));
    
    return matchesSearch && matchesPosition;
  });

  // Update the formatPhoneNumber function
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters except the +63 prefix
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Remove +63 if it exists to handle just the number part
    const numberPart = cleaned.startsWith('+63') ? cleaned.substring(3) : cleaned;
    
    // Format the number with +63 prefix
    if (numberPart.length > 0) {
      let formatted = '+63 ';
      if (numberPart.length > 3) {
        formatted += numberPart.substring(0, 3) + ' ';
      } else {
        formatted += numberPart;
      }
      if (numberPart.length > 6) {
        formatted += numberPart.substring(3, 6) + ' ';
        formatted += numberPart.substring(6, 10);
      } else if (numberPart.length > 3) {
        formatted += numberPart.substring(3);
      }
      return formatted;
    }
    return '+63 ';
  };

  // Update the validatePhoneNumber function
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    const numberPart = cleaned.startsWith('+63') ? cleaned.substring(3) : cleaned;
    return numberPart.length === 10;
  };

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Staff Management</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              setIsEditing(false);
              setFormData({ 
                name: '', 
                positions: [], 
                email: '', 
                phone: '', 
                status: 'Active' 
              });
              setShowForm(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New Staff
          </button>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select 
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Positions</option>
            {availablePositions.map(position => (
              <option key={position} value={position}>{position}</option>
            ))}
          </select>
        </div>

        {/* Add/Edit Staff Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h2>
                <button 
                  onClick={closeForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <form onSubmit={isEditing ? handleUpdateStaff : handleAddStaff} className="space-y-4">
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
                
                {/* Multiple position selection with checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Positions (Select all that apply)
                  </label>
                  <div className="space-y-2">
                    {availablePositions.map(position => (
                      <div key={position} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`position-${position}`}
                          checked={formData.positions.includes(position)}
                          onChange={() => handlePositionChange(position)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`position-${position}`} className="ml-2 block text-sm text-gray-900">
                          {position}
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.positions.length === 0 && (
                    <p className="text-red-500 text-xs mt-1">Please select at least one position</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone || '+63 '}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Ensure +63 is always present
                      if (!value.startsWith('+63')) {
                        value = '+63 ' + value.replace('+63', '');
                      }
                      const formattedNumber = formatPhoneNumber(value);
                      setFormData({...formData, phone: formattedNumber});
                    }}
                    onFocus={(e) => {
                      // If empty, show +63 prefix when focused
                      if (!e.target.value) {
                        setFormData({...formData, phone: '+63 '});
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '+63 ') {
                        setFormData({...formData, phone: ''});
                      } else if (!validatePhoneNumber(e.target.value)) {
                        toast.error('Please enter a valid 10-digit phone number');
                      }
                    }}
                    placeholder="+63 945 754 0793"
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: +63 XXX XXX XXXX</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
                  >
                    {isEditing ? 'Update Staff' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Staff table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Positions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
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
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCircleIcon className="h-10 w-10 text-gray-400" />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {staff.positions && staff.positions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {staff.positions.map(position => (
                                <span 
                                  key={position} 
                                  className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                                >
                                  {position}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "No positions assigned"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{staff.email}</div>
                        <div className="text-sm text-gray-500">{staff.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          staff.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {staff.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => handleEditStaff(staff)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(staff.id, staff.status)}
                          className="text-yellow-600 hover:text-yellow-700 mr-3"
                        >
                          Toggle Status
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
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

export default Staff;