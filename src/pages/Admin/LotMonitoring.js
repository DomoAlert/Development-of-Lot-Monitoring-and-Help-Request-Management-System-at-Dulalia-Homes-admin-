import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import ResponsiveLayout from '../../components/ResponsiveLayout';
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
  
  // Combined Modal State
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [activeTab, setActiveTab] = useState('addLot'); // 'addLot' or 'manageBlocks'
  const [lastActiveTab, setLastActiveTab] = useState('addLot'); // Remember last tab
  const [showDeleteBlockConfirm, setShowDeleteBlockConfirm] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState(null);

  // Valid statuses for lots
  const validStatuses = [
    'All',
    'Vacant',
    'Occupied',
    'For Sale',
    'Reserved',
  ];

  // Blocks configuration - how many lots are in each block
  // Stored in Firestore under collection 'settings' doc 'lotConfig'
  const [blockConfig, setBlockConfig] = useState({
    1: 20,
    2: 25,
    3: 15,
    4: 22,
    5: 18
  });
  const [blockEditValues, setBlockEditValues] = useState({}); // { blockNum: maxLots }
  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [newBlockMax, setNewBlockMax] = useState('');

  // Add Lot Modal State
  const [newLotBlock, setNewLotBlock] = useState('1');
  const [newLotNumber, setNewLotNumber] = useState('');
  const [autoLotNumber, setAutoLotNumber] = useState(true);
  const [isAddingLot, setIsAddingLot] = useState(false);
  const [lotNumberError, setLotNumberError] = useState('');

  // Helper to safely set numeric block values in edit form
  const setBlockValue = (blockNum, value) => {
    setBlockEditValues(prev => ({ ...prev, [blockNum]: value }));
  };

  const incrementBlock = (blockNum) => {
    const current = parseInt(blockEditValues[blockNum] || 0) || 0;
    setBlockValue(blockNum, current + 1);
  };

  const decrementBlock = (blockNum, minAllowed = 1) => {
    const current = parseInt(blockEditValues[blockNum] || 0) || 0;
    const next = current - 1;
    if (next < minAllowed) return; // disabled by UI but double-guard
    setBlockValue(blockNum, next);
  };

  // Helpers for new block stepper
  const incrementNewBlockMax = () => setNewBlockMax((parseInt(newBlockMax || '0') || 0) + 1 + '');
  const decrementNewBlockMax = () => {
    const cur = parseInt(newBlockMax || '0') || 0;
    if (cur <= 1) return;
    setNewBlockMax((cur - 1) + '');
  };

  // Set page title and fetch lots and users from Firebase
  useEffect(() => {
    document.title = "Lot Monitoring";
    fetchLots();
    fetchUsers();
    fetchBlockConfig();
  }, []);

  // Scroll modal content to top when tab changes
  useEffect(() => {
    if (showCombinedModal) {
      const modalContent = document.querySelector('.modal-content-scroll');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
    }
  }, [activeTab, showCombinedModal]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = showCombinedModal ? 'hidden' : 'auto';
  }, [showCombinedModal]);

  // Fetch block configuration from Firestore
  const fetchBlockConfig = async () => {
    try {
      const configDocRef = doc(db, 'settings', 'lotConfig');
      const configSnap = await getDoc(configDocRef);
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data && data.blocks) {
          setBlockConfig(data.blocks);
        }
      }
    } catch (error) {
      console.error('Error fetching block configuration:', error);
      // keep defaults
    }
  };

  // Save block configuration to Firestore
  const saveBlockConfig = async (newConfig) => {
    try {
      const configDocRef = doc(db, 'settings', 'lotConfig');
      await setDoc(configDocRef, { blocks: newConfig, updatedAt: serverTimestamp() }, { merge: true });
      setBlockConfig(newConfig);
      toast.success('Block configuration saved successfully');
      fetchLots(); // Refresh lots data
      fetchBlockConfig(); // Refresh block config
    } catch (error) {
      console.error('Error saving block configuration:', error);
      toast.error('Failed to save block configuration: ' + error.message);
    }
  };

  // Handle block deletion with validation
  const handleDeleteBlock = (blockNum) => {
    const existingCount = lots.filter(l => l.block === parseInt(blockNum)).length;
    if (existingCount > 0) {
      toast.error(`Cannot delete Block ${blockNum}: It contains ${existingCount} lot(s). Remove all lots first.`);
      return;
    }
    setBlockToDelete(blockNum);
    setShowDeleteBlockConfirm(true);
  };

  const confirmDeleteBlock = () => {
    if (blockToDelete) {
      const copy = { ...blockEditValues };
      delete copy[blockToDelete];
      setBlockEditValues(copy);
      toast.success(`Block ${blockToDelete} removed from configuration`);
    }
    setShowDeleteBlockConfirm(false);
    setBlockToDelete(null);
  };

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

  // Handle removing homeowner directly
  const handleRemoveHomeowner = async () => {
    if (!selectedLot) {
      toast.error('No lot selected');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Generate the lot document ID
      const lotId = `B${selectedLot.block}-L${selectedLot.lot.toString().padStart(2, '0')}`;
      const lotDocRef = doc(db, 'lots', lotId);
      
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
      setShowAssignModal(false);
      fetchLots(); // Refresh the lots data
      fetchUsers(); // Refresh the users data
    } catch (error) {
      console.error('Error removing homeowner:', error);
      toast.error('Failed to remove homeowner: ' + error.message);
    } finally {
      setIsSubmitting(false);
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
      
      // CASE 1: Changing the status of an unoccupied lot
      if (selectedUserId === 'status-change') {
        await setDoc(lotDocRef, {
          house_no: selectedLot.house_no,
          block: selectedLot.block,
          lot: selectedLot.lot,
          status: selectedLot.status,
          last_updated: serverTimestamp()
        }, { merge: true });
        
        toast.success(`Lot status updated to ${selectedLot.status}`);
      }
      // CASE 2: Assigning a homeowner to a vacant lot
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
  
  // Validate lot number input
  const validateLotNumber = (blockNum, lotNum) => {
    const lotNumber = parseInt(lotNum);
    const blockNumber = parseInt(blockNum);
    
    // Clear previous error
    setLotNumberError('');
    
    // Check if lot number is empty
    if (!lotNum || lotNum === '') {
      return false;
    }
    
    // Check if lot number is valid
    if (isNaN(lotNumber) || lotNumber <= 0) {
      setLotNumberError('Lot number must be a positive number');
      return false;
    }
    
    // Check if lot number exceeds block limit
    if (lotNumber > blockConfig[blockNum]) {
      setLotNumberError(`Lot number cannot exceed ${blockConfig[blockNum]} for Block ${blockNum}`);
      return false;
    }
    
    // Check if lot already exists
    const existingLot = lots.find(lot => lot.block === blockNumber && lot.lot === lotNumber);
    if (existingLot) {
      setLotNumberError(`Block ${blockNumber}, Lot ${lotNumber} already exists`);
      return false;
    }
    
    return true;
  };
  
  // Function to add a new lot to Firebase
  const handleAddNewLot = async () => {
    setIsAddingLot(true);
    
    try {
      // Determine the lot number to use
      const lotNumber = autoLotNumber 
        ? findNextAvailableLotNumber(newLotBlock) 
        : parseInt(newLotNumber);
      
      // For manual input, validate the lot number
      if (!autoLotNumber) {
        const isValid = validateLotNumber(newLotBlock, newLotNumber);
        if (!isValid) {
          setIsAddingLot(false);
          return;
        }
      }
      
      // For auto lot number, ensure it's valid
      if (autoLotNumber && (lotNumber <= 0 || lotNumber > blockConfig[newLotBlock])) {
        toast.error(`Cannot create lot: Block ${newLotBlock} is full or invalid`);
        setIsAddingLot(false);
        return;
      }
      
      // Calculate the house number based on our formula
      const blockNum = parseInt(newLotBlock);
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
      
      // Reset the form
      setNewLotNumber('');
      setLotNumberError('');
      
      // Refresh the lots and block config
      fetchLots();
      fetchBlockConfig();
      
    } catch (error) {
      console.error('Error adding new lot:', error);
      toast.error('Failed to add new lot: ' + error.message);
    } finally {
      setIsAddingLot(false);
    }
  };
  
  // Handle lot number input change with validation
  const handleLotNumberChange = (e) => {
    const value = e.target.value;
    setNewLotNumber(value);
    
    // Clear error when user starts typing
    if (lotNumberError) {
      setLotNumberError('');
    }
    
    // Validate on input if value is not empty
    if (value && value.trim() !== '') {
      validateLotNumber(newLotBlock, value);
    }
  };
  
  // Clear error when block changes
  const handleBlockChange = (e) => {
    const newBlock = e.target.value;
    setNewLotBlock(newBlock);
    setLotNumberError('');
    
    // Re-validate current lot number if it exists
    if (newLotNumber && !autoLotNumber) {
      validateLotNumber(newBlock, newLotNumber);
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
    <ResponsiveLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
            <FaHome className="mr-3 text-blue-500 text-2xl" />
            Lot Monitoring
          </h1>
          <p className="text-gray-600 text-gray-700 mt-2">Monitor and manage residential lots in Dulalia Homes</p>
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
                onClick={() => {
                  // Prepare block edit values
                  const edits = {};
                  Object.keys(blockConfig).forEach(k => edits[k] = blockConfig[k]);
                  setBlockEditValues(edits);
                  setNewBlockNumber('');
                  setNewBlockMax('');
                  
                  // Reset add lot form
                  setNewLotNumber('');
                  setLotNumberError('');
                  setAutoLotNumber(true);
                  
                  // Set initial tab to last used tab and open modal
                  setActiveTab(lastActiveTab);
                  setShowCombinedModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center shadow-md transition-all duration-200"
              >
                <FaUserPlus className="mr-2" /> Lot & Block Management
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
                      Block {blockNumber} {blockConfig[blockNumber] ? `— max ${blockConfig[blockNumber]} lots` : ''}
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
                
                {/* If lot is Occupied, no additional form controls needed */}
                {selectedLot.status === 'Occupied' ? (
                  <div className="mb-4">
                    {/* No additional controls for occupied lots - action button is at the bottom */}
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
                  {selectedLot.status === 'Occupied' ? (
                    <button
                      type="button"
                      onClick={handleRemoveHomeowner}
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        isSubmitting 
                          ? 'bg-red-300 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⟳</span>
                          Removing...
                        </>
                      ) : (
                        'Mark as Vacant'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleAssignLot}
                      disabled={isSubmitting || (selectedLot.status === 'Vacant' && !selectedUserId)}
                      className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isSubmitting || (selectedLot.status === 'Vacant' && !selectedUserId)
                          ? 'bg-blue-300 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⟳</span>
                          Processing...
                        </>
                      ) : selectedUserId === 'status-change' ? (
                        `Update Status to ${selectedLot.status}`
                      ) : selectedUserId ? (
                        'Assign Lot'
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Combined Lot & Block Management Modal */}
        {showCombinedModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2"
            onClick={() => {
              setShowCombinedModal(false);
              setLotNumberError('');
              setNewLotNumber('');
              setLastActiveTab(activeTab);
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-2xl w-full mx-2 sm:mx-auto max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 py-2.5 border-b flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="bg-white/20 p-1.5 rounded-lg flex-shrink-0">
                    <FaHome className="text-white text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white truncate">
                      Lot & Block Management
                    </h3>
                    <p className="text-xs text-indigo-100 truncate">Admin Configuration Panel</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCombinedModal(false);
                    setLotNumberError('');
                    setNewLotNumber('');
                    setLastActiveTab(activeTab); // Remember current tab
                  }}
                  className="text-white hover:text-gray-200 focus:outline-none transition-colors duration-200 flex-shrink-0 ml-2"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
              
              {/* Tab Navigation */}
              <div className="px-4 py-2 border-b bg-gray-50 flex-shrink-0">
                <div className="flex space-x-1 overflow-x-auto">
                  <button
                    onClick={() => {
                      setActiveTab('addLot');
                      setLastActiveTab('addLot');
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 whitespace-nowrap ${
                      activeTab === 'addLot'
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <FaUserPlus className="text-base" />
                    <span className="font-semibold">Add Lots</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('manageBlocks');
                      setLastActiveTab('manageBlocks');
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 whitespace-nowrap ${
                      activeTab === 'manageBlocks'
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <FaTag className="text-base" />
                    <span className="font-semibold">Block Management</span>
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-4 sm:p-6">
                {/* Add Lot Tab */}
                {activeTab === 'addLot' && (
                  <div className="space-y-4">
                    {/* Helper Banner */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-xs text-blue-700 font-medium">
                            Add new lots to existing blocks
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Note: Blocks are created in the <button onClick={() => setActiveTab('manageBlocks')} className="underline font-semibold hover:text-blue-800">Block Management</button> tab.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center">
                          <FaHome className="mr-2 text-indigo-600" />
                          Select Block
                        </span>
                      </label>
                      <select
                        value={newLotBlock}
                        onChange={handleBlockChange}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
                      >
                        {Object.keys(blockConfig).sort((a,b) => parseInt(a) - parseInt(b)).map(blockNum => (
                          <option key={blockNum} value={blockNum}>
                            Block {blockNum} (Max: {blockConfig[blockNum]} lots)
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        Each block has a different layout and maximum number of lots configured by the admin.
                      </p>
                    </div>
                    
                    <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <input
                          id="autoLotNumber"
                          name="autoLotNumber"
                          type="checkbox"
                          checked={autoLotNumber}
                          onChange={(e) => {
                            setAutoLotNumber(e.target.checked);
                            if (e.target.checked) {
                              setLotNumberError('');
                            }
                          }}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label htmlFor="autoLotNumber" className="ml-3 block text-sm font-medium text-gray-700">
                          <span className="flex items-center">
                            Automatically assign lot number
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">Recommended</span>
                          </span>
                        </label>
                      </div>
                      <p className="mt-2 ml-7 text-xs text-gray-500">
                        The system will find the next available lot number in the selected block automatically.
                      </p>
                    </div>
                    
                    {!autoLotNumber && (
                      <div className="mb-4 animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            <FaTag className="mr-2 text-orange-600" />
                            Lot Number (Manual Entry)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={newLotNumber}
                          onChange={handleLotNumberChange}
                          min="1"
                          max={blockConfig[newLotBlock]}
                          className={`block w-full px-4 py-3 border rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm shadow-sm ${
                            lotNumberError 
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                          }`}
                          placeholder={`Enter lot number (1-${blockConfig[newLotBlock]})`}
                        />
                        {lotNumberError && (
                          <div className="mt-2 flex items-start">
                            <svg className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs text-red-600 font-medium">
                              {lotNumberError}
                            </p>
                          </div>
                        )}
                        {!lotNumberError && (
                          <p className="mt-2 text-xs text-gray-500">
                            ⚠️ Manual lot number assignment may cause conflicts. Ensure the lot number is not already in use.
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-8 pt-6 border-t flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowCombinedModal(false);
                          setLotNumberError('');
                          setNewLotNumber('');
                        }}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddNewLot}
                        disabled={isAddingLot || (!autoLotNumber && (!newLotNumber || lotNumberError))}
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 flex items-center ${
                          isAddingLot || (!autoLotNumber && (!newLotNumber || lotNumberError))
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-md'
                        }`}
                      >
                        {isAddingLot ? (
                          <>
                            <span className="inline-block animate-spin mr-2">⟳</span>
                            Creating Lot...
                          </>
                        ) : (
                          <>
                            <FaUserPlus className="mr-2" />
                            Create New Lot
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Manage Blocks Tab */}
                {activeTab === 'manageBlocks' && (
                  <div className="space-y-4">
                    {/* Warning Banner */}
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-xs text-orange-700 font-medium">
                            Structural Settings - Handle with Care
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            These settings affect how the subdivision map is generated.
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600">
                      Configure maximum lots per block, add new blocks, or remove existing blocks.
                    </p>

                    {/* Existing Blocks */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                        <FaHome className="mr-2 text-indigo-600" />
                        Existing Blocks
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.keys(blockEditValues).sort((a,b)=>parseInt(a)-parseInt(b)).map(blockNum => {
                          const existingCount = lots.filter(l => l.block === parseInt(blockNum)).length;
                          const rawVal = blockEditValues[blockNum];
                          const newMax = parseInt(rawVal || 0) || 0;
                          const willShrinkBelowExisting = newMax > 0 && newMax < existingCount;
                          const minAllowed = Math.max(1, existingCount);
                          const canDelete = existingCount === 0;
                          
                          return (
                            <div key={blockNum} className="bg-white border border-gray-300 rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="bg-indigo-100 p-1.5 rounded">
                                    <FaHome className="text-indigo-600 text-sm" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-800 text-sm">Block {blockNum}</span>
                                    <p className="text-xs text-gray-500">{existingCount} lot(s)</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Max:</label>
                                <div className="flex items-center border border-gray-300 rounded overflow-hidden flex-1">
                                  <button
                                    onClick={() => decrementBlock(blockNum, minAllowed)}
                                    disabled={newMax <= minAllowed}
                                    className={`px-3 py-2 flex-shrink-0 text-sm font-bold ${newMax <= minAllowed ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-gray-700 bg-white hover:bg-gray-100'}`}
                                    aria-label={`Decrease Block ${blockNum} max`}
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    value={rawVal}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value || '0') || 0;
                                      const clamped = val < minAllowed ? minAllowed : val;
                                      setBlockValue(blockNum, clamped);
                                    }}
                                    className="w-full px-2 py-1 text-center text-sm font-semibold border-0 focus:ring-0"
                                    min={minAllowed}
                                  />
                                  <button
                                    onClick={() => incrementBlock(blockNum)}
                                    className="px-3 py-2 flex-shrink-0 text-sm font-bold text-gray-700 bg-white hover:bg-gray-100"
                                    aria-label={`Increase Block ${blockNum} max`}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {willShrinkBelowExisting && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5 mb-2">
                                  <p className="text-xs text-yellow-800">
                                    ⚠️ Cannot reduce below {existingCount}
                                  </p>
                                </div>
                              )}

                              <button
                                className={`w-full px-2 py-1.5 text-xs rounded transition-colors duration-200 flex items-center justify-center ${
                                  canDelete 
                                    ? 'bg-red-600 text-white hover:bg-red-700' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                onClick={() => canDelete && handleDeleteBlock(blockNum)}
                                disabled={!canDelete}
                                title={canDelete ? 'Remove this block' : 'Cannot delete: Contains existing lots'}
                              >
                                <FaTimes className="mr-1 text-xs" />
                                {canDelete ? 'Remove' : 'Has Lots'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t"></div>

                    {/* Add New Block Section */}
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <FaUserPlus className="mr-2 text-green-600" />
                        Add New Block
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Block Number</label>
                          <input 
                            type="number" 
                            value={newBlockNumber} 
                            onChange={e => setNewBlockNumber(e.target.value)} 
                            className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm" 
                            min="1" 
                            placeholder="e.g., 6"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Max Lots</label>
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button
                              onClick={decrementNewBlockMax}
                              disabled={(parseInt(newBlockMax || '0') || 0) <= 1}
                              className={`px-3 py-2 flex-shrink-0 text-sm font-bold ${((parseInt(newBlockMax || '0') || 0) <= 1) ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-gray-700 bg-white hover:bg-gray-100'}`}
                              aria-label="Decrease new block max"
                            >
                              −
                            </button>
                            <input 
                              type="number" 
                              value={newBlockMax} 
                              onChange={e => setNewBlockMax(e.target.value)} 
                              className="w-full px-2 py-2 text-center text-sm font-semibold border-0 focus:ring-0" 
                              min="1" 
                              placeholder="20"
                            />
                            <button
                              onClick={incrementNewBlockMax}
                              className="px-3 py-2 flex-shrink-0 text-sm font-bold text-gray-700 bg-white hover:bg-gray-100"
                              aria-label="Increase new block max"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              const bn = newBlockNumber.toString();
                              const max = parseInt(newBlockMax || '0');
                              if (!bn || isNaN(max) || max <= 0) {
                                toast.error('Enter a valid block number and max lots');
                                return;
                              }
                              if (blockEditValues[bn]) {
                                toast.error('Block already exists in the list');
                                return;
                              }
                              setBlockEditValues(prev => ({ ...prev, [bn]: max }));
                              setNewBlockNumber('');
                              setNewBlockMax('');
                              toast.success(`Block ${bn} added with max ${max} lots`);
                            }}
                            className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 text-sm font-medium shadow-md transition-all duration-200 flex items-center justify-center"
                          >
                            <FaUserPlus className="mr-1.5 text-sm" />
                            Add Block
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
                      <button 
                        onClick={() => {
                          setShowCombinedModal(false);
                        }} 
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          saveBlockConfig(blockEditValues);
                        }} 
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 font-medium shadow-md transition-all duration-200 flex items-center"
                      >
                        <FaTag className="mr-2" />
                        Save Configuration
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Block Confirmation Modal */}
        {showDeleteBlockConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="h-6 w-6 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Confirm Block Deletion
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to remove <span className="font-semibold">Block {blockToDelete}</span> from the configuration?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-xs text-yellow-800">
                    This action will remove the block from future lot creation options.
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowDeleteBlockConfirm(false);
                    setBlockToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBlock}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Remove Block
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default LotMonitoring;
