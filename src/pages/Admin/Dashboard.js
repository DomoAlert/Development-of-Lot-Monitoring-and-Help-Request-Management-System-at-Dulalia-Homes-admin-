import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { 
  UserCircleIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  UserGroupIcon
} from '@heroicons/react/outline';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, startOfWeek, endOfDay, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Line, Bar, Pie, Radar, Doughnut } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { Card, CardHeader, CardBody, Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge, StatCard } from '../../components/AdminUI';
import withAdminPage from '../../components/withAdminPage';
import { FaQrcode, FaUserShield, FaUser, FaCommentAlt, FaStar, FaWrench, FaBroom, FaBolt, FaUsers, FaUserCheck, FaBuilding } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
Chart.register(...registerables);

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHomeowners: 0,
    servicePendingRequests: 0,
    facilityPendingRequests: 0,
    currentMonthVisitors: 0, // Changed from totalVisitors2025
    lowStockItems: 0,
    averageRating: 0,
    currentMonth: '', // Add this to store current month name
  });
  const [homeowners, setHomeowners] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [visitorTrafficData, setVisitorTrafficData] = useState({
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    counts: [0, 0, 0, 0, 0, 0, 0],
    totalVisitors: 0
  });
  
  // Rating distribution (1-5 stars)
  const [ratingDistribution, setRatingDistribution] = useState({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  });
  
  // Service-specific ratings
  const [serviceRatings, setServiceRatings] = useState({});
  const [visitorStatistics, setVisitorStatistics] = useState({
    totalMonthlyVisitors: 0,
    scannedByGuards: 0
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [visitorMonthlyData, setVisitorMonthlyData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    visitors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  
  // Function to manually refresh data
  const refreshData = () => {
    setLoading(true);
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    document.title = "Admin Dashboard";
    
    // Use onSnapshot for real-time updates - Services (using staff_status)
    const unsubscribeServices = onSnapshot(
      query(collection(db, 'services'), where('staff_status', '==', 'Pending')),
      (snapshot) => {
        const servicePendingRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStats(prev => ({ ...prev, servicePendingRequests: servicePendingRequests.length }));
      },
      (error) => {
        console.error('Error in services listener:', error);
      }
    );

    // Use onSnapshot for real-time updates - Facility Requests
    const unsubscribeFacilities = onSnapshot(
      query(collection(db, 'facility_requests'), where('status', '==', 'Pending')),
      (snapshot) => {
        const facilityPendingRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStats(prev => ({ ...prev, facilityPendingRequests: facilityPendingRequests.length }));
      },
      (error) => {
        console.error('Error in facility requests listener:', error);
      }
    );
    
    fetchDashboardData();
    fetchCurrentMonthVisitors(); // Add this new function call
    
    return () => {
      unsubscribeServices();
      unsubscribeFacilities();
    };
  }, []);

  // Separate useEffect for visitor statistics that depends on selectedYear
  useEffect(() => {
    fetchVisitorStatistics();
  }, [selectedYear]);

  // New function to fetch visitor traffic data
  const fetchVisitorTrafficData = async () => {
    try {
      // Get the start of the current week (Monday)
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
      
      // Create Firestore timestamp for the start of the week
      const weekStartTimestamp = Timestamp.fromDate(currentWeekStart);
      
      // Create Firestore timestamp for the end of today
      const todayEnd = endOfDay(today);
      const todayEndTimestamp = Timestamp.fromDate(todayEnd);
      
      // Query visitor logs from the current week
      const visitorLogsQuery = query(
        collection(db, 'visitor_qr_codes'),
        where('check_in_time', '>=', weekStartTimestamp),//this should be in the firebase when the guard scans the qr code
        where('check_in_time', '<=', todayEndTimestamp),//this should be the guard scan again the qr code
        orderBy('check_in_time', 'asc')
      );
      
      const visitorLogsSnap = await getDocs(visitorLogsQuery);
      
      // Initialize daily counts
      const dailyCounts = [0, 0, 0, 0, 0, 0, 0]; // Monday to Sunday
      let totalVisitors = 0;
      
      // Process each visitor log
      visitorLogsSnap.forEach(doc => {
        const visitorData = doc.data();
        if (visitorData.check_in_time) {
          // Convert Firestore timestamp to JavaScript Date
          const checkInDate = visitorData.check_in_time.toDate();
          // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
          const dayOfWeek = checkInDate.getDay();
          // Adjust to our array index (0 = Monday, ..., 6 = Sunday)
          const adjustedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          // Increment the count for this day
          dailyCounts[adjustedIndex]++;
          totalVisitors++;
        }
      });
      
      // Update state with the visitor traffic data
      setVisitorTrafficData({
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        counts: dailyCounts,
        totalVisitors
      });
      
    } catch (error) {
      console.error('Error fetching visitor traffic data:', error);
      toast.error('Error fetching visitor traffic: ' + error.message);
    }
  };

  const fetchVisitorStatistics = async () => {
    try {
      // Query all visitors - we'll filter by visit_date in JavaScript
      const visitorLogsQuery = query(collection(db, 'visitor_qr_codes'));
      const visitorLogsSnap = await getDocs(visitorLogsQuery);
      
      // Initialize monthly counts
      const monthlyVisits = Array(12).fill(0);
      let totalScannedByGuards = 0;
      let totalYearlyVisitors = 0;
      
      // Process each visitor log
      visitorLogsSnap.forEach(doc => {
        const visitorData = doc.data();
        
        // Count visitors by their visit_date
        if (visitorData.visit_date) {
          try {
            // Parse visit_date (format: "M/D/YYYY" or "MM/DD/YYYY")
            const dateParts = visitorData.visit_date.split('/');
            if (dateParts.length === 3) {
              const month = parseInt(dateParts[0]) - 1; // 0-based index (0 = January)
              const year = parseInt(dateParts[2]);
              
              // Only count if it matches the selected year
              if (year === selectedYear && month >= 0 && month < 12) {
                monthlyVisits[month]++;
                totalYearlyVisitors++;
              }
            }
          } catch (error) {
            console.error('Error parsing visit_date:', visitorData.visit_date, error);
          }
        }
        
        // Count guards scanned
        if (visitorData.scanned_by && visitorData.scanned_at) {
          totalScannedByGuards++;
        }
      });
      
      // Update state with the visitor statistics
      setVisitorStatistics({
        totalMonthlyVisitors: totalYearlyVisitors,
        scannedByGuards: totalScannedByGuards
      });
      
      // Update monthly data for the chart
      setVisitorMonthlyData({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        visitors: monthlyVisits
      });
      
    } catch (error) {
      console.error('Error fetching visitor statistics:', error);
      toast.error('Error fetching visitor statistics: ' + error.message);
    }
  };

  const fetchCurrentMonthVisitors = async () => {
    try {
      // Get current date
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-based (0 = January, 11 = December)
      const currentYear = now.getFullYear();
      
      // Get month name
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonthName = monthNames[currentMonth];
      
      // Query all visitors - we'll filter by visit_date in JavaScript
      const visitorLogsQuery = query(collection(db, 'visitor_qr_codes'));
      const visitorLogsSnap = await getDocs(visitorLogsQuery);
      
      let currentMonthCount = 0;
      
      // Process each visitor log
      visitorLogsSnap.forEach(doc => {
        const visitorData = doc.data();
        
        // Count visitors by their visit_date
        if (visitorData.visit_date) {
          try {
            // Parse visit_date (format: "M/D/YYYY" or "MM/DD/YYYY")
            const dateParts = visitorData.visit_date.split('/');
            if (dateParts.length === 3) {
              const month = parseInt(dateParts[0]) - 1; // 0-based index (0 = January)
              const year = parseInt(dateParts[2]);
              
              // Count if it matches current month and year
              if (year === currentYear && month === currentMonth) {
                currentMonthCount++;
              }
            }
          } catch (error) {
            console.error('Error parsing visit_date:', visitorData.visit_date, error);
          }
        }
      });
      
      // Update state with current month's visitor count
      setStats(prev => ({ 
        ...prev, 
        currentMonthVisitors: currentMonthCount,
        currentMonth: currentMonthName
      }));
      
    } catch (error) {
      console.error('Error fetching current month visitors:', error);
      toast.error('Error fetching current month visitors: ' + error.message);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Parallel fetch for better performance
      const [
        homeownersSnap,
        activeStaffSnap,
        inventorySnap,
        feedbackSnap,
        serviceRequestsSnap,
        facilityRequestsSnap
      ] = await Promise.all([
        // Fetch all homeowners to get total count
        getDocs(query(collection(db, 'users'))),
        // Fetch active staff
        getDocs(query(
          collection(db, 'staff'),
          where('status', '==', 'Active')
        )),
        // Fetch inventory
        getDocs(query(collection(db, 'inventory'))),
        // Fetch feedback data with ratings
        getDocs(query(
          collection(db, 'service_feedback'),
          orderBy('timestamp', 'desc'),
          limit(50)
        )),
        // Fetch service requests
        getDocs(query(
          collection(db, 'services'),
          orderBy('created_at', 'desc'),
          limit(10)
        )),
        // Fetch facility requests
        getDocs(query(
          collection(db, 'facility_requests'),
          orderBy('created_at', 'desc'),
          limit(10)
        ))
      ]);

      // Process homeowners data - get most recent 5 for display
      const homeownersData = homeownersSnap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().created_at ? 
            new Date(doc.data().created_at.seconds * 1000) : 
            new Date()
        }))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);

      // Process low stock items
      const lowStockItems = inventorySnap.docs
        .map(doc => doc.data())
        .filter(item => item.quantity <= item.reorderPoint).length;

      // Process feedback data
      const feedbackData = feedbackSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get most recent feedback
      const recentFeedbackItems = feedbackData.slice(0, 5);
      setRecentFeedback(recentFeedbackItems);
      
      // Calculate rating distribution
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      feedbackData.forEach(item => {
        const rating = parseInt(item.rating) || 0;
        if (rating >= 1 && rating <= 5) {
          ratingCounts[rating] += 1;
        }
      });
      
      setRatingDistribution(ratingCounts);
      
      // Calculate average rating
      const totalRating = feedbackData.reduce((sum, item) => sum + (parseInt(item.rating) || 0), 0);
      const averageRating = feedbackData.length > 0 ? 
        (totalRating / feedbackData.length).toFixed(1) : 0;
      
      // Calculate service-specific ratings
      const serviceRatingMap = {};
      
      feedbackData.forEach(item => {
        const serviceName = item.service_name;
        const rating = parseInt(item.rating) || 0;
        
        if (!serviceName || rating === 0) return;
        
        if (!serviceRatingMap[serviceName]) {
          serviceRatingMap[serviceName] = { total: 0, count: 0, average: 0 };
        }
        
        serviceRatingMap[serviceName].total += rating;
        serviceRatingMap[serviceName].count += 1;
      });
      
      // Calculate averages for each service
      Object.keys(serviceRatingMap).forEach(service => {
        const { total, count } = serviceRatingMap[service];
        serviceRatingMap[service].average = count > 0 ? (total / count).toFixed(1) : 0;
      });
      
      setServiceRatings(serviceRatingMap);

      // Update stats
      setStats(prev => ({
        ...prev,
        totalHomeowners: homeownersSnap.size,
        activeStaff: activeStaffSnap.size,
        lowStockItems,
        averageRating
      }));

      setHomeowners(homeownersData);

      // Process service and facility requests
      const serviceRequests = serviceRequestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'service'
      }));

      const facilityRequests = facilityRequestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'facility'
      }));

      // Combine and sort both types of requests by timestamp
      const allRequests = [...serviceRequests, ...facilityRequests]
        .sort((a, b) => {
          const timeA = a.created_at || a.updatedAt;
          const timeB = b.created_at || b.updatedAt;
          
          if (!timeA) return 1;
          if (!timeB) return -1;
          
          const dateA = timeA.seconds ? timeA.seconds : new Date(timeA).getTime() / 1000;
          const dateB = timeB.seconds ? timeB.seconds : new Date(timeB).getTime() / 1000;
          
          return dateB - dateA; // Sort descending (newest first)
        })
        .slice(0, 5); // Only take 5 most recent requests

      // Process each request to ensure it has all needed display fields
      const processedRequests = allRequests.map(request => {
        if (request.type === 'service') {
          return {
            ...request,
            userName: request.fullName || `${request.firstName || ''} ${request.lastName || ''}`.trim() || request.resident_name || 'Unknown',
            serviceName: request.category || request.service_provider || 'Service Request',
            facilityName: null,
            status: request.staff_status || request.headStaff_status || request.status || 'Pending',
            houseNo: request.house_no,
            issue: request.issue,
            comment: request.comment
          };
        } else { // facility request
          return {
            ...request,
            userName: request.homeowner_name || 'Unknown',
            serviceName: null,
            facilityName: request.facility || 'Facility Request',
            status: request.status || 'Pending'
          };
        }
      });

      // Update recentRequests state with both types
      setRecentRequests(processedRequests);

    } catch (error) {
      toast.error('Error fetching dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'No date';
    
    // Check if timestamp is a Firebase Timestamp object
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // Handle if timestamp is already a Date object or string
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const ratingNum = parseInt(rating) || 0;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar 
          key={i}
          className={`inline-block ${i <= ratingNum ? 'text-yellow-400' : 'text-gray-300'}`} 
        />
      );
    }
    
    return stars;
  };

  // Add missing startOfWeek helper function
  function startOfWeek(date, options) {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const weekStartsOn = options?.weekStartsOn || 0;
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    
    const result = new Date(date);
    result.setDate(date.getDate() - diff);
    result.setHours(0, 0, 0, 0);
    
    return result;
  }

  // Add missing endOfDay helper function
  function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    
    return result;
  }

  // Add functions to change the year
  const previousYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const nextYear = () => {
    const nextYear = selectedYear + 1;
    const currentYear = new Date().getFullYear();
    
    // Prevent selecting future years
    if (nextYear <= currentYear) {
      setSelectedYear(nextYear);
    }
  };

  return (
   <ResponsiveLayout>
  <div className="pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    {/* Header Section */}
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center space-x-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-sm opacity-80 mt-1">Monitor community metrics and performance indicators</p>
          </div>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            loading 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-blue-600 hover:bg-blue-50 hover:shadow-md'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>

    {loading ? (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-lg">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Loading dashboard data...</p>
      </div>
    ) : (
      <>
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: FaQrcode, text: 'View Visitor QR', path: '/admin/visitor-logs', color: 'blue' },
              { icon: FaUserShield, text: 'Manage Guards', path: '/admin/guard-accounts', color: 'green' },
              { icon: FaUser, text: 'Manage Users', path: '/admin/user-accounts', color: 'purple' },
              { icon: FaCommentAlt, text: 'View Feedback', path: '/admin/feedback', color: 'yellow' },
            ].map(({ icon: Icon, text, path, color }, index) => (
              <button
                key={index}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl bg-${color}-50 hover:bg-${color}-100 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1`}
              >
                <Icon className={`h-8 w-8 text-${color}-600 mb-2`} />
                <span className="text-sm font-medium text-gray-800">{text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[ 
            { icon: UserCircleIcon, title: 'Total Homeowners', value: stats.totalHomeowners, color: 'blue' },
            { icon: ClockIcon, title: 'Service Pending Requests', value: stats.servicePendingRequests, color: 'yellow' },
            { icon: FaBuilding, title: 'Facility Pending Requests', value: stats.facilityPendingRequests, color: 'orange' },
            { icon: FaUsers, title: `${stats.currentMonth} Visitors`, value: stats.currentMonthVisitors, color: 'green' },
            { icon: UserGroupIcon, title: 'Active Staff', value: stats.activeStaff, color: 'purple' },
            { icon: FaStar, title: 'Average Rating', value: stats.averageRating, color: 'yellow', render: renderStars },
          ].map(({ icon: Icon, title, value, color, render }, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-full bg-${color}-100 bg-opacity-75`}>
                  <Icon className={`h-8 w-8 text-${color}-600`} />
                </div>
                <div className="ml-4">
                  <h2 className="text-sm text-gray-600 font-medium">{title}</h2>
                  <div className="flex items-center">
                    <p className="text-xl font-semibold text-gray-800">{render ? render(value) : value}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Visitor Statistics */}
        <div className="mb-8 bg-white rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Visitor Statistics</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousYear}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Previous year"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium text-gray-800">{selectedYear}</span>
              <button
                onClick={nextYear}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Next year"
                disabled={selectedYear >= new Date().getFullYear()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="h-80">
              <Bar
                data={{
                  labels: visitorMonthlyData.labels,
                  datasets: [{
                    label: 'Visitors',
                    data: visitorMonthlyData.visitors,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                  plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: `Monthly Visitors for ${selectedYear}`, font: { size: 16 } },
                    tooltip: {
                      callbacks: {
                        title: (items) => items.length ? `${items[0].label} ${selectedYear}` : '',
                        label: (item) => `Visitors: ${item.formattedValue}`,
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/admin/visitor-logs')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all visitor logs
              </button>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Service Ratings Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Service Ratings Overview</h2>
            <div className="h-80">
              <Bar
                data={{
                  labels: Object.keys(serviceRatings),
                  datasets: [
                    {
                      label: 'Average Rating',
                      data: Object.keys(serviceRatings).map(service => serviceRatings[service].average),
                      backgroundColor: 'rgba(99, 102, 241, 0.7)',
                      borderColor: 'rgb(99, 102, 241)',
                      borderWidth: 1,
                    },
                    {
                      label: 'Number of Reviews',
                      data: Object.keys(serviceRatings).map(service => serviceRatings[service].count),
                      backgroundColor: 'rgba(16, 185, 129, 0.7)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Value', font: { size: 12, weight: 'bold' } },
                    },
                    x: {
                      title: { display: true, text: 'Services', font: { size: 12, weight: 'bold' } },
                    },
                  },
                  plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const value = context.raw;
                          return `${context.dataset.label}: ${typeof value === 'number' ? (context.dataset.label === 'Average Rating' ? value.toFixed(1) : value) : value || 'N/A'}`;
                        },
                      },
                    },
                    title: { display: true, text: 'Service Ratings Overview', font: { size: 16, weight: 'bold' }, padding: { bottom: 10 } },
                  },
                }}
              />
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Rating Distribution</h2>
            <div className="h-80">
              <Bar
                data={{
                  labels: ['1★', '2★', '3★', '4★', '5★'],
                  datasets: [
                    {
                      label: 'All Services',
                      data: [ratingDistribution[1], ratingDistribution[2], ratingDistribution[3], ratingDistribution[4], ratingDistribution[5]],
                      backgroundColor: 'rgba(99, 102, 241, 0.7)',
                      borderColor: 'rgb(99, 102, 241)',
                      borderWidth: 1,
                      barPercentage: 0.6,
                      categoryPercentage: 0.7,
                    },
                    ...Object.keys(serviceRatings)
                      .filter(service => ['plumber', 'street sweeper', 'electrician'].includes(service.toLowerCase()) && serviceRatings[service].count > 0)
                      .map((service, index) => {
                        const colors = [
                          { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },
                          { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },
                          { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },
                        ];
                        const serviceDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                        recentFeedback
                          .filter(item => item.service_name && item.service_name.toLowerCase() === service.toLowerCase())
                          .forEach(item => {
                            const rating = parseInt(item.rating) || 0;
                            if (rating >= 1 && rating <= 5) serviceDistribution[rating] += 1;
                          });
                        return {
                          label: service,
                          data: [serviceDistribution[1], serviceDistribution[2], serviceDistribution[3], serviceDistribution[4], serviceDistribution[5]],
                          backgroundColor: colors[index % colors.length].bg,
                          borderColor: colors[index % colors.length].border,
                          borderWidth: 1,
                          barPercentage: 0.6,
                          categoryPercentage: 0.7,
                        };
                      }),
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of Ratings', font: { size: 12, weight: 'bold' } } },
                    x: { title: { display: true, text: 'Rating Stars', font: { size: 12, weight: 'bold' } } },
                  },
                  plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                      callbacks: {
                        title: (tooltipItems) => `${tooltipItems[0].label} Star Rating`,
                        label: (context) => {
                          const value = context.raw;
                          return `${context.dataset.label}: ${typeof value === 'number' ? (context.dataset.label === 'Average Rating' ? value.toFixed(1) : value) : value || 'N/A'}`;
                        },
                      },
                    },
                    title: { display: true, text: 'Feedback Ratings by Service Type', font: { size: 16, weight: 'bold' }, padding: { bottom: 10 } },
                  },
                }}
              />
            </div>
            <div className="mt-4 text-xs text-gray-500 border-t pt-3">
              <p>Higher bars for 4-5 star ratings indicate better service satisfaction.</p>
              <p className="mt-1">Note: Only services with at least one rating are shown.</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Recent Requests</h2>
            </div>
            <div className="p-6">
              {recentRequests.length === 0 ? (
                <p className="text-gray-500">No recent requests</p>
              ) : (
                <div className="space-y-4">
                  {recentRequests.map((request) => (
                    <div key={request.id} className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      {request.type === 'service' ? (
                        <div className="p-2 rounded-full bg-blue-100 mr-3">
                          <FaWrench className="h-6 w-6 text-blue-600" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-purple-100 mr-3">
                          <FaBuilding className="h-6 w-6 text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {request.type === 'service' ? request.serviceName : request.facilityName}
                          </p>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            request.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          From: {request.userName || 'Unknown User'}
                          {request.houseNo && ` (House ${request.houseNo})`}
                        </p>
                        {request.issue && (
                          <p className="text-xs text-gray-500">
                            Issue: {request.issue}
                          </p>
                        )}
                        {request.comment && (
                          <p className="text-xs text-gray-500">
                            Comment: {request.comment}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {formatTimestamp(request.timestamp || request.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Feedback */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Recent Feedback</h2>
            </div>
            <div className="p-6">
              {recentFeedback.length === 0 ? (
                <p className="text-gray-500">No recent feedback</p>
              ) : (
                <div className="space-y-4">
                  {recentFeedback.map((feedback) => (
                    <div key={feedback.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <div className="text-yellow-400 mr-2">{renderStars(feedback.rating)}</div>
                          <span className="text-sm text-gray-500">
                            for {feedback.service_name || 'Unknown Service'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(feedback.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        "{feedback.feedback || 'No comment provided'}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate('/admin/feedback')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View all feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
    </ResponsiveLayout>
  );
}

export default Dashboard;