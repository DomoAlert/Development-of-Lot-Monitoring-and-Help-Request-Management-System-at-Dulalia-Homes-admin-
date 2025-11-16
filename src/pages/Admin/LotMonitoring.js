import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, doc, updateDoc, getDoc, setDoc, serverTimestamp, addDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { FaHome, FaSearch, FaUserEdit, FaUserPlus, FaTimes, FaUser, FaTag, FaClock, FaBed, FaBath, FaRulerCombined, FaExpand } from 'react-icons/fa';
import { color } from 'framer-motion';

// Dulalia Homes Viente Reales Executive Series - Official House Models (November 2025)
// All images served remotely - no local imports required
// House Models Configuration - fetched from Firebase
const LotMonitoring = () => {
  // State
  const [lots, setLots] = useState([]);
  const [users, setUsers] = useState([]);
  const [houseModels, setHouseModels] = useState([]);
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

  // Assignment Modal State
  const [selectedHouseModelForAssignment, setSelectedHouseModelForAssignment] = useState('Standard');

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
  const [maxAddableLots, setMaxAddableLots] = useState(50); // Maximum lots that can be added to selected block
  const [selectedHouseModel, setSelectedHouseModel] = useState(''); // House model for new lots
  
  // House Model Details Modal State
  const [showHouseModelDetails, setShowHouseModelDetails] = useState(false);
  const [selectedHouseModelForDetails, setSelectedHouseModelForDetails] = useState(null);

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

  // Get house model images from remote URLs (Dulalia Homes Viente Reales Executive Series)
  const getHouseModelImages = (modelName) => {
    const images = {
      'Kate': {
        unit: 'https://dulaliahomes.com/wp-content/uploads/2024/11/KATE-UNIT.jpg',
        floorPlans: [
          'https://dulaliahomes.com/wp-content/uploads/2024/11/KATE-1ST-FLOOR.jpg',
          'https://dulaliahomes.com/wp-content/uploads/2024/11/KATE-2ND-FLOOR.jpg'
        ]
      },
      'Ivory': {
        unit: 'https://dulaliahomes.com/wp-content/uploads/2024/11/IVORY-UNIT.jpg',
        floorPlans: [
          'https://dulaliahomes.com/wp-content/uploads/2024/11/IVORY-1ST-FLOOR.jpg',
          'https://dulaliahomes.com/wp-content/uploads/2024/11/IVORY-2ND-FLOOR.jpg'
        ]
      },
      'Flora': {
        unit: 'https://dulaliahomes.com/wp-content/uploads/2024/11/FLORA-UNIT.jpg',
        floorPlans: [
          'https://dulaliahomes.com/wp-content/uploads/2024/11/FLORA-1ST-FLOOR.jpg',
          'https://dulaliahomes.com/wp-content/uploads/2024/11/FLORA-2ND-FLOOR.jpg'
        ]
      },
      'Edelweiss': {
        unit: 'https://dulaliahomes.com/wp-content/uploads/2024/11/EDELWEISS-UNIT.jpg',
        floorPlans: [
          'https://dulaliahomes.com/wp-content/uploads/2024/11/EDELWEISS-1ST-FLOOR.jpg',
          'https://dulaliahomes.com/wp-content/uploads/2024/11/EDELWEISS-2ND-FLOOR.jpg'
        ]
      },
      'Daffodil': {
        unit: 'https://dulaliahomes.com/wp-content/uploads/2024/11/DAFFODIL-UNIT.jpg',
        floorPlans: [
          'https://dulaliahomes.com/wp-content/uploads/2024/11/DAFFODIL-1ST-FLOOR.jpg',
          'https://dulaliahomes.com/wp-content/uploads/2024/11/DAFFODIL-2ND-FLOOR.jpg'
        ]
      },
      'Bellis': {
        unit: 'https://dulaliahomes.com/wp-content/uploads/2024/11/BELLIS-UNIT.jpg',
        floorPlans: [
          'https://dulaliahomes.com/wp-content/uploads/2024/11/BELLIS-END-UNIT-COLORED-FLOORPLAN-scaled.jpg'
        ]
      }
    };
    return images[modelName] || { unit: null, floorPlans: [] };
  };

  // Set page title and fetch data from Firebase
  useEffect(() => {
    document.title = "Lot Monitoring";
    fetchBlocks();
    fetchUsers();
    fetchHouseModels();
  }, []);

  // Fetch lots when blocks are loaded
  useEffect(() => {
    if (blocks.length > 0) {
      fetchLots();
    }
  }, [blocks]);

  // Set loading to false when both lots and house models are loaded
  useEffect(() => {
    if (lots.length >= 0 && houseModels.length >= 0) { // Allow empty arrays
      setIsLoading(false);
    }
  }, [lots, houseModels]);

  // Set default house model when house models are loaded
  useEffect(() => {
    if (houseModels.length > 0 && selectedHouseModel === '') {
      setSelectedHouseModel(houseModels[0].name);
    }
  }, [houseModels, selectedHouseModel]);

  // Disable body scroll when house model modal is open
  useEffect(() => {
    if (showHouseModelDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showHouseModelDetails]);

  // Fetch house models from Firebase collection - Viente Reales Executive Series
  const fetchHouseModels = async () => {
    try {
      const houseModelsQuery = query(collection(db, 'houseModels'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(houseModelsQuery);

      const houseModelsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If no house models exist, seed official Dulalia Homes Viente Reales Executive Series models
      if (houseModelsData.length === 0) {
        console.log('Seeding official Dulalia Homes Viente Reales Executive Series models...');
        const vienteRealesModels = [
          { 
            name: 'Kate', 
            lotArea: '128 sqm', 
            floorArea: '154 sqm', 
            bedrooms: 4, 
            bathrooms: 3, 
            notes: 'Premium 2-storey flagship model with modern elevation. Perfect for families seeking luxury and space in Viente Reales Executive Village.',
            subdivision: 'Viente Reales Executive Village',
            developer: 'Dulalia Homes'
          },
          { 
            name: 'Ivory', 
            lotArea: '100 sqm', 
            floorArea: '123 sqm', 
            bedrooms: 3, 
            bathrooms: 4, 
            notes: 'Spacious unit with terrace, carport, and flexible 4th room. Ideal for growing families who value comfort and versatility.',
            subdivision: 'Viente Reales Executive Village',
            developer: 'Dulalia Homes'
          },
          { 
            name: 'Flora', 
            lotArea: '125 sqm', 
            floorArea: '87 sqm', 
            bedrooms: 4, 
            bathrooms: 2, 
            notes: 'Compact yet spacious layout with efficient design. Perfect balance of functionality and comfort for modern living.',
            subdivision: 'Viente Reales Executive Village',
            developer: 'Dulalia Homes'
          },
          { 
            name: 'Edelweiss', 
            lotArea: '64 sqm', 
            floorArea: '64 sqm', 
            bedrooms: 3, 
            bathrooms: 2, 
            notes: 'Townhouse-style design ideal for young families. Maximizes space efficiency without compromising livability.',
            subdivision: 'Viente Reales Executive Village',
            developer: 'Dulalia Homes'
          },
          { 
            name: 'Daffodil', 
            lotArea: '75 sqm', 
            floorArea: '73 sqm', 
            bedrooms: 3, 
            bathrooms: 2, 
            notes: 'Budget-friendly full 2-storey design. Excellent entry-level home for first-time buyers in Viente Reales.',
            subdivision: 'Viente Reales Executive Village',
            developer: 'Dulalia Homes'
          },
          { 
            name: 'Bellis', 
            lotArea: '119 sqm', 
            floorArea: '56 sqm', 
            bedrooms: 2, 
            bathrooms: 1, 
            notes: 'End-unit design with 1-car garage. Cozy and practical for small families or couples starting their journey.',
            subdivision: 'Viente Reales Executive Village',
            developer: 'Dulalia Homes'
          }
        ];

        const addPromises = vienteRealesModels.map(model =>
          addDoc(collection(db, 'houseModels'), {
            ...model,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        );

        await Promise.all(addPromises);
        console.log('✓ Successfully seeded 6 official Viente Reales house models');
        setHouseModels(vienteRealesModels);
      } else {
        setHouseModels(houseModelsData);
      }
    } catch (error) {
      console.error('Error fetching house models:', error);
      toast.error('Failed to fetch house models: ' + error.message);
      // Fallback to Kate model if Firebase fails
      setHouseModels([
        { 
          name: 'Kate', 
          lotArea: '128 sqm', 
          floorArea: '154 sqm', 
          bedrooms: 4, 
          bathrooms: 3, 
          notes: 'Premium 2-storey model (fallback)',
          subdivision: 'Viente Reales Executive Village',
          developer: 'Dulalia Homes'
        }
      ]);
    }
  };

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
        .filter(doc => {
          const userData = doc.data();
          // Include users with role 'Homeowner' or no role field (legacy users)
          return userData.role === 'Homeowner' || !userData.role;
        })
        .map(async (doc) => {
          const userData = doc.data();

          // Fetch assigned lots for this user
          let assignedLots = [];
          let lotsSubcollection = [];
          try {
            const assignedLotsQuery = query(collection(db, 'users', doc.id, 'assignedLots'));
            const assignedLotsSnapshot = await getDocs(assignedLotsQuery);
            assignedLots = assignedLotsSnapshot.docs.map(lotDoc => ({
              id: lotDoc.id,
              ...lotDoc.data()
            }));
          } catch (error) {
            // If subcollection doesn't exist or error occurs, assignedLots remains empty array
            console.log(`No assigned lots found for user ${doc.id}:`, error.message);
            assignedLots = [];
          }

          try {
            const lotsQuery = query(collection(db, 'users', doc.id, 'lots'));
            const lotsSnapshot = await getDocs(lotsQuery);
            lotsSubcollection = lotsSnapshot.docs.map(lotDoc => ({
              id: lotDoc.id,
              ...lotDoc.data()
            }));
          } catch (error) {
            // If subcollection doesn't exist or error occurs, lotsSubcollection remains empty array
            console.log(`No lots found for user ${doc.id}:`, error.message);
            lotsSubcollection = [];
          }

          const totalLots = assignedLots.length + lotsSubcollection.length;

          return {
            id: doc.id,
            username: userData.username || 'Unknown',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            house_no: userData.house_no || null, // Keep for backward compatibility
            email: userData.email || '',
            role: userData.role || 'Homeowner', // Default to Homeowner if not set
            assignedLots: assignedLots,
            lots: lotsSubcollection,
            totalLots: totalLots
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
        lotNumber: selectedLot.lot,
        houseNumber: selectedLot.house_no,
        status: 'Vacant',
        ownerId: null,
        ownerName: null,
        houseModel: selectedLot.houseModel || 'Standard',
        createdAt: selectedLot.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: false });

      // Remove assignment from user's subcollection
      if (selectedLot.owner_id) {
        // Always use assignedLots subcollection for Occupied status
        const subcollectionName = 'assignedLots';

        const assignmentQuery = query(
          collection(db, 'users', selectedLot.owner_id, subcollectionName),
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

      // CASE 1: Updating lot status and house model
      if (!selectedUserId) {
        await setDoc(lotDocRef, {
          status: selectedLot.status,
          houseModel: selectedHouseModelForAssignment,
          updatedAt: serverTimestamp()
        }, { merge: true });

        toast.success(`Lot status updated to ${selectedLot.status}`);
      }
      // CASE 2: Assigning a homeowner to a vacant or assigned lot
      else if (selectedUserId) {
        // Get the selected user data
        const userDocRef = doc(db, 'users', selectedUserId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          toast.error('Selected user does not exist');
          return;
        }

        const userData = userSnap.data();

        // Determine which subcollection to use based on status
        const subcollectionName = 'assignedLots'; // Always use assignedLots for Occupied status

        // Check if this lot is already assigned to this user
        const existingAssignmentQuery = query(
          collection(db, 'users', selectedUserId, subcollectionName),
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
          houseModel: selectedHouseModelForAssignment,
          assignedAt: serverTimestamp(),
          status: 'Active'
        };

        await addDoc(collection(db, 'users', selectedUserId, subcollectionName), assignmentData);

        // Update the lot document
        await setDoc(lotDocRef, {
          lotNumber: selectedLot.lot,
          houseNumber: selectedLot.house_no,
          status: 'Occupied', // Always set to Occupied when assigning homeowner
          ownerId: selectedUserId,
          ownerName: `${userSnap.data().firstName || ''} ${userSnap.data().lastName || ''}`.trim() || userSnap.data().username || 'Unknown',
          houseModel: selectedHouseModelForAssignment,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: false }); // Use merge: false to replace the entire document

        toast.success(`Lot assigned to homeowner successfully using ${subcollectionName} subcollection`);
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
      
      if (numLots > maxAddableLots) {
        toast.error(`Cannot add more than ${maxAddableLots} lots at once`);
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

      // Check if selected house model is appropriate for the block
      const selectedModel = houseModels.find(m => m.name === selectedHouseModel);
      if (selectedModel && selectedModel.lotArea !== 'N/A') {
        // Extract approximate lot area (e.g., "~128 sqm" -> 128)
        const modelLotAreaMatch = selectedModel.lotArea.match(/~?(\d+(?:\.\d+)?)/);
        if (modelLotAreaMatch) {
          const modelLotArea = parseFloat(modelLotAreaMatch[1]);
          // For now, just show a warning if the model seems too large for the block
          // This is approximate since we don't have exact lot sizes per block
          if (modelLotArea > 100 && maxLotsForBlock > 20) { // Rough heuristic
            toast.warning(`House model "${selectedHouseModel}" has a large lot area (~${modelLotArea} sqm). Consider if this is appropriate for Block ${blockNum}.`);
          }
        }
      }

      
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
            houseModel: selectedHouseModel,
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
    
    // Calculate max addable lots for this block
    const selectedBlock = blocks.find(b => b.blockNumber.toString() === newBlock);
    if (selectedBlock) {
      const currentLots = lots.filter(lot => lot.block === selectedBlock.blockNumber).length;
      const remaining = selectedBlock.maxLots - currentLots;
      setMaxAddableLots(Math.max(0, remaining));
      
      // Clamp numberOfLots based on remaining capacity
      if (remaining === 0) {
        setNumberOfLots('0');
      } else {
        const currentNum = parseInt(numberOfLots) || 1;
        if (currentNum > remaining) {
          setNumberOfLots(Math.max(1, remaining).toString());
        }
      }
    } else {
      setMaxAddableLots(50); // Default when no block selected
    }
    
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
                  setSelectedHouseModel(houseModels.length > 0 ? houseModels[0].name : 'Standard');
                  
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
                            className="relative p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                          >
                          
                            {/* Status indicator */}
                            <div className={`absolute top-0 right-0 w-3 h-3 rounded-full ${statusColor} m-2`}></div>
                            
                            {/* Block/Lot label */}
                            <div className="mb-2">
                              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                B{lot.block} - L{lot.lot.toString().padStart(2, '0')}
                              </span>
                            </div>
                            
                            {/* House Number */}
                            <div className="flex items-center mb-2">
                              <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-100">
                                <FaHome className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="ml-2 flex-1">
                                <p className="text-sm font-medium">#{lot.house_no}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const model = houseModels.find(m => m.name === (lot.houseModel || 'Standard'));
                                    if (model) {
                                      setSelectedHouseModelForDetails(model);
                                      setShowHouseModelDetails(true);
                                    }
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer text-left"
                                  title="View house model details"
                                >
                                  {lot.houseModel || 'Standard'}
                                </button>
                              </div>
                            </div>
                            
                            {/* Owner Information */}
                            <div className="border-t pt-2">
                              <p className="text-xs text-gray-500">Owner</p>
                              <p className="text-sm font-medium truncate">
                                {lot.house_owner || 'None (Vacant)'}
                              </p>
                            </div>
                            
                            {/* Edit button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLot(lot);
                                setShowAssignModal(true);
                                setSelectedUserId('');
                                setSelectedHouseModelForAssignment(lot.houseModel || 'Standard');
                              }}
                              className="mt-2 w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Manage
                            </button>
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
                      ? 'Manage Lot' 
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
                    <p className="text-sm text-gray-600 mt-1">
                      House Model: {selectedLot.houseModel || 'Standard'}
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
                          // Clear selected user if status is not Vacant or Occupied since we'll only assign users to vacant or occupied lots
                          if (e.target.value !== 'Vacant' && e.target.value !== 'Occupied') {
                            setSelectedUserId('');
                          } else {
                            setSelectedUserId('');
                          }
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="Vacant">Vacant</option>
                        <option value="For Sale">For Sale</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Occupied">Occupied</option>
                      </select>
                    </div>

                    {/* Show homeowner assignment only for Vacant or Occupied lots */}
                    {(selectedLot.status === 'Vacant' || selectedLot.status === 'Occupied') && (
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
                            .filter(user => user.role === 'Homeowner' || !user.role)
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

                    {/* House Model Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        House Model
                      </label>
                      <select
                        value={selectedHouseModelForAssignment}
                        onChange={(e) => setSelectedHouseModelForAssignment(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        {houseModels.map(model => (
                          <option key={model.name} value={model.name}>
                            {model.name} - {model.bedrooms} bed, {model.bathrooms} bath ({model.floorArea} FA)
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500">
                        Select the house model for this lot. This will be updated in the database.
                      </p>
                    </div>
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
                          Marking as Vacant...
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
                      ) : (
                        'Update Status'
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
                    
                    {/* House Model and Number of Lots - Side by Side */}
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      {/* House Model Selection */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            <FaHome className="mr-2 text-green-600" />
                            House Model
                          </span>
                        </label>
                        {houseModels.length > 0 ? (
                          <select
                            value={selectedHouseModel}
                            onChange={(e) => setSelectedHouseModel(e.target.value)}
                            className="block w-full px-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm shadow-sm"
                          >
                            {houseModels.map(model => (
                              <option key={model.name} value={model.name}>
                                {model.name} - {model.bedrooms} bed, {model.bathrooms} bath ({model.floorArea} FA)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">
                            Loading house models...
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          Select the house model for the new lots. This will be stored in the database.
                        </p>
                      </div>

                      {/* Number of Lots Field */}
                      <div className="flex-1">
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
                              if (current > (maxAddableLots === 0 ? 0 : 1)) setNumberOfLots((current - 1).toString());
                            }}
                            disabled={parseInt(numberOfLots) <= (maxAddableLots === 0 ? 0 : 1)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg ${
                              parseInt(numberOfLots) <= (maxAddableLots === 0 ? 0 : 1) 
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
                              const val = parseInt(e.target.value) || (maxAddableLots === 0 ? 0 : 1);
                              const minVal = maxAddableLots === 0 ? 0 : 1;
                              if (val >= minVal && val <= maxAddableLots) {
                                setNumberOfLots(e.target.value);
                              } else if (val > maxAddableLots && maxAddableLots > 0) {
                                // Prevent setting values that exceed the limit
                                setNumberOfLots(maxAddableLots.toString());
                                toast.error(`Cannot add more than ${maxAddableLots} lots to this block`);
                              }
                            }}
                            min={maxAddableLots === 0 ? "0" : "1"}
                            max={maxAddableLots}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm shadow-sm"
                          />
                          <button
                            onClick={() => {
                              const current = parseInt(numberOfLots) || 1;
                              if (current < maxAddableLots) setNumberOfLots((current + 1).toString());
                            }}
                            disabled={parseInt(numberOfLots) >= maxAddableLots}
                            className={`px-4 py-2 text-sm font-bold rounded-lg ${
                              parseInt(numberOfLots) >= maxAddableLots 
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            +
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Add multiple lots sequentially (1-{maxAddableLots}). Lots will be created starting from the next available number.
                        </p>
                        {parseInt(numberOfLots) > maxAddableLots && maxAddableLots > 0 && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            ⚠️ Cannot add more than {maxAddableLots} lots to this block
                          </p>
                        )}
                      </div>
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
                    disabled={isAddingLot || houseModels.length === 0 || maxAddableLots === 0 || parseInt(numberOfLots) > maxAddableLots}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 flex items-center ${
                      isAddingLot || houseModels.length === 0 || maxAddableLots === 0 || parseInt(numberOfLots) > maxAddableLots
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-md'
                    }`}
                  >
                    {isAddingLot ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        Creating {parseInt(numberOfLots) > 1 ? `${numberOfLots} Lots` : 'Lot'}...
                      </>
                    ) : houseModels.length === 0 ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        Loading...
                      </>
                    ) : maxAddableLots === 0 ? (
                      <>
                        <FaTimes className="mr-2" />
                        Block Full
                      </>
                    ) : parseInt(numberOfLots) > maxAddableLots ? (
                      <>
                        <FaTimes className="mr-2" />
                        Exceeds Limit
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

        {/* House Model Details Modal */}
        {showHouseModelDetails && selectedHouseModelForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex items-center justify-center p-4 pt-20">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 144px)' }}>
              {/* Modal Header - Fixed */}
              <div className="px-6 py-4 border-b flex justify-between items-center bg-white rounded-t-xl flex-shrink-0">
                <h2 className="text-3xl font-bold text-gray-900">
                  {selectedHouseModelForDetails.name}
                </h2>
                <button
                  onClick={() => {
                    setShowHouseModelDetails(false);
                    setSelectedHouseModelForDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 256px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column - Unit Image and Description */}
                  <div className="space-y-6">
                    {/* Unit Image */}
                    {getHouseModelImages(selectedHouseModelForDetails.name).unit && (
                      <div className="relative rounded-xl overflow-hidden shadow-lg bg-gray-100">
                        <img 
                          src={getHouseModelImages(selectedHouseModelForDetails.name).unit}
                          alt={`${selectedHouseModelForDetails.name} Model`}
                          className="w-full h-64 md:h-80 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="320"%3E%3Crect fill="%23f3f4f6" width="400" height="320"/%3E%3Ctext fill="%236b7280" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E' + encodeURIComponent(selectedHouseModelForDetails.name) + ' Model%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                          <p className="text-white font-semibold text-lg">{selectedHouseModelForDetails.name} Model</p>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedHouseModelForDetails.notes || 'These units feature thoughtfully crafted designs to combine comfort and sophistication. With a range of modern and classic designs, these homes appeal to diverse preferences, while fostering a unified neighborhood vibe.'}
                      </p>
                    </div>

                    {/* Specifications - Icons Only Layout (Like Reference) */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Lot Area */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FaHome className="text-blue-600 text-xl" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{selectedHouseModelForDetails.lotArea?.replace('~', '').replace(' sqm', '') || 'N/A'} <span className="text-base font-normal">sqm</span></p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-12">Lot Area</p>
                      </div>

                      {/* Floor Area */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FaHome className="text-blue-600 text-xl" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{selectedHouseModelForDetails.floorArea?.replace('~', '').replace(' sqm', '') || 'N/A'} <span className="text-base font-normal">sqm</span></p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-12">Floor area</p>
                      </div>

                      {/* Bedrooms */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FaBed className="text-blue-600 text-xl" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{selectedHouseModelForDetails.bedrooms || 'N/A'}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-12">Bedrooms</p>
                      </div>

                      {/* Bathrooms */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FaBath className="text-blue-600 text-xl" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{selectedHouseModelForDetails.bathrooms || 'N/A'}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-12">Toilet and bath</p>
                      </div>
                    </div>

                    {/* Floor Plan Button */}
                    <button
                      onClick={() => {
                        const floorPlanSection = document.getElementById('floor-plans-section');
                        if (floorPlanSection) {
                          floorPlanSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="w-full md:w-auto px-8 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium transition-colors"
                    >
                      Floor Plan
                    </button>
                  </div>

                  {/* Right Column - Floor Plans */}
                  <div id="floor-plans-section" className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4">
                      <h3 className="text-xl font-bold text-white">
                        {getHouseModelImages(selectedHouseModelForDetails.name).floorPlans.length === 1 
                          ? 'Floor Plan (Complete)' 
                          : 'Floor Plan'}
                      </h3>
                      <p className="text-indigo-100 text-sm">Detailed layout and design specifications</p>
                    </div>

                    {getHouseModelImages(selectedHouseModelForDetails.name).floorPlans.length > 0 ? (
                      <div className="space-y-4">
                        {getHouseModelImages(selectedHouseModelForDetails.name).floorPlans.map((floorPlan, index) => {
                          const isBellis = selectedHouseModelForDetails.name === 'Bellis';
                          const isSinglePlan = getHouseModelImages(selectedHouseModelForDetails.name).floorPlans.length === 1;
                          
                          return (
                            <div key={index} className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                              {!isSinglePlan && (
                                <div className="bg-gray-100 px-4 py-2 border-b">
                                  <p className="text-sm font-semibold text-gray-700">
                                    {index === 0 ? '1st Floor Plan' : '2nd Floor Plan'}
                                  </p>
                                </div>
                              )}
                              {isBellis && isSinglePlan && (
                                <div className="bg-gray-100 px-4 py-2 border-b">
                                  <p className="text-sm font-semibold text-gray-700">
                                    Ground & Second Floor Plan
                                  </p>
                                </div>
                              )}
                              <div className="p-4 bg-white">
                                <img 
                                  src={floorPlan}
                                  alt={isBellis && isSinglePlan 
                                    ? `${selectedHouseModelForDetails.name} Complete Floor Plan` 
                                    : `${selectedHouseModelForDetails.name} Floor Plan ${index + 1}`}
                                  className="w-full h-auto rounded"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%236b7280" font-family="Arial" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <FaHome className="mx-auto text-gray-400 text-4xl mb-3" />
                        <p className="text-gray-500">No floor plans available for this model</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end rounded-b-xl">
                <button
                  onClick={() => {
                    setShowHouseModelDetails(false);
                    setSelectedHouseModelForDetails(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-md transition-all duration-200"
                >
                  Close
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
