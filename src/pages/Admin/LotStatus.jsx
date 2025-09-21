import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/AdminLayout';
import { FaHome, FaSearch } from 'react-icons/fa';

const LotMonitoring = () => {
  // State
  const [lots, setLots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Valid statuses for lots
  const validStatuses = [
    'All',
    'Vacant',
    'Occupied',
    'For Sale',
  ];

  // Set page title and fetch lots from Firebase
  useEffect(() => {
    document.title = "Lot Monitoring";
    const fetchUserLots = async () => {
      try {
        setIsLoading(true);
        const usersQuery = query(collection(db, 'users'));
        const querySnapshot = await getDocs(usersQuery);
        
        const lotsData = querySnapshot.docs
          .filter(doc => doc.data().house_no) // Only get users with house numbers
          .map(doc => ({
            id: doc.id,
            house_no: doc.data().house_no,
            house_owner: doc.data().username || 'Unknown',
            houseModel: doc.data().houseModel || 'Standard' // Changed from house_model to houseModel
          }));
        
        setLots(lotsData);
      } catch (error) {
        console.error('Error fetching user lots:', error);
        toast.error('Failed to fetch lot data: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserLots();
  }, []);

  // Filter lots based on selected status
  const filteredLots = selectedFilter === 'All' 
    ? lots 
    : lots.filter(lot => lot.status === selectedFilter);

  // Add search functionality
  const searchedAndFilteredLots = filteredLots.filter(lot => 
    lot.house_no?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
    lot.house_owner?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: lots.length,
    vacant: lots.filter(lot => lot.status === 'Vacant').length,
    occupied: lots.filter(lot => lot.status === 'Occupied').length,
    forSale: lots.filter(lot => lot.status === 'For Sale').length
  };

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Lot Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-300">Monitor and manage residential lots</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaHome className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Total Lots</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <FaHome className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Vacant</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.vacant}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaHome className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Occupied</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.occupied}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaHome className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">For Sale</h2>
                <p className="text-2xl font-semibold text-gray-900">{stats.forSale}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by lot number or owner..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
            <div className="flex-shrink-0">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                {validStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lots Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lot/House Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      House Model
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchedAndFilteredLots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                            <FaHome className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              Lot {lot.house_no || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {lot.houseModel || 'Standard'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lot.house_owner || 'None'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default LotMonitoring;