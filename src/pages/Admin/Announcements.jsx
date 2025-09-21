import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { SpeakerphoneIcon as MegaphoneIcon, CalendarIcon, PencilIcon, TrashIcon } from '@heroicons/react/outline';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Card, CardHeader, CardBody, Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge, Modal } from '../../components/AdminUI';
import withAdminPage from '../../components/withAdminPage';

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAnnouncementId, setCurrentAnnouncementId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'Notice',
    status: 'Active',
    isVisible: true,
    visibleTo: 'both', // 'homeowner', 'guard', or 'both'
    targetAudience: 'all' // Add this new field
  });

  useEffect(() => {
    document.title = "Announcements";
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'announcements'));
      const announcementsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: doc.data().type || 'Notice', // Ensure type has a default value
        status: doc.data().status || 'Active',
        isVisible: doc.data().isVisible !== undefined ? doc.data().isVisible : true,
        visibleTo: doc.data().visibleTo || 'both',
        date: doc.data().timestamp?.toDate()?.toLocaleDateString() || new Date().toLocaleDateString()
      }));
      setAnnouncements(announcementsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      toast.error('Error fetching announcements: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'announcements'), {
        ...formData,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('Announcement posted successfully');
      setShowForm(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error('Error posting announcement: ' + error.message);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'announcements', currentAnnouncementId), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast.success('Announcement updated successfully');
      setShowForm(false);
      setIsEditing(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error('Error updating announcement: ' + error.message);
    }
  };

  const handleEditClick = (announcement) => {
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      type: announcement.type || 'Notice',
      status: announcement.status || 'Active',
      isVisible: announcement.isVisible !== undefined ? announcement.isVisible : true,
      visibleTo: announcement.visibleTo || 'both',
      targetAudience: announcement.targetAudience || 'all' // Add this
    });
    setCurrentAnnouncementId(announcement.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
        toast.success('Announcement deleted successfully');
        fetchAnnouncements();
      } catch (error) {
        toast.error('Error deleting announcement: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'Notice',
      status: 'Active',
      isVisible: true,
      visibleTo: 'both',
      targetAudience: 'all' // Add this
    });
    setCurrentAnnouncementId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(false);
    resetForm();
  };

  const getTypeColor = (type) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    
    switch (type.toLowerCase()) {
      case 'notice':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-green-100 text-green-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityText = (visibleTo) => {
    switch (visibleTo) {
      case 'homeowner':
        return 'Visible to Homeowners';
      case 'guard':
        return 'Visible to Guards';
      case 'both':
      default:
        return 'Visible to All';
    }
  };

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Announcements</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              setIsEditing(false);
              resetForm();
              setShowForm(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create Announcement
          </button>
        </div>

        {/* Create/Edit Announcement Form */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {isEditing ? 'Edit Announcement' : 'New Announcement'}
                </h2>
                <button 
                  onClick={closeForm}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <form onSubmit={isEditing ? handleUpdateSubmit : handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter announcement title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Notice">Notice</option>
                    <option value="Update">Update</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter announcement content"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visible To
                  </label>
                  <select 
                    required
                    value={formData.visibleTo}
                    onChange={(e) => setFormData({...formData, visibleTo: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="both">Everyone</option>
                    <option value="homeowner">Homeowners Only</option>
                    <option value="guard">Guards Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience
                  </label>
                  <select 
                    required
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All</option>
                    <option value="guard">For Guards</option>
                    <option value="homeowner">For Homeowners</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) => setFormData({...formData, isVisible: e.target.checked})}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-2"
                    />
                    Visible in App
                  </label>
                  <p className="text-xs text-gray-500">
                    When unchecked, the announcement will be hidden from all users.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select 
                    required
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
                    {isEditing ? 'Update Announcement' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center p-4">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center p-4 text-gray-500">No announcements yet</div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between flex-wrap">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <MegaphoneIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {announcement.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(announcement.type)}`}>
                          {announcement.type || 'Notice'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${announcement.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {announcement.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${announcement.isVisible ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {announcement.isVisible ? getVisibilityText(announcement.visibleTo) : 'Hidden'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          announcement.targetAudience === 'guard' 
                            ? 'bg-blue-100 text-blue-800' 
                            : announcement.targetAudience === 'homeowner'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {announcement.targetAudience === 'guard' 
                            ? '👮 For Guards' 
                            : announcement.targetAudience === 'homeowner'
                            ? '🏠 For Homeowners'
                            : '📢 For All'}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-600 break-words whitespace-pre-wrap overflow-hidden">
                        {announcement.content}
                      </p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {announcement.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-2 sm:mt-0">
                    <button 
                      onClick={() => handleEditClick(announcement)}
                      className="text-primary hover:text-blue-700 flex items-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-700 flex items-center"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default Announcements;