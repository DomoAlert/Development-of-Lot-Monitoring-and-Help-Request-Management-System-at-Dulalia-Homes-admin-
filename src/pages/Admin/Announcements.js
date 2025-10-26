import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
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
    <ResponsiveLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <div className="flex flex-wrap justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
                <MegaphoneIcon className="h-8 w-8 mr-3 text-blue-500" />
                Announcements
              </h1>
              <p className="text-gray-600 text-gray-700 mt-2">Create and manage community announcements</p>
            </div>
            <button
              onClick={fetchAnnouncements}
              disabled={loading}
              className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                loading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              } transition-colors mt-2 sm:mt-0`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              setIsEditing(false);
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Announcement
          </button>
        </div>

        {/* Create/Edit Announcement Form */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg border border-gray-100 border-gray-200 animate-fadeIn">
              <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h2 className="text-xl font-bold text-gray-800 text-black flex items-center">
                  <MegaphoneIcon className="h-5 w-5 mr-2 text-blue-500" />
                  {isEditing ? 'Edit Announcement' : 'New Announcement'}
                </h2>
                <button 
                  onClick={closeForm}
                  className="p-2 hover:bg-gray-100 hover:bg-gray-50 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={isEditing ? handleUpdateSubmit : handleCreateSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter announcement title"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                      Type
                    </label>
                    <select 
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Notice">Notice</option>
                      <option value="Update">Update</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                      Status
                    </label>
                    <select 
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter announcement content"
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                      Visible To
                    </label>
                    <select 
                      required
                      value={formData.visibleTo}
                      onChange={(e) => setFormData({...formData, visibleTo: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="both">Everyone</option>
                      <option value="homeowner">Homeowners Only</option>
                      <option value="guard">Guards Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                      Target Audience
                    </label>
                    <select 
                      required
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="guard">For Guards</option>
                      <option value="homeowner">For Homeowners</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-blue-50 bg-blue-50 rounded-lg p-4 border border-blue-100 border-blue-200">
                  <label className="flex items-center text-sm font-medium text-gray-700 text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) => setFormData({...formData, isVisible: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 border-gray-300 rounded mr-2"
                    />
                    Visible in App
                  </label>
                  <p className="text-xs text-gray-500 text-gray-600 mt-1 ml-6">
                    When unchecked, the announcement will be hidden from all users.
                  </p>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-5 py-2.5 rounded-lg border border-gray-300 border-gray-300 text-gray-700 text-gray-700 hover:bg-gray-50 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm hover:shadow transition-all flex items-center"
                  >
                    {isEditing ? (
                      <>
                        <PencilIcon className="h-4 w-4 mr-1.5" />
                        Update Announcement
                      </>
                    ) : (
                      <>
                        <MegaphoneIcon className="h-4 w-4 mr-1.5" />
                        Post Announcement
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Announcements List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MegaphoneIcon className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No announcements yet</p>
              <p className="text-sm text-gray-400">Create your first announcement to get started</p>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Create Announcement
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-6 transition-colors hover:bg-blue-50/30">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                          ${announcement.type === 'Urgent' 
                            ? 'bg-red-100' 
                            : announcement.type === 'Update' 
                              ? 'bg-green-100' 
                              : 'bg-blue-100'}`}>
                          <MegaphoneIcon className={`h-6 w-6 
                            ${announcement.type === 'Urgent' 
                              ? 'text-red-500' 
                              : announcement.type === 'Update' 
                                ? 'text-green-500' 
                                : 'text-blue-500'}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {announcement.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(announcement.type)}`}>
                              {announcement.type || 'Notice'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${announcement.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {announcement.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm break-words whitespace-pre-line mb-3 line-clamp-3">
                          {announcement.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                            {announcement.date}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full ${announcement.isVisible ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                            {announcement.isVisible ? getVisibilityText(announcement.visibleTo) : 'Hidden'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full ${
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditClick(announcement)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}

export default Announcements;
