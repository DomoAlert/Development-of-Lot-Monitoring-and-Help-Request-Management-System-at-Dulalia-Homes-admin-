import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { FaQrcode, FaSpinner, FaTimes, FaUser, FaCalendarAlt, FaSearch, FaCheckCircle, FaTimesCircle, FaUserShield, FaDownload, FaClock, FaPrint } from 'react-icons/fa';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardHeader, CardBody, Button, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge, Modal, DataSearch, StatCard } from '../../components/AdminUI';
import withAdminPage from '../../components/withAdminPage';


function VisitorLogs() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [users, setUsers] = useState({});
  const [guards, setGuards] = useState({});
  const [qrCodeKey, setQrCodeKey] = useState(Date.now());
  const [monthlyVisitors, setMonthlyVisitors] = useState(0);
  const [guardScannedCount, setGuardScannedCount] = useState(0);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  // Add state for refreshing data
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Update current date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format current date time for display
  const formattedCurrentDate = currentDateTime.toLocaleDateString();
  const formattedCurrentTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
  
  // Fetch visitors
  useEffect(() => {
    document.title = "Visitor Logs";
    fetchVisitors();
  }, [refreshTrigger]);
  
  // Fetch user data
  const fetchUserData = useCallback(async (uid) => {
    if (users[uid]) return users[uid];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData.name || userData.username || 'Unknown';
          
        setUsers(prev => ({
          ...prev,
          [uid]: { name: displayName, data: userData }
        }));
        
        return { name: displayName, data: userData };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, [users]);
  
  // Fetch guard data
  const fetchGuardData = useCallback(async (uid) => {
    if (guards[uid]) return guards[uid];
    
    try {
      const guardDoc = await getDoc(doc(db, 'guards', uid));
      if (guardDoc.exists()) {
        const guardData = guardDoc.data();
        const displayName = guardData.name || guardData.username || 'Unknown Guard';
        
        setGuards(prev => ({
          ...prev,
          [uid]: { name: displayName, data: guardData }
        }));
        
        return { name: displayName, data: guardData };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching guard data:', error);
      return null;
    }
  }, [guards]);
  
  // Function to manually refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Update the fetchVisitors function to include visitor_logs data
  const fetchVisitors = async () => {
    setLoading(true);
    try {
      // Fetch QR codes
      const qrCodesQuery = query(collection(db, 'visitor_qr_codes'), orderBy('created_at', 'desc'));
      const qrCodesSnapshot = await getDocs(qrCodesQuery);
      
      // Fetch visitor logs
      const logsQuery = query(collection(db, 'visitor_logs'));
      const logsSnapshot = await getDocs(logsQuery);
      
      // Create a map of visitor logs by QR code ID
      const logsMap = {};
      logsSnapshot.docs.forEach(doc => {
        const logData = doc.data();
        if (logData.qr_code_id) {
          logsMap[logData.qr_code_id] = {
            scanned_by_guard: logData.scanned_by_guard,
            scan_timestamp: logData.scan_timestamp
          };
        }
      });
      
      // Combine QR codes with visitor logs data
      const visitorsData = qrCodesSnapshot.docs.map(doc => {
        const qrData = doc.data();
        const logData = logsMap[doc.id] || {};
        
        return {
          id: doc.id,
          ...qrData,
          scanned_by: logData.scanned_by_guard || qrData.scanned_by,
          scanned_at: logData.scan_timestamp || qrData.scanned_at
        };
      });
      
      // Fetch user data for each visitor's creator
      const userPromises = visitorsData
        .filter(visitor => visitor.created_by)
        .map(visitor => fetchUserData(visitor.created_by));
      
      // Fetch guard data for each scanned visitor
      const guardPromises = visitorsData
        .filter(visitor => visitor.scanned_by)
        .map(visitor => fetchGuardData(visitor.scanned_by));
      
      await Promise.all([...userPromises, ...guardPromises]);
      
      // Calculate visitor statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Count today's visitors
      const todayVisitorsCount = visitorsData.filter(visitor => {
        if (!visitor.visit_date && !visitor.created_at) return false;
        
        // Handle visit_date as string (DD/MM/YYYY format)
        if (visitor.visit_date && typeof visitor.visit_date === 'string') {
          try {
            const parts = visitor.visit_date.split('/');
            if (parts.length === 3) {
              // Create date using parts (day, month-1, year)
              const visitDate = new Date(parts[2], parts[1] - 1, parts[0]);
              return visitDate >= today;
            }
          } catch (e) {
            console.error("Error parsing visit date:", e);
          }
        }
        
        // Handle visit_date as Timestamp
        if (visitor.visit_date && visitor.visit_date.seconds) {
          const visitDate = new Date(visitor.visit_date.seconds * 1000);
          return visitDate >= today;
        }
        
        // Fall back to created_at
        if (visitor.created_at && visitor.created_at.seconds) {
          const visitDate = new Date(visitor.created_at.seconds * 1000);
          return visitDate >= today;
        }
        
        return false;
      }).length;
      
      // Calculate scanned percentage
      const scannedVisitors = visitorsData.filter(visitor => visitor.scanned_at).length;
      const scannedRate = visitorsData.length > 0 
        ? Math.round((scannedVisitors / visitorsData.length) * 100) 
        : 0;
      
      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Count visitors for this month
      const monthlyVisitorsCount = visitorsData.filter(visitor => {
        if (!visitor.visit_date && !visitor.created_at) return false;
        
        // Handle visit_date as string (DD/MM/YYYY format)
        if (visitor.visit_date && typeof visitor.visit_date === 'string') {
          try {
            const parts = visitor.visit_date.split('/');
            if (parts.length === 3) {
              // Create date using parts (day, month-1, year)
              const visitDate = new Date(parts[2], parts[1] - 1, parts[0]);
              // Check if it's the current month
              return visitDate.getMonth() === currentMonth && 
                     visitDate.getFullYear() === currentYear;
            }
          } catch (e) {
            console.error("Error parsing visit date:", e);
          }
        }
        
        // Handle visit_date as Timestamp
        if (visitor.visit_date && visitor.visit_date.seconds) {
          const visitDate = new Date(visitor.visit_date.seconds * 1000);
          return visitDate.getMonth() === currentMonth && 
                 visitDate.getFullYear() === currentYear;
        }
        
        // Fall back to created_at
        if (visitor.created_at && visitor.created_at.seconds) {
          const visitDate = new Date(visitor.created_at.seconds * 1000);
          return visitDate.getMonth() === currentMonth && 
                 visitDate.getFullYear() === currentYear;
        }
        
        return false;
      }).length;
      
      // Count visitors scanned by guards
      const scannedByGuardCount = visitorsData.filter(visitor => 
        visitor.scanned_by && visitor.scanned_at
      ).length;
      
      // Remove average duration calculation
      
      // Update state with calculated statistics
      setMonthlyVisitors(monthlyVisitorsCount);
      setGuardScannedCount(scannedByGuardCount);
      // Remove setAvgDuration
      setVisitors(visitorsData);
    } catch (error) {
      toast.error('Error fetching visitors: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Modify this function to NOT generate a new QR code key by default
  const handleShowQRCode = (visitor) => {
    setSelectedVisitor(visitor);
    setShowQRCode(true);
    // Remove this line to prevent auto-regeneration when opening modal
    // setQrCodeKey(Date.now());
  };

  // This function will remain the same - only called when button is clicked
  const regenerateQRCode = () => {
    // Update the QR code key to force regeneration
    setQrCodeKey(Date.now());
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('visitor-qrcode');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `visitor-${selectedVisitor.first_name}-${selectedVisitor.last_name}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  // Add visitor tag printing functionality
  const printVisitorTag = () => {
    const printContent = document.getElementById('visitor-tag-printable');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Visitor Tag</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .visitor-tag { max-width: 3in; padding: 0.5in; border: 1px solid #ddd; }
            .visitor-name { font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
            .visitor-info { font-size: 10pt; margin-bottom: 3px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Format Firebase timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return { date: 'N/A', time: '' };
    
    // Handle Firebase Timestamp objects
    if (timestamp.seconds && timestamp.nanoseconds) {
      const date = new Date(timestamp.seconds * 1000);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
      };
    }
    
    // Handle string date formats like "23/5/2025"
    if (typeof timestamp === 'string') {
      // Try to parse the date string
      try {
        // Split the date string and handle DD/MM/YYYY format
        const parts = timestamp.split('/');
        if (parts.length === 3) {
          // Create date using parts (day, month-1 because months are 0-indexed, year)
          const date = new Date(parts[2], parts[1] - 1, parts[0]);
          
          if (!isNaN(date.getTime())) {
            return {
              date: date.toLocaleDateString(),
              // Set default time since it's not provided in the string
              time: '12:00 PM'
            };
          }
        }
        
        // Try direct parsing if the split approach didn't work
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
          };
        }
      } catch (e) {
        console.error("Error parsing date string:", e);
      }
    }
    
    return { date: 'Invalid date', time: '' };
  };
  
  // Get the name of the user who created the visitor record
  const getCreatorName = (uid) => {
    if (!uid) return 'Unknown';
    return users[uid]?.name || 'Loading...';
  };
  
  // Get the name of the guard who scanned the QR code
  const getGuardName = (uid) => {
    if (!uid) return 'Not scanned';
    return guards[uid]?.name || 'Loading...';
  };
  
  // Apply filters
  const filteredVisitors = visitors.filter(visitor => {
    // Search by name or contact
    const matchesSearch = 
      (visitor.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (visitor.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (visitor.contact?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (visitor.purpose?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    // Filter by date if date filter is set
    let matchesDate = true;
    if (dateFilter) {
      let visitorDate = '';
      
      // Handle visit_date field
      if (visitor.visit_date) {
        if (typeof visitor.visit_date === 'string') {
          // Handle string format "DD/MM/YYYY"
          try {
            const parts = visitor.visit_date.split('/');
            if (parts.length === 3) {
              // Create date using parts (day, month-1, year)
              const date = new Date(parts[2], parts[1] - 1, parts[0]);
              if (!isNaN(date.getTime())) {
                visitorDate = date.toDateString();
              }
            }
          } catch (e) {
            console.error("Error parsing visit date string:", e);
          }
        } else if (visitor.visit_date.seconds) {
          // Handle Firebase timestamp
          visitorDate = new Date(visitor.visit_date.seconds * 1000).toDateString();
        }
      }
      
      // Fall back to created_at if visit_date is not available or parsing failed
      if (!visitorDate && visitor.created_at && visitor.created_at.seconds) {
        visitorDate = new Date(visitor.created_at.seconds * 1000).toDateString();
      }
      
      const filterDate = new Date(dateFilter).toDateString();
      matchesDate = visitorDate === filterDate;
    }
    
    return matchesSearch && matchesDate;
  });

  // Sort visitors
  const sortedVisitors = [...filteredVisitors].sort((a, b) => {
    switch (sortField) {
      case 'name':
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);

      case 'visit_date':
        const dateA = a.visit_date?.seconds || a.created_at?.seconds || 0;
        const dateB = b.visit_date?.seconds || b.created_at?.seconds || 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;

      case 'status':
        const statusA = a.scanned_at ? 1 : 0;
        const statusB = b.scanned_at ? 1 : 0;
        return sortDirection === 'asc' ? statusA - statusB : statusB - statusA;

      default:
        const defaultA = a.created_at?.seconds || 0;
        const defaultB = b.created_at?.seconds || 0;
        return sortDirection === 'asc' ? defaultA - defaultB : defaultB - defaultA;
    }
  });

  // Add this handler function
  const handleSort = (field) => {
    setSortDirection(currentDirection => 
      sortField === field 
        ? currentDirection === 'asc' ? 'desc' : 'asc'
        : 'asc'
    );
    setSortField(field);
  };

  // Handler for QR code button
  // (Removed duplicate handleShowQRCode to fix redeclaration error)

  // Generate PDF of QR code
  const handlePrintQRCode = () => {
    const canvas = document.getElementById('visitor-qrcode');
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF();
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
      pdf.save(`visitor-${selectedVisitor.first_name}-${selectedVisitor.last_name}.pdf`);
    }
  };

  // Handler for downloading QR code as image
  const handleDownloadQRCode = () => {
    const canvas = document.getElementById('visitor-qrcode');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `visitor-${selectedVisitor.first_name}-${selectedVisitor.last_name}.png`;
      link.href = dataUrl;
      link.click();
    }
  };
  
  // Handler for regenerating QR code
  const handleRegenerateQRCode = () => {
    setQrCodeKey(Date.now());
    toast.success('QR Code regenerated with new time signature');
  };
  
  // Function to determine badge color based on status
  const getBadgeVariant = (visitor) => {
    if (visitor.scanned_at) return "success";
    
    // If visit date is in the future, it's upcoming
    if (visitor.visit_date && typeof visitor.visit_date === 'object' && visitor.visit_date.seconds) {
      const visitDate = new Date(visitor.visit_date.seconds * 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (visitDate >= today) return "primary"; // upcoming
    }
    
    return "warning"; // not scanned
  };
  
  // Function to get status text
  const getStatusText = (visitor) => {
    if (visitor.scanned_at) return "Scanned";
    
    // If visit date is in the future, it's upcoming
    if (visitor.visit_date && typeof visitor.visit_date === 'object' && visitor.visit_date.seconds) {
      const visitDate = new Date(visitor.visit_date.seconds * 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (visitDate >= today) return "Upcoming"; 
    }
    
    return "Pending";
  };

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="This Month's Visitors"
          value={monthlyVisitors}
          icon={<FaUser size={24} />}
          iconColor="primary"
          description="Total visitors this month"
        />
        
        <StatCard
          title="Guard Scanned"
          value={guardScannedCount}
          icon={<FaUserShield size={24} />}
          iconColor="success"
          description="Visitors scanned by guards"
          trend="up"
          trendValue={`${Math.round((guardScannedCount / (monthlyVisitors || 1)) * 100)}%`}
          trendText="scan rate"
        />
        
        <StatCard
          title="Current Time"
          value={formattedCurrentTime}
          icon={<FaClock size={24} />}
          iconColor="secondary"
          description={`Current date: ${formattedCurrentDate}`}
        />
      </div>
      
      {/* Search and Filter Row */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="w-full md:w-1/2">
          <DataSearch
            placeholder="Search visitors by name, purpose, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-1/2 flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 border-gray-300 shadow-sm focus:border-primary focus:border-primary focus:ring focus:ring-primary/20 focus:ring-primary/20 bg-white text-black"
          />
          
          <Button 
            variant="outline" 
            onClick={() => setDateFilter('')}
            disabled={!dateFilter}
          >
            Clear Filter
          </Button>
          
          <button
            onClick={refreshData}
            disabled={loading}
            className={`flex items-center px-4 py-2 rounded-lg text-sm ${
              loading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            } transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      {/* Visitors Table */}
      <Card>
        <CardHeader 
          title="Visitor Logs" 
          icon={<FaQrcode size={20} />}
        />
        <CardBody>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <FaSpinner className="animate-spin text-primary h-8 w-8" />
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Visitor Name</TableHeaderCell>
                    <TableHeaderCell>Contact</TableHeaderCell>
                    <TableHeaderCell>Purpose</TableHeaderCell>
                    <TableHeaderCell>Created By</TableHeaderCell>
                    <TableHeaderCell>Visit Date</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {sortedVisitors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        No visitors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedVisitors.map(visitor => (
                      <TableRow key={visitor.id}>
                        <TableCell className="font-medium">
                          {visitor.first_name} {visitor.last_name}
                        </TableCell>
                        <TableCell>{visitor.contact || "N/A"}</TableCell>
                        <TableCell>{visitor.purpose || "N/A"}</TableCell>
                        <TableCell>{getCreatorName(visitor.created_by)}</TableCell>
                        <TableCell>{formatDate(visitor.visit_date || visitor.created_at).date}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(visitor)}>
                            {getStatusText(visitor)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleShowQRCode(visitor)}
                          >
                            <FaQrcode className="mr-1" /> QR Code
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-4 text-sm text-gray-500 text-gray-600">
                Showing {sortedVisitors.length} of {visitors.length} visitors
              </div>
            </>
          )}
        </CardBody>
      </Card>
      
      {/* QR Code Modal */}
      <Modal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        title="Visitor QR Code"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleRegenerateQRCode}
            >
              <FaQrcode className="mr-2" /> Regenerate
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadQRCode}
            >
              <FaDownload className="mr-2" /> Download
            </Button>
            <Button
              variant="primary"
              onClick={handlePrintQRCode}
            >
              <FaPrint className="mr-2" /> Print
            </Button>
          </div>
        }
      >
        {selectedVisitor && (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeCanvas 
                id="visitor-qrcode"
                value={JSON.stringify({
                  id: selectedVisitor.id,
                  name: `${selectedVisitor.first_name} ${selectedVisitor.last_name}`,
                  contact: selectedVisitor.contact,
                  purpose: selectedVisitor.purpose,
                  visit_date: selectedVisitor.visit_date 
                    ? (typeof selectedVisitor.visit_date === 'string' 
                        ? selectedVisitor.visit_date 
                        : new Date(selectedVisitor.visit_date.seconds * 1000).toISOString())
                    : new Date().toISOString(),
                  timestamp: new Date().toISOString(),
                  key: qrCodeKey
                })}
                size={200}
                level={"H"}
                includeMargin={true}
              />
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg">{selectedVisitor.first_name} {selectedVisitor.last_name}</h3>
              <p className="text-sm text-gray-600 text-gray-600">Contact: {selectedVisitor.contact || 'N/A'}</p>
              <p className="text-sm text-gray-600 text-gray-600">Purpose: {selectedVisitor.purpose || 'N/A'}</p>
              <p className="text-sm text-gray-600 text-gray-600">Created: {formatDate(selectedVisitor.created_at).date} {formatDate(selectedVisitor.created_at).time}</p>
              
              <div className="mt-2 py-2 border-t border-gray-200 border-gray-200">
                <p className="text-sm font-medium">
                  Status: {' '}
                  <Badge variant={getBadgeVariant(selectedVisitor)}>
                    {getStatusText(selectedVisitor)}
                  </Badge>
                </p>
                
                {selectedVisitor.scanned_at && (
                  <>
                    <p className="text-sm text-gray-600 text-gray-600">
                      Scanned at: {formatDate(selectedVisitor.scanned_at).date} {formatDate(selectedVisitor.scanned_at).time}
                    </p>
                    <p className="text-sm text-gray-600 text-gray-600">
                      Scanned by: {getGuardName(selectedVisitor.scanned_by)}
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-600 text-gray-600">
                  Visit Date: {formatDate(selectedVisitor.visit_date || selectedVisitor.created_at).date}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Export with HOC wrapper for consistent layout
export default withAdminPage({
  title: 'Visitor Logs',
  icon: <FaQrcode size={24} />,
  fullWidth: true
})(VisitorLogs);
