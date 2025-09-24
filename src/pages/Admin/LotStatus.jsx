import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/AdminLayout';
import { FaHome, FaSearch, FaUserEdit, FaUserPlus, FaTimes, FaUser, FaTag, FaClock } from 'react-icons/fa';

const LotMonitoring = () => {
  // State
  const [lots, setLots] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add Lot Modal State
  const [showAddLotModal, setShowAddLotModal] = useState(false);
  const [newLotBlock, setNewLotBlock] = useState('1');
  const [newLotNumber, setNewLotNumber] = useState('');
  const [autoLotNumber, setAutoLotNumber] = useState(true);
  const [isAddingLot, setIsAddingLot] = useState(false);

  // Valid statuses for lots
  const validStatuses = [
    'All',
    'Vacant',
    'Occupied',
    'For Sale',
    'Reserved',
  ];

  // Blocks configuration - how many lots are in each block
  const blockConfig = {
    1: 20, // Block 1 has 20 lots
    2: 25, // Block 2 has 25 lots
    3: 15, // Block 3 has 15 lots
    4: 22, // Block 4 has 22 lots
    5: 18  // Block 5 has 18 lots
  };

  // Set page title and fetch lots and users from Firebase
  useEffect(() => {
    document.title = "Lot Monitoring";
    fetchLots();
    fetchUsers();
  }, []);

  // Fetch all available users for lot assignment
  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const querySnapshot = await getDocs(usersQuery);
      
      const usersData = querySnapshot.docs
        .filter(doc => doc.data().role === 'Homeowner') // Only get homeowners
        .map(doc => ({
          id: doc.id,
          username: doc.data().username || 'Unknown',
          firstName: doc.data().firstName || '',
          lastName: doc.data().lastName || '',
          house_no: doc.data().house_no || null,
          email: doc.data().email || ''
        }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch user data: ' + error.message);
    }
  };
  
  // Fetch lots data from Firebase - both from users collection and lots collection (if it exists)
  const fetchLots = async () => {
    try {
      setIsLoading(true);
      
      // Create a structured array of all possible lots based on block configuration
      const allLots = [];
      
      // Populate with empty lot data for all blocks and lots
      Object.keys(blockConfig).forEach(blockNum => {
        for (let i = 1; i <= blockConfig[blockNum]; i++) {
          // Create a unique lot identifier (Block-LotNumber)
          const blockLotId = `B${blockNum}-L${i.toString().padStart(2, '0')}`;
          
          // Calculate house number as BlockNumber * 100 + LotNumber
          const houseNo = (parseInt(blockNum) * 100) + i;
          
          allLots.push({
            id: blockLotId,
            block: parseInt(blockNum),
            lot: i,
            house_no: houseNo,
            status: 'Vacant',
            house_owner: null,
            owner_id: null,
            houseModel: 'Standard',
            created_at: null
          });
        }
      });
      
      // Fetch actual users with house numbers to update the allLots array
      const usersQuery = query(collection(db, 'users'));
      const querySnapshot = await getDocs(usersQuery);
      
      // Create a map of house numbers to user data for quick lookup
      const userMap = {};
      querySnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.house_no) {
          userMap[userData.house_no] = {
            owner_id: doc.id,
            house_owner: userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
            houseModel: userData.houseModel || 'Standard'
          };
        }
      });
      
      // Update allLots with actual user data
      for (let lot of allLots) {
        if (userMap[lot.house_no]) {
          lot.house_owner = userMap[lot.house_no].house_owner;
          lot.owner_id = userMap[lot.house_no].owner_id;
          lot.status = 'Occupied';
          lot.houseModel = userMap[lot.house_no].houseModel;
        }
      }
      
      // Try to fetch from lots collection if it exists (for additional lot details)
      try {
        const lotsQuery = query(collection(db, 'lots'));
        const lotsSnapshot = await getDocs(lotsQuery);
        
        // Update lots with any additional information from lots collection
        lotsSnapshot.docs.forEach(doc => {
          const lotData = doc.data();
          const houseNo = lotData.house_no;
          
          if (houseNo) {
            const lotIndex = allLots.findIndex(l => l.house_no === houseNo);
            if (lotIndex !== -1) {
              allLots[lotIndex] = {
                ...allLots[lotIndex],
                status: lotData.status || allLots[lotIndex].status,
                description: lotData.description,
                price: lotData.price,
                size: lotData.size,
                created_at: lotData.created_at
              };
            }
          }
        });
      } catch (error) {
        // Lots collection may not exist, which is fine
        console.log('Lots collection may not exist yet:', error);
      }
      
      setLots(allLots);
    } catch (error) {
      console.error('Error fetching lots:', error);
      toast.error('Failed to fetch lot data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle assigning a lot to a user
  const handleAssignLot = async () => {
    if (!selectedLot) {
      toast.error('No lot selected');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Generate the lot document ID
      const lotId = `B${selectedLot.block}-L${selectedLot.lot.toString().padStart(2, '0')}`;
      const lotDocRef = doc(db, 'lots', lotId);
      
      // CASE 1: Marking an occupied lot as vacant (removing homeowner)
      if (selectedLot.status === 'Occupied' && selectedUserId === 'remove') {
        // First update the lot status
        await setDoc(lotDocRef, {
          status: 'Vacant',
          owner_id: null,
          house_owner: null,
          last_updated: serverTimestamp()
        }, { merge: true });
        
        // Then, if we know the owner's ID, update their user record
        if (selectedLot.owner_id) {
          const userDocRef = doc(db, 'users', selectedLot.owner_id);
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              await updateDoc(userDocRef, {
                house_no: null,
                block: null,
                lot: null,
                last_updated: serverTimestamp()
              });
            }
          } catch (error) {
            console.error('Error updating user record:', error);
            // Continue even if user update fails
          }
        }
        
        toast.success('Lot marked as vacant and homeowner removed');
      }
      // CASE 2: Changing the status of an unoccupied lot
      else if (selectedUserId === 'status-change') {
        await setDoc(lotDocRef, {
          house_no: selectedLot.house_no,
          block: selectedLot.block,
          lot: selectedLot.lot,
          status: selectedLot.status,
          last_updated: serverTimestamp()
        }, { merge: true });
        
        toast.success(`Lot status updated to ${selectedLot.status}`);
      }
      // CASE 3: Assigning a homeowner to a vacant lot
      else if (selectedUserId) {
        // Get the selected user data
        const userDocRef = doc(db, 'users', selectedUserId);
        const userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) {
          toast.error('Selected user does not exist');
          return;
        }
        
        // Update the user with the house number and block/lot information
        await updateDoc(userDocRef, {
          house_no: selectedLot.house_no,
          block: selectedLot.block,
          lot: selectedLot.lot,
          last_updated: serverTimestamp()
        });
        
        // Update the lot document
        await setDoc(lotDocRef, {
          house_no: selectedLot.house_no,
          block: selectedLot.block,
          lot: selectedLot.lot,
          status: 'Occupied',
          owner_id: selectedUserId,
          house_owner: userSnap.data().username || `${userSnap.data().firstName || ''} ${userSnap.data().lastName || ''}`.trim() || 'Unknown',
          houseModel: userSnap.data().houseModel || 'Standard',
          last_updated: serverTimestamp(),
          created_at: serverTimestamp()
        }, { merge: true });
        
        toast.success('Lot assigned to homeowner successfully');
      }
      
      setShowAssignModal(false);
      fetchLots(); // Refresh the lots data
      fetchUsers(); // Refresh the users data
    } catch (error) {
      console.error('Error updating lot:', error);
      toast.error('Failed to update lot: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter lots based on selected status
  const filteredLots = selectedFilter === 'All' 
    ? lots 
    : lots.filter(lot => lot.status === selectedFilter);

  // Add search functionality
  const searchedAndFilteredLots = filteredLots.filter(lot => 
    lot.house_no?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
    lot.house_owner?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
    `Block ${lot.block} Lot ${lot.lot}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group lots by block for better display
  const lotsByBlock = {};
  searchedAndFilteredLots.forEach(lot => {
    if (!lotsByBlock[lot.block]) {
      lotsByBlock[lot.block] = [];
    }
    lotsByBlock[lot.block].push(lot);
  });

  // Find the next available lot number for a given block
  const findNextAvailableLotNumber = (blockNum) => {
    // Get all lots from the selected block
    const blockLots = lots.filter(lot => lot.block === parseInt(blockNum));
    
    // If no lots exist for this block, start with lot 1
    if (blockLots.length === 0) {
      return 1;
    }
    
    // Get all lot numbers in use for this block
    const usedLotNumbers = blockLots.map(lot => lot.lot);
    
    // Find the maximum lot number used in this block
    const maxLotNumber = Math.max(...usedLotNumbers);
    
    // Check if there are any gaps in the sequence
    for (let i = 1; i <= maxLotNumber; i++) {
      if (!usedLotNumbers.includes(i)) {
        return i; // Found a gap, return this lot number
      }
    }
    
    // No gaps found, return the next number after the maximum
    return maxLotNumber + 1;
  };
  
  // Function to add a new lot to Firebase
  const handleAddNewLot = async () => {
    setIsAddingLot(true);
    
    try {
      // Determine the lot number to use
      const lotNumber = autoLotNumber 
        ? findNextAvailableLotNumber(newLotBlock) 
        : parseInt(newLotNumber);
      
      // Ensure the lot number is valid
      if (lotNumber <= 0 || lotNumber > blockConfig[newLotBlock]) {
        toast.error(`Lot number must be between 1 and ${blockConfig[newLotBlock]}`);
        setIsAddingLot(false);
        return;
      }
      
      // Check if this lot already exists
      const blockNum = parseInt(newLotBlock);
      const existingLot = lots.find(lot => lot.block === blockNum && lot.lot === lotNumber);
      
      if (existingLot) {
        toast.error(`Block ${blockNum}, Lot ${lotNumber} already exists.`);
        setIsAddingLot(false);
        return;
      }
      
      // Calculate the house number based on our formula
      const houseNo = (blockNum * 100) + lotNumber;
      
      // Generate the lot document ID
      const lotId = `B${blockNum}-L${lotNumber.toString().padStart(2, '0')}`;
      
      // Create the new lot in Firebase
      const lotDocRef = doc(db, 'lots', lotId);
      await setDoc(lotDocRef, {
        house_no: houseNo,
        block: blockNum,
        lot: lotNumber,
        status: 'Vacant',
        owner_id: null,
        house_owner: null,
        houseModel: 'Standard',
        created_at: serverTimestamp(),
        last_updated: serverTimestamp()
      });
      
      toast.success(`Successfully created new lot: Block ${blockNum}, Lot ${lotNumber} (House #${houseNo})`);
      
      // Close the modal and refresh the lots
      setShowAddLotModal(false);
      fetchLots();
      
      // Reset the form
      setNewLotNumber('');
      
    } catch (error) {
      console.error('Error adding new lot:', error);
      toast.error('Failed to add new lot: ' + error.message);
    } finally {
      setIsAddingLot(false);
    }
  };
  
  // Calculate statistics
  const stats = {
    total: lots.length,
    vacant: lots.filter(lot => lot.status === 'Vacant').length,
    occupied: lots.filter(lot => lot.status === 'Occupied').length,
    forSale: lots.filter(lot => lot.status === 'For Sale').length,
    reserved: lots.filter(lot => lot.status === 'Reserved').length
  };

  return (
    <AdminLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <FaHome className="mr-3 text-blue-500 text-2xl" />
            Lot Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Monitor and manage residential lots in Dulalia Homes</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaHome className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h2 className="text-xs font-medium text-gray-600">Total Lots</h2>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaHome className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h2 className="text-xs font-medium text-gray-600">Occupied</h2>
                <p className="text-xl font-semibold text-gray-900">{stats.occupied}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-400">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <FaHome className="h-5 w-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <h2 className="text-xs font-medium text-gray-600">Vacant</h2>
                <p className="text-xl font-semibold text-gray-900">{stats.vacant}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaHome className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h2 className="text-xs font-medium text-gray-600">For Sale</h2>
                <p className="text-xl font-semibold text-gray-900">{stats.forSale}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaHome className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <h2 className="text-xs font-medium text-gray-600">Reserved</h2>
                <p className="text-xl font-semibold text-gray-900">{stats.reserved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full md:w-1/3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by block, lot, number or owner..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-32"
              >
                {validStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <button
                onClick={() => fetchLots()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <button
                onClick={() => setShowAddLotModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
              >
                <FaUserPlus className="mr-2" /> Add New Lot
              </button>
            </div>
          </div>
        </div>

        {/* Lots Grid View */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Lot Monitoring Map</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : searchedAndFilteredLots.length === 0 ? (
            <div className="text-center py-12">
              <FaHome className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No lots found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No lots match your current search and filter criteria.
              </p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2 bg-green-500"></div>
                  <span className="text-sm">Occupied</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2 bg-gray-300"></div>
                  <span className="text-sm">Vacant</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2 bg-yellow-500"></div>
                  <span className="text-sm">For Sale</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded mr-2 bg-purple-500"></div>
                  <span className="text-sm">Reserved</span>
                </div>
              </div>
              
              {/* Blocks Section */}
              {Object.keys(lotsByBlock).sort((a, b) => parseInt(a) - parseInt(b)).map(blockNumber => (
                <div key={blockNumber} className="mb-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-blue-800">
                      Block {blockNumber}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {lotsByBlock[blockNumber].length} lots
                    </span>
                  </div>
                  
                  {/* Grid Layout for this block */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {lotsByBlock[blockNumber]
                      .sort((a, b) => a.lot - b.lot)
                      .map((lot) => {
                        // Determine status color based on lot status
                        let statusColor;
                        switch(lot.status) {
                          case 'Occupied':
                            statusColor = 'bg-green-500';
                            break;
                          case 'For Sale':
                            statusColor = 'bg-yellow-500';
                            break;
                          case 'Reserved':
                            statusColor = 'bg-purple-500';
                            break;
                          default:
                            statusColor = 'bg-gray-300'; // Vacant
                        }
                        
                        return (
                          <div 
                            key={lot.id} 
                            className="relative p-3 border rounded-lg hover:shadow-md transition-shadow"
                            onClick={() => {
                              setSelectedLot(lot);
                              setShowAssignModal(true);
                              setSelectedUserId('');
                            }}
                          >
                            {/* Status indicator */}
                            <div className={`absolute top-0 right-0 w-3 h-3 rounded-full ${statusColor} m-2`}></div>
                            
                            {/* Block/Lot label */}
                            <div className="mb-2">
                              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                B{lot.block}-L{lot.lot.toString().padStart(2, '0')}
                              </span>
                            </div>
                            
                            {/* House Number */}
                            <div className="flex items-center mb-2">
                              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-100">
                                <FaHome className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="ml-2">
                                <p className="text-sm font-medium">#{lot.house_no}</p>
                                <p className="text-xs text-gray-500">{lot.houseModel || 'Standard'}</p>
                              </div>
                            </div>
                            
                            {/* Owner Information */}
                            <div className="border-t pt-2">
                              <p className="text-xs text-gray-500">Owner</p>
                              <p className="text-sm font-medium truncate">
                                {lot.house_owner || 'None (Vacant)'}
                              </p>
                              
                              {/* Action button based on lot status */}
                              <button 
                                className={`mt-2 w-full text-xs py-1 rounded hover:bg-opacity-80 flex items-center justify-center ${
                                  lot.status === 'Occupied' 
                                    ? 'bg-green-100 text-green-700' 
                                    : lot.status === 'For Sale'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : lot.status === 'Reserved'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {lot.status === 'Vacant' ? (
                                  <>
                                    <FaUserPlus className="mr-1 h-3 w-3" />
                                    Assign
                                  </>
                                ) : lot.status === 'Occupied' ? (
                                  <>
                                    <FaUser className="mr-1 h-3 w-3" />
                                    Manage
                                  </>
                                ) : lot.status === 'For Sale' ? (
                                  <>
                                    <FaTag className="mr-1 h-3 w-3" />
                                    For Sale
                                  </>
                                ) : (
                                  <>
                                    <FaClock className="mr-1 h-3 w-3" />
                                    Reserved
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        
        {/* Lot Assignment Modal */}
        {showAssignModal && selectedLot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedLot.status === 'Occupied' 
                    ? 'Manage Occupied Lot'
                    : selectedLot.house_owner 
                      ? 'Manage Assigned Lot' 
                      : 'Manage Lot Status'}
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <FaTimes />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="px-6 py-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Selected Lot</p>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Block {selectedLot.block}, Lot {selectedLot.lot}</span>
                      <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                        #{selectedLot.house_no}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Status: <span className={
                        selectedLot.status === 'Occupied' ? 'text-green-600' :
                        selectedLot.status === 'For Sale' ? 'text-yellow-600' :
                        selectedLot.status === 'Reserved' ? 'text-purple-600' :
                        'text-gray-600'
                      }>{selectedLot.status}</span>
                    </p>
                    {selectedLot.house_owner && (
                      <p className="text-sm text-gray-600 mt-1">
                        Current Owner: {selectedLot.house_owner}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* If lot is Occupied, show option to mark as Vacant */}
                {selectedLot.status === 'Occupied' ? (
                  <div className="mb-4">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Homeowner Leaving Notice</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>This action will mark the lot as vacant and remove the current homeowner association. This should only be done when a homeowner is leaving Dulalia Homes.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId('remove')}
                      className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Mark Lot as Vacant (Remove Homeowner)
                    </button>
                  </div>
                ) : (
                  /* For vacant lots, show status change options or homeowner assignment */
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Change Lot Status
                      </label>
                      <select
                        value={selectedLot.status}
                        onChange={(e) => {
                          setSelectedLot({...selectedLot, status: e.target.value});
                          // Clear selected user if status is not Vacant since we'll only assign users to vacant lots
                          if (e.target.value !== 'Vacant') {
                            setSelectedUserId('status-change');
                          } else {
                            setSelectedUserId('');
                          }
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="Vacant">Vacant</option>
                        <option value="For Sale">For Sale</option>
                        <option value="Reserved">Reserved</option>
                      </select>
                    </div>
                    
                    {selectedLot.status === 'Vacant' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assign to Homeowner (Optional)
                        </label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">-- Select a homeowner --</option>
                          {users
                            .filter(user => !user.house_no || user.house_no === selectedLot.house_no) // Filter to show only users without lots or with this lot
                            .map(user => (
                              <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.username || user.email})
                              </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                          Only showing homeowners who don't already have an assigned lot.
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignLot}
                    disabled={isSubmitting || (selectedLot.status === 'Vacant' && !selectedUserId && selectedUserId !== 'remove')}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isSubmitting || (selectedLot.status === 'Vacant' && !selectedUserId && selectedUserId !== 'remove')
                        ? 'bg-blue-300 cursor-not-allowed' 
                        : selectedUserId === 'remove'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        Processing...
                      </>
                    ) : selectedLot.status === 'Occupied' ? (
                      'Mark as Vacant'
                    ) : selectedUserId === 'status-change' ? (
                      `Update Status to ${selectedLot.status}`
                    ) : selectedUserId ? (
                      'Assign Lot'
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add New Lot Modal */}
        {showAddLotModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Lot
                </h3>
                <button
                  onClick={() => setShowAddLotModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <FaTimes />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="px-6 py-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Block
                  </label>
                  <select
                    value={newLotBlock}
                    onChange={(e) => setNewLotBlock(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {Object.keys(blockConfig).map(blockNum => (
                      <option key={blockNum} value={blockNum}>Block {blockNum}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Each block has a different layout and maximum number of lots.
                  </p>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center">
                    <input
                      id="autoLotNumber"
                      name="autoLotNumber"
                      type="checkbox"
                      checked={autoLotNumber}
                      onChange={(e) => setAutoLotNumber(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoLotNumber" className="ml-2 block text-sm font-medium text-gray-700">
                      Automatically assign lot number (recommended)
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This will find the next available lot number in the selected block.
                  </p>
                </div>
                
                {!autoLotNumber && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lot Number
                    </label>
                    <input
                      type="number"
                      value={newLotNumber}
                      onChange={(e) => setNewLotNumber(e.target.value)}
                      min="1"
                      max={blockConfig[newLotBlock]}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={`Enter lot number (1-${blockConfig[newLotBlock]})`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Manual lot number assignment may cause conflicts if not careful.
                    </p>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddLotModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewLot}
                    disabled={isAddingLot || (!autoLotNumber && !newLotNumber)}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                      isAddingLot || (!autoLotNumber && !newLotNumber)
                        ? 'bg-green-300 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isAddingLot ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        Creating...
                      </>
                    ) : (
                      'Create New Lot'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LotMonitoring;