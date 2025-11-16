import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, doc, updateDoc, getDoc, setDoc, serverTimestamp, addDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { FaHome, FaSearch, FaUserEdit, FaUserPlus, FaTimes, FaUser, FaTag, FaClock } from 'react-icons/fa';
import { color } from 'framer-motion';

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

  // Blocks configuration - stored in Firestore 'blocks' collection
  const [blocks, setBlocks] = useState([]); // Array of { id, blockNumber, maxLots, createdAt }
  const [newBlockNumber, setNewBlockNumber] = useState('');
  const [newBlockMax, setNewBlockMax] = useState('');
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  // Add Lot Modal State
  const [newLotBlock, setNewLotBlock] = useState('1');
  const [newLotNumber, setNewLotNumber] = useState('');
  const [autoLotNumber, setAutoLotNumber] = useState(true);
  const [isAddingLot, setIsAddingLot] = useState(false);
  const [lotNumberError, setLotNumberError] = useState('');
  const [numberOfLots, setNumberOfLots] = useState('1'); // How many lots to add

  // Helpers for new block stepper
  const incrementNewBlockMax = () => setNewBlockMax((parseInt(newBlockMax || '0') || 0) + 1 + '');
  const decrementNewBlockMax = () => {
    const cur = parseInt(newBlockMax || '0') || 0;
    if (cur <= 1) return;
    setNewBlockMax((cur - 1) + '');
  };

  // Get block configuration as object for backward compatibility
  const getBlockConfig = () => {
    const config = {};
    blocks.forEach(block => {
      config[block.blockNumber] = block.maxLots;
    });
    return config;
  };

  // Get block by number
  const getBlockByNumber = (blockNum) => {
    return blocks.find(b => b.blockNumber === parseInt(blockNum));
  };

  // Set page title and fetch data from Firebase
  useEffect(() => {
    document.title = "Lot Monitoring";
    fetchBlocks();
    fetchUsers();
  }, []);

  // Fetch lots when blocks are loaded
  useEffect(() => {
    if (blocks.length > 0) {
      fetchLots();
    }
  }, [blocks]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = showCombinedModal ? 'hidden' : 'auto';
  }, [showCombinedModal]);

  // Fetch blocks from Firestore collection
  const fetchBlocks = async () => {
    try {
      const blocksQuery = query(collection(db, 'blocks'), orderBy('blockNumber', 'asc'));
      const querySnapshot = await getDocs(blocksQuery);
      
      const blocksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        blockNumber: doc.data().blockNumber,
        maxLots: doc.data().maxLots,
        createdAt: doc.data().createdAt
      }));
      
      setBlocks(blocksData);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      toast.error('Failed to fetch blocks: ' + error.message);
    }
  };

  // Update block maxLots directly in Firebase
  const updateBlockMaxLots = async (blockId, newMaxLots) => {
    try {
      const blockDocRef = doc(db, 'blocks', blockId);
      await setDoc(blockDocRef, { maxLots: newMaxLots, updatedAt: serverTimestamp() }, { merge: true });
      toast.success('Block updated successfully');
      await fetchBlocks();
      await fetchLots();
    } catch (error) {
      console.error('Error updating block:', error);
      toast.error('Failed to update block: ' + error.message);
    }
  };

  // Handle block deletion with validation
  const handleDeleteBlock = async (blockId, blockNum) => {
    const existingCount = lots.filter(l => l.block === parseInt(blockNum)).length;
    if (existingCount > 0) {
      toast.error(`Cannot delete Block ${blockNum}: It contains ${existingCount} lot(s). Remove all lots first.`);
      return;
    }
    setBlockToDelete({ id: blockId, number: blockNum });
    setShowDeleteBlockConfirm(true);
  };

  const confirmDeleteBlock = async () => {
    if (blockToDelete) {
      try {
        await deleteDoc(doc(db, 'blocks', blockToDelete.id));
        toast.success(`Block ${blockToDelete.number} removed successfully`);
        await fetchBlocks();
      } catch (error) {
        console.error('Error deleting block:', error);
        toast.error('Failed to delete block: ' + error.message);
      }
    }
    setShowDeleteBlockConfirm(false);
    setBlockToDelete(null);
  };

  // Handle adding a new block directly to Firebase
  const handleAddNewBlock = async () => {
    const blockNum = parseInt(newBlockNumber);
    const maxLots = parseInt(newBlockMax || '0');
    
    // Validation
    if (!blockNum || isNaN(blockNum) || blockNum <= 0) {
      toast.error('Enter a valid block number');
      return;
    }
    
    if (isNaN(maxLots) || maxLots <= 0) {
      toast.error('Enter a valid max lots (greater than 0)');
      return;
    }
    
    // Check if block already exists
    if (blocks.some(b => b.blockNumber === blockNum)) {
      toast.error(`Block ${blockNum} already exists`);
      return;
    }
    
    setIsAddingBlock(true);
    
    try {
      // Add to blocks collection
      await addDoc(collection(db, 'blocks'), {
        blockNumber: blockNum,
        maxLots: maxLots,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Clear form
      setNewBlockNumber('');
      setNewBlockMax('');
      
      toast.success(`Block ${blockNum} added successfully with max ${maxLots} lots`);
      
      // Refresh data
      await fetchBlocks();
    } catch (error) {
      console.error('Error adding block:', error);
      toast.error('Failed to add block: ' + error.message);
    } finally {
      setIsAddingBlock(false);
    }
  };

  // Fetch all available users for lot assignment
  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const querySnapshot = await getDocs(usersQuery);

      const usersData = await Promise.all(querySnapshot.docs
        .filter(doc => doc.data().role === 'Homeowner') // Only get homeowners
        .map(async (doc) => {
          const userData = doc.data();

          // Fetch assigned lots for this user
          const assignedLotsQuery = query(collection(db, 'users', doc.id, 'assignedLots'));
          const assignedLotsSnapshot = await getDocs(assignedLotsQuery);

          const assignedLots = assignedLotsSnapshot.docs.map(lotDoc => ({
            id: lotDoc.id,
            ...lotDoc.data()
          }));

          return {
            id: doc.id,
            username: userData.username || 'Unknown',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            house_no: userData.house_no || null, // Keep for backward compatibility
            email: userData.email || '',
            assignedLots: assignedLots,
            totalLots: assignedLots.length
          };
        }));

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch user data: ' + error.message);
    }
  };
  
  // Fetch lots data from Firebase blocks collection with lots subcollection
  const fetchLots = async () => {
    try {
      setIsLoading(true);
      
      const allLots = [];
      
      // Fetch lots from each block's subcollection
      for (const block of blocks) {
        const lotsQuery = query(collection(db, 'blocks', block.id, 'lots'), orderBy('lotNumber', 'asc'));
        const lotsSnapshot = await getDocs(lotsQuery);
        
        lotsSnapshot.docs.forEach(lotDoc => {
          const lotData = lotDoc.data();
          allLots.push({
            id: lotDoc.id,
            block: block.blockNumber,
            lot: lotData.lotNumber,
            house_no: lotData.houseNumber,
            status: lotData.status || 'Vacant',
            owner_id: lotData.ownerId || null,
            house_owner: lotData.ownerName || null,
            houseModel: lotData.houseModel || 'Standard'
          });
        });
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
      // Get the block for this lot
      const blockData = getBlockByNumber(selectedLot.block);
      if (!blockData) {
        toast.error('Block not found');
        setIsSubmitting(false);
        return;
      }

      // Update the lot in subcollection
      const lotDocRef = doc(db, 'blocks', blockData.id, 'lots', selectedLot.id);
      await setDoc(lotDocRef, {
        status: 'Vacant',
        ownerId: null,
        ownerName: null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Remove assignment from user's subcollection
      if (selectedLot.owner_id) {
        const assignmentQuery = query(
          collection(db, 'users', selectedLot.owner_id, 'assignedLots'),
          where('lotId', '==', selectedLot.id)
        );
        const assignmentSnapshot = await getDocs(assignmentQuery);

        const deletePromises = assignmentSnapshot.docs.map(assignmentDoc =>
          deleteDoc(assignmentDoc.ref)
        );
        await Promise.all(deletePromises);
      }

      toast.success('Lot marked as vacant and homeowner assignment removed');
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
      // Get the block for this lot
      const blockData = getBlockByNumber(selectedLot.block);
      if (!blockData) {
        toast.error('Block not found');
        setIsSubmitting(false);
        return;
      }

      const lotDocRef = doc(db, 'blocks', blockData.id, 'lots', selectedLot.id);

      // CASE 1: Changing the status of an unoccupied lot
      if (selectedUserId === 'status-change') {
        await setDoc(lotDocRef, {
          status: selectedLot.status,
          updatedAt: serverTimestamp()
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

        const userData = userSnap.data();

        // Check if this lot is already assigned to this user
        const existingAssignmentQuery = query(
          collection(db, 'users', selectedUserId, 'assignedLots'),
          where('lotId', '==', selectedLot.id)
        );
        const existingAssignment = await getDocs(existingAssignmentQuery);

        if (!existingAssignment.empty) {
          toast.error('This lot is already assigned to this homeowner');
          return;
        }

        // Create assignment in user's subcollection
        const assignmentData = {
          lotId: selectedLot.id,
          blockId: blockData.id,
          blockNumber: selectedLot.block,
          lotNumber: selectedLot.lot,
          houseNumber: selectedLot.house_no,
          houseModel: userData.houseModel || 'Standard',
          assignedAt: serverTimestamp(),
          status: 'Active'
        };

        await addDoc(collection(db, 'users', selectedUserId, 'assignedLots'), assignmentData);

        // Update the lot document
        await setDoc(lotDocRef, {
          house_no: selectedLot.house_no,
          block: selectedLot.block,
          lot: selectedLot.lot,
          status: 'Occupied',
          owner_id: selectedUserId,
          house_owner: userSnap.data().username || `${userSnap.data().firstName || ''} ${userSnap.data().lastName || ''}`.trim() || 'Unknown',
          houseModel: userData.houseModel || 'Standard',
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
    const blockData = getBlockByNumber(blockNum);
    if (blockData && lotNumber > blockData.maxLots) {
      setLotNumberError(`Lot number cannot exceed ${blockData.maxLots} for Block ${blockNum}`);
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
      const numLots = parseInt(numberOfLots) || 1;
      const blockNum = parseInt(newLotBlock);
      
      // Validate number of lots
      if (numLots < 1) {
        toast.error('Number of lots must be at least 1');
        setIsAddingLot(false);
        return;
      }
      
      if (numLots > 50) {
        toast.error('Cannot add more than 50 lots at once');
        setIsAddingLot(false);
        return;
      }
      
      // Get block configuration
      const blockData = getBlockByNumber(newLotBlock);
      if (!blockData) {
        toast.error(`Block ${blockNum} is not configured yet. Please add it to Block Management first.`);
        setIsAddingLot(false);
        return;
      }
      const maxLotsForBlock = blockData.maxLots;

      
      // Check if block is already at capacity
      const currentBlockLots = lots.filter(lot => lot.block === blockNum).length;
      
      if (currentBlockLots >= maxLotsForBlock) {
        toast.error(`Block ${blockNum} is already at maximum capacity (${currentBlockLots}/${maxLotsForBlock} lots). Please increase the max lots in Block Management before adding more lots.`);
        setIsAddingLot(false);
        return;
      }
      
      // Check if adding the requested number of lots would exceed capacity
      if (currentBlockLots + numLots > maxLotsForBlock) {
        toast.error(`Cannot add ${numLots} lot(s). Block ${blockNum} can only accommodate ${maxLotsForBlock - currentBlockLots} more lot(s) (current: ${currentBlockLots}/${maxLotsForBlock}). Please increase the max lots in Block Management first.`);
        setIsAddingLot(false);
        return;
      }
      
      const lotsAdded = [];
      const lotsFailed = [];
      
      // Track the initial count of lots in this block
      let currentBlockLotsCount = lots.filter(lot => lot.block === blockNum).length;
      
      // Get all existing lot numbers for this block
      const blockLots = lots.filter(lot => lot.block === blockNum);
      const existingLotNumbers = new Set(blockLots.map(lot => lot.lot));
      
      for (let i = 0; i < numLots; i++) {
        try {
          // Check if we've reached the block limit
          if (currentBlockLotsCount >= maxLotsForBlock) {
            toast.warning(`Block ${blockNum} is full. Added ${lotsAdded.length} lot(s) before reaching limit.`);
            break;
          }
          
          // Find the next available lot number
          let lotNumber = 1;
          while (existingLotNumbers.has(lotNumber)) {
            lotNumber++;
          }
          
          // Mark this lot number as used
          existingLotNumbers.add(lotNumber);
          
          // Ensure the lot number is valid
          if (lotNumber <= 0 || lotNumber > maxLotsForBlock) {
            lotsFailed.push(`Lot ${lotNumber} - Block full or invalid`);
            continue;
          }
          
          // Calculate the house number
          const houseNo = (blockNum * 100) + lotNumber;
          
          // Create the new lot in blocks/{blockId}/lots subcollection
          await addDoc(collection(db, 'blocks', blockData.id, 'lots'), {
            lotNumber: lotNumber,
            houseNumber: houseNo,
            status: 'Vacant',
            ownerId: null,
            ownerName: null,
            houseModel: 'Standard',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          lotsAdded.push(`Block ${blockNum}, Lot ${lotNumber} (House #${houseNo})`);
          
          // Increment the counter
          currentBlockLotsCount++;
          
        } catch (error) {
          console.error('Error adding lot:', error);
          lotsFailed.push(`Lot - ${error.message}`);
        }
      }
      
      // Refresh lots state after all additions are complete
      await fetchLots();
      
      // Show summary toast
      if (lotsAdded.length > 0) {
        if (lotsAdded.length === 1) {
          toast.success(`Successfully created: ${lotsAdded[0]}`);
        } else {
          toast.success(`Successfully created ${lotsAdded.length} lot(s) in Block ${blockNum}`);
        }
      }
      
      if (lotsFailed.length > 0) {
        toast.error(`Failed to create ${lotsFailed.length} lot(s)`);
      }
      
      // Reset the form
      setNewLotNumber('');
      setLotNumberError('');
      setNumberOfLots('1');
      
      // Final refresh
      await fetchLots();
      
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
          <div 
            onClick={() => setSelectedFilter('All')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${selectedFilter === 'All' ? 'ring-2 ring-blue-500' : ''}`}
          >
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

          <div 
            onClick={() => setSelectedFilter('Occupied')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${selectedFilter === 'Occupied' ? 'ring-2 ring-green-500' : ''}`}
          >
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

          <div 
            onClick={() => setSelectedFilter('Vacant')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-400 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${selectedFilter === 'Vacant' ? 'ring-2 ring-gray-500' : ''}`}
          >
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

          <div 
            onClick={() => setSelectedFilter('For Sale')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${selectedFilter === 'For Sale' ? 'ring-2 ring-yellow-500' : ''}`}
          >
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
          
          <div 
            onClick={() => setSelectedFilter('Reserved')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${selectedFilter === 'Reserved' ? 'ring-2 ring-purple-500' : ''}`}
          >
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
            <div className="relative flex-1 min-w-[250px]">
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
                  // Reset form
                  setNewBlockNumber('');
                  setNewBlockMax('');
                  
                  // Reset add lot form
                  setNewLotNumber('');
                  setLotNumberError('');
                  setAutoLotNumber(true);
                  setNumberOfLots('1');
                  
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
                      Block {blockNumber} {(() => {
                        const block = getBlockByNumber(blockNumber);
                        return block ? `— max ${block.maxLots} lots` : '';
                      })()}
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

                    {/* Show homeowner assignment only for Vacant lots */}
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
                          <option value="">Leave unassigned</option>
                          {users
                            .filter(user => user.role === 'Homeowner')
                            .sort((a, b) => (b.totalLots || 0) - (a.totalLots || 0)) // Sort by lot count descending
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.username} ({user.totalLots || 0} lot{user.totalLots !== 1 ? 's' : ''})
                                {user.firstName || user.lastName ? ` - ${user.firstName} ${user.lastName}`.trim() : ''}
                              </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                          Shows current lot count for each homeowner. Homeowners can own multiple lots.
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
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isSubmitting
                          ? 'bg-blue-300 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⟳</span>
                          Processing...
                        </>
                      ) : selectedUserId ? (
                        'Assign Lot to Homeowner'
                      ) : (
                        `Update Status to ${selectedLot.status}`
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
              className="bg-white rounded-lg shadow-2xl w-full mx-2 sm:mx-auto max-w-4xl flex flex-col"
              style={{ maxHeight: '90vh' }}
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
                    <FaTag className="text-base text-black" />
                    <span className="font-semibold text-black">Block Management</span>
                  </button>
                </div>
              </div>
              
              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
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
                        {blocks.map(block => {
                          const currentLots = lots.filter(lot => lot.block === block.blockNumber).length;
                          return (
                            <option key={block.id} value={block.blockNumber}>
                              Block {block.blockNumber} ({currentLots}/{block.maxLots} lots)
                            </option>
                          );
                        })}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        Shows current lots / maximum lots for each block.
                      </p>
                    </div>
                    
                    {/* Number of Lots Field */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center">
                          <svg className="h-4 w-4 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          Number of Lots to Add
                        </span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const current = parseInt(numberOfLots) || 1;
                            if (current > 1) setNumberOfLots((current - 1).toString());
                          }}
                          disabled={parseInt(numberOfLots) <= 1}
                          className={`px-4 py-2 text-sm font-bold rounded-lg ${
                            parseInt(numberOfLots) <= 1 
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={numberOfLots}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            if (val >= 1 && val <= 50) {
                              setNumberOfLots(e.target.value);
                            }
                          }}
                          min="1"
                          max="50"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm shadow-sm"
                        />
                        <button
                          onClick={() => {
                            const current = parseInt(numberOfLots) || 1;
                            if (current < 50) setNumberOfLots((current + 1).toString());
                          }}
                          disabled={parseInt(numberOfLots) >= 50}
                          className={`px-4 py-2 text-sm font-bold rounded-lg ${
                            parseInt(numberOfLots) >= 50 
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Add multiple lots sequentially (1-50). Lots will be created starting from the next available number.
                      </p>
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
                            These settings affect how the subdivision map is generated. All changes save immediately.
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
                        {blocks.map(block => {
                          const existingCount = lots.filter(l => l.block === block.blockNumber).length;
                          const minAllowed = Math.max(1, existingCount);
                          const canDelete = existingCount === 0;
                          
                          return (
                            <div key={block.id} className="bg-white border border-gray-300 rounded-lg p-3 hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="bg-indigo-100 p-1.5 rounded">
                                    <FaHome className="text-indigo-600 text-sm" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-800 text-sm">Block {block.blockNumber}</span>
                                    <p className="text-xs text-gray-500">{existingCount}/{block.maxLots} lot(s)</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Max:</label>
                                <div className="flex items-center border border-gray-300 rounded overflow-hidden flex-1">
                                  <button
                                    onClick={() => {
                                      if (block.maxLots > minAllowed) {
                                        updateBlockMaxLots(block.id, block.maxLots - 1);
                                      }
                                    }}
                                    disabled={block.maxLots <= minAllowed}
                                    className={`px-3 py-2 flex-shrink-0 text-sm font-bold ${block.maxLots <= minAllowed ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-gray-800 bg-gray-100 hover:bg-gray-200'}`}
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    value={block.maxLots}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value || '0') || 0;
                                      const clamped = val < minAllowed ? minAllowed : val;
                                      if (clamped !== block.maxLots) {
                                        updateBlockMaxLots(block.id, clamped);
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-center text-sm font-semibold border-0 focus:ring-0"
                                    min={minAllowed}
                                  />
                                  <button
                                    onClick={() => updateBlockMaxLots(block.id, block.maxLots + 1)}
                                    className="px-3 py-2 flex-shrink-0 text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {block.maxLots < existingCount && (
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
                                onClick={() => canDelete && handleDeleteBlock(block.id, block.blockNumber)}
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
                              className={`px-3 py-2 flex-shrink-0 text-sm font-bold ${((parseInt(newBlockMax || '0') || 0) <= 1) ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-gray-800 bg-gray-100 hover:bg-gray-200'}`}
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
                              className="px-3 py-2 flex-shrink-0 text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200"
                              aria-label="Increase new block max"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={handleAddNewBlock}
                            disabled={isAddingBlock}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-medium shadow-md transition-all duration-200 flex items-center justify-center ${
                              isAddingBlock
                                ? 'bg-green-300 cursor-not-allowed text-gray-500'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isAddingBlock ? (
                              <>
                                <span className="inline-block animate-spin mr-1.5">⟳</span>
                                Adding...
                              </>
                            ) : (
                              <>
                                <FaUserPlus className="mr-1.5 text-sm" />
                                Add Block
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
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
                {activeTab === 'addLot' && (
                  <button
                    onClick={handleAddNewLot}
                    disabled={isAddingLot}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 flex items-center ${
                      isAddingLot
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-md'
                    }`}
                  >
                    {isAddingLot ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        Creating {parseInt(numberOfLots) > 1 ? `${numberOfLots} Lots` : 'Lot'}...
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="mr-2" />
                        {parseInt(numberOfLots) > 1 ? `Create ${numberOfLots} Lots` : 'Create New Lot'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Block Confirmation Modal */}
        {showDeleteBlockConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
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
