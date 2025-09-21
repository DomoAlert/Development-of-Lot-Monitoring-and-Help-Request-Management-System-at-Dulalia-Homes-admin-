import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  ExclamationCircleIcon, 
  TrendingUpIcon as ArrowTrendingUpIcon, 
  TrendingDownIcon as ArrowTrendingDownIcon 
} from '@heroicons/react/outline';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-toastify';

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    reorderPoint: '',
    status: 'In Stock'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0
  });

  useEffect(() => {
    document.title = "Inventory Management";
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate()?.toLocaleDateString() || new Date().toLocaleDateString()
      }));

      // Calculate stats
      const stats = {
        totalItems: inventoryData.length,
        lowStock: inventoryData.filter(item => item.quantity <= item.reorderPoint).length,
        outOfStock: inventoryData.filter(item => item.quantity === 0).length
      };

      setStats(stats);
      setItems(inventoryData);
    } catch (error) {
      toast.error('Error fetching inventory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        reorderPoint: parseInt(formData.reorderPoint),
        lastUpdated: new Date()
      };
      await addDoc(collection(db, 'inventory'), itemData);
      toast.success('Item added successfully');
      setShowForm(false);
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: '',
        reorderPoint: '',
        status: 'In Stock'
      });
      fetchInventory();
    } catch (error) {
      toast.error('Error adding item: ' + error.message);
    }
  };

  const handleUpdateStock = async (id, currentQuantity, reorderPoint) => {
    const newQuantity = window.prompt('Enter new quantity:');
    if (newQuantity === null) return;

    const quantity = parseInt(newQuantity);
    if (isNaN(quantity)) {
      toast.error('Please enter a valid number');
      return;
    }

    try {
      const status = quantity === 0 ? 'Out of Stock' : 
                     quantity <= reorderPoint ? 'Low Stock' : 
                     'In Stock';
      
      await updateDoc(doc(db, 'inventory', id), {
        quantity,
        status,
        lastUpdated: new Date()
      });
      toast.success('Stock updated successfully');
      fetchInventory();
    } catch (error) {
      toast.error('Error updating stock: ' + error.message);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
        toast.success('Item deleted successfully');
        fetchInventory();
      } catch (error) {
        toast.error('Error deleting item: ' + error.message);
      }
    }
  };

  const getStatusColor = (status, quantity, reorderPoint) => {
    if (quantity === 0) {
      return 'bg-red-100 text-red-800';
    }
    if (quantity <= reorderPoint) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'in stock':
        return 'bg-green-100 text-green-800';
      case 'low stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out of stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="pt-20 px-6">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New Item
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total Items</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
              <div className="text-primary">
                <ArrowTrendingUpIcon className="h-8 w-8" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-bold">{stats.lowStock}</p>
              </div>
              <div className="text-yellow-500">
                <ExclamationCircleIcon className="h-8 w-8" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold">{stats.outOfStock}</p>
              </div>
              <div className="text-red-500">
                <ArrowTrendingDownIcon className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Item Form */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add New Item</h2>
                <button 
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select category</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., boxes, pieces"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData({...formData, reorderPoint: e.target.value})}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Minimum quantity before reorder"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Categories</option>
            <option value="Medicine">Medicine</option>
            <option value="Supplies">Supplies</option>
            <option value="Equipment">Equipment</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">Last updated: {item.lastUpdated}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                      <div className="text-xs text-gray-500">Reorder at: {item.reorderPoint}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status, item.quantity, item.reorderPoint)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => handleUpdateStock(item.id, item.quantity, item.reorderPoint)}
                        className="text-primary hover:text-blue-700 mr-3"
                      >
                        Update Stock
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default Inventory;