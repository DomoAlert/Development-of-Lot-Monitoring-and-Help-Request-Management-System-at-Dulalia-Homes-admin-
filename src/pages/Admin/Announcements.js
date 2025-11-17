import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { SpeakerphoneIcon as MegaphoneIcon, CalendarIcon, PencilIcon, TrashIcon } from '@heroicons/react/outline';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';


function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAnnouncementId, setCurrentAnnouncementId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'Notice',
    status: 'Active',
    audience: 'everyone', // 'everyone', 'homeowners', 'guards'
    expiresAt: null // Will be auto-set based on type
  });

  useEffect(() => {
    document.title = "Announcements";
    fetchAnnouncements();
    // Initialize form with default expiration date
    setFormData(prev => ({
      ...prev,
      expiresAt: getExpirationDate('Notice')
    }));
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'announcements'));
      const announcementsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Map old fields to new audience structure for backward compatibility
        let audience = 'everyone';
        if (data.audience?.group) {
          audience = data.audience.group;
        } else if (data.visibleTo === 'homeowner' && data.targetAudience === 'homeowner') {
          audience = 'homeowners';
        } else if (data.visibleTo === 'guard' && data.targetAudience === 'guard') {
          audience = 'guards';
        }
        
        return {
          id: doc.id,
          ...data,
          type: data.type || 'Notice',
          status: data.status || 'Active',
          audience: audience,
          expiresAt: data.expiresAt,
          date: data.timestamp?.toDate()?.toLocaleDateString() || new Date().toLocaleDateString()
        };
      });
      setAnnouncements(announcementsData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      toast.error('Error fetching announcements: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Prepare audience data
      let audienceData = { group: formData.audience };
      
      await addDoc(collection(db, 'announcements'), {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        status: formData.status,
        audience: audienceData,
        expiresAt: formData.expiresAt,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Prepare audience data
      let audienceData = { group: formData.audience };
      
      await updateDoc(doc(db, 'announcements', currentAnnouncementId), {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        status: formData.status,
        audience: audienceData,
        expiresAt: formData.expiresAt,
        updatedAt: serverTimestamp()
      });
      toast.success('Announcement updated successfully');
      setShowForm(false);
      setIsEditing(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error('Error updating announcement: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (announcement) => {
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      type: announcement.type || 'Notice',
      status: announcement.status || 'Active',
      audience: announcement.audience || 'everyone',
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt.seconds * 1000) : getExpirationDate(announcement.type || 'Notice')
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
      audience: 'everyone',
      expiresAt: getExpirationDate('Notice')
    });
    setCurrentAnnouncementId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(false);
    resetForm();
  };

  const getExpirationDate = (type) => {
    const now = new Date();
    switch (type.toLowerCase()) {
      case 'urgent':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case 'update':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      case 'notice':
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  };

  const handleTypeChange = (newType) => {
    const expirationDate = getExpirationDate(newType);
    setFormData({
      ...formData,
      type: newType,
      expiresAt: expirationDate
    });
  };

  const getAudienceText = (audience, selectedBlocks = []) => {
    switch (audience) {
      case 'everyone':
        return '📢 Everyone (All Users)';
      case 'homeowners':
        return '🏠 All Homeowners';
      case 'guards':
        return '🛡️ All Guards';
      default:
        return '📢 Everyone (All Users)';
    }
  };

  const getAudienceIcon = (audience) => {
    switch (audience) {
      case 'homeowners':
        return '🏠';
      case 'guards':
        return '🛡️';
      default:
        return '📢';
    }
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
                      onChange={(e) => handleTypeChange(e.target.value)}
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
                      <option value="Draft">Draft</option>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                    Audience & Visibility
                  </label>
                  <select 
                    required
                    value={formData.audience}
                    onChange={(e) => setFormData({...formData, audience: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 border-gray-300 bg-white bg-white text-gray-900 text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="everyone">📢 Everyone (All Users)</option>
                    <option value="homeowners">🏠 All Homeowners</option>
                    <option value="guards">🛡️ All Guards</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-gray-700 mb-1">
                    Expiration
                  </label>
                  <div className={`p-3 rounded-lg border ${
                    formData.type === 'Urgent' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {formData.type === 'Urgent' ? (
                          <div className="text-red-600 mr-2">⏰</div>
                        ) : (
                          <div className="text-blue-600 mr-2">📅</div>
                        )}
                        <span className={`text-sm font-medium ${
                          formData.type === 'Urgent' ? 'text-red-800' : 'text-blue-800'
                        }`}>
                          Expires: {formData.expiresAt ? formData.expiresAt.toLocaleDateString() + ' ' + formData.expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not set'}
                        </span>
                      </div>
                      {formData.type !== 'Urgent' && (
                        <input
                          type="datetime-local"
                          value={formData.expiresAt ? formData.expiresAt.toISOString().slice(0, 16) : ''}
                          onChange={(e) => setFormData({...formData, expiresAt: new Date(e.target.value)})}
                          className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${
                      formData.type === 'Urgent' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {formData.type === 'Urgent' 
                        ? 'Urgent announcements expire after 24 hours (cannot be changed)' 
                        : formData.type === 'Update'
                        ? 'Update announcements expire after 7 days by default'
                        : 'Notice announcements expire after 30 days by default'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={isSubmitting}
                    className={`px-5 py-2.5 rounded-lg border border-gray-300 border-gray-300 text-gray-700 text-gray-700 font-medium transition-colors ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-all flex items-center ${
                      isSubmitting ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700 hover:shadow'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isEditing ? 'Updating...' : 'Posting...'}
                      </>
                    ) : isEditing ? (
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
                          <span className={`px-2 py-0.5 rounded-full ${announcement.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
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
                          {announcement.expiresAt && (
                            <div className="flex items-center text-orange-600">
                              <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Expires: {new Date(announcement.expiresAt.seconds * 1000).toLocaleDateString()}
                            </div>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {getAudienceText(announcement.audience)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {getAudienceIcon(announcement.audience)} {announcement.audience}
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
