import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Plus, MoreVertical, Trash2, Edit, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Check, AlertCircle, User, Download, EyeIcon, ArrowUpDown } from 'lucide-react';
import api from '../api/AxiosInstance';

// Toast notification component
const Toast = ({ message, onClose, type = 'success' }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-white text-gray-800 px-4 py-3 rounded-md shadow-lg flex items-center z-50 animate-fade-in border-l-4 border-blue-500">
      {type === 'success' ? (
        <Check className="w-5 h-5 mr-2 text-green-500" />
      ) : (
        <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
      )}
      <span className="font-medium">{message}</span>
    </div>
  );
};

// Status Badge component
// const StatusBadge = ({ status }) => {
  // const statusStyles = {
    // active: 'bg-green-50 text-green-700 border-green-100',
    // inactive: 'bg-gray-50 text-gray-600 border-gray-200',
    // pending: 'bg-yellow-50 text-yellow-700 border-yellow-100'
  // };
  // 
  // const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
// 
  // return (
    // <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusStyles[status] || 'bg-gray-50 text-gray-600'}`}>
      {/* {formattedStatus} */}
    {/* </span> */}
  // );
// };

const RoleBadge = ({ role }) => {
  const roleStyles = {
    admin: 'bg-purple-50 text-purple-700 border-purple-100',
    // editor: 'bg-blue-50 text-blue-700 border-blue-100',
    user: 'bg-gray-50 text-gray-600 border-gray-200'
  };
  
  const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${roleStyles[role] || 'bg-gray-50 text-gray-600'}`}>
      {formattedRole}
    </span>
  );
};

// User details sidebar component
const UserDetailsSidebar = ({ user, onClose, onDelete, onEdit }) => {
  if (!user) return (
    <div className="bg-white p-6 rounded-lg border border-gray-100 h-full flex flex-col items-center justify-center text-center">
      <User className="h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-800 mb-2">No user selected</h3>
      <p className="text-sm text-gray-500">Select a user to view their details</p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-800">User Details</h3>
        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <h4 className="text-xl font-medium text-center mb-2">{user.username}</h4>
      <div className="flex justify-center gap-2 mb-6">
        {/* <StatusBadge status={user.status} /> */}
        <RoleBadge role={user.role} />
      </div>
      
      <div className="space-y-4 mb-8">
        {[
          { label: "User ID", value: user._id },
          // { label: "Date of Birth", value: user.dob },
          { label: "Registered Date", value: new Date(user.createdAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })},
          { label: "Last Updated Date", value: new Date(user.updatedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })},
          { label: "Phone Number", value: user.phone },
          { label: "Email", value: user.email }
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">{item.label}</span>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      
      <div className="space-y-3">
        {/* <button  */}
          {/* // className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors" */}
          {/* // onClick={() => {}} */}
        {/* > */}
          {/* <Download className="h-4 w-4 mr-2" /> */}
          {/* Export Profile */}
        {/* </button> */}
        <button 
          className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
          onClick={() => onDelete(user._id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete User
        </button>
      </div>
    </div>
  );
};

// User card component
const UserCard = ({ user, isSelected, onSelect, onView, onDelete }) => {
  return (
    <div 
      className={`bg-white rounded-lg border transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-100'}`}
    >
      <div className="p-5">
        {/* Header with checkbox and status */}
        <div className="flex justify-between items-start mb-4">
          <div 
            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(user._id);
            }}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          
          {/* <StatusBadge status={user.status} /> */}
        </div>
        
        {/* User info */}
        <div className="flex flex-col items-center text-center mb-4">
          <h3 className="text-lg font-medium text-gray-800 mt-3 mb-1">{user.username}</h3>
          <p className="text-sm text-gray-500">{user.email}</p>
          <div className="mt-2">
            <RoleBadge role={user.role} />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-center space-x-1">
          <button 
            className="flex-1 py-2 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center"
            onClick={() => onView(user)}
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </button>
          <button 
            className="flex-1 py-2 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center"
            onClick={() => {}}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </button>
          <button 
            className="flex-1 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
            onClick={(e) => { 
              e.stopPropagation();
              onDelete(user._id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Empty state component
const EmptyState = ({ searchTerm }) => (
  <div className="py-12 flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
      <Search className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-800 mb-2">No users found</h3>
    <p className="text-sm text-gray-500 max-w-md">
      {searchTerm ? 
        `We couldn't find any results for "${searchTerm}"` : 
        'Try adjusting your filters or add new users to get started'}
    </p>
  </div>
);

const UserManagement = () => {
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [toastMessage, setToastMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filterConfig, setFilterConfig] = useState({ status: 'all', role: 'all' });
  
  
  const fileInputRef = useRef(null);
  const usersPerPage = 5;
  
  // Sort function
  const sortedUsers = [...users].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
  
  // Filter users based on search term and filters
  const filteredUsers = sortedUsers.filter(user => {
    // Search filter
    const matchesSearch = Object.values(user).some(value => 
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Status filter
    // const matchesStatus = filterConfig.status === 'all' || 
                        //  user.status === filterConfig.status;
    
    // Role filter
    const matchesRole = filterConfig.role === 'all' || 
                        user.role === filterConfig.role;
    
    // return matchesSearch && matchesStatus && matchesRole;
    return matchesSearch && matchesRole;
  });
  
  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Handle sort
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Handle checkbox selection
  const handleSelectUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };
  
  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map(user => user._id));
    }
  };
  
  // Handle user deletion
  // const handleDeleteUser = (id) => {
    // setUsers(users.filter(user => user._id !== id));
    // setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    // setSelectedUser(null);
    // showToast(`User deleted successfully`);
  // };\
  const handleDeleteUser = async (username) => {
  try {
    const response = await api.post('/auth/admin-delete-user', {
      usernameToDelete: username,
    });

    if (response.data.delete) {
      // Remove user from local state
      setUsers(users.filter(user => user.username !== username));
      setSelectedUsers(selectedUsers.filter(u => u !== username));
      setSelectedUser(null);
      showToast(`User deleted successfully`);
    } else {
      showToast(response.data.message || "Failed to delete user");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    showToast("An error occurred while deleting the user");
  }
};


  
  
  // Handle bulk deletion
  const handleBulkDelete = () => {
    setUsers(users.filter(user => !selectedUsers.includes(user._id)));
    showToast(`${selectedUsers.length} user(s) deleted successfully`);
    setSelectedUsers([]);
  };

  // Handle user view
  const viewUserDetails = (user) => {
    setSelectedUser(user);
  };
  
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
  };

  // Import users from CSV
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    // In a real app, you would parse the CSV here
    showToast(`Users imported successfully`);
    e.target.value = null;
  };

  // Drag and drop operations
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    // In a real app, you would parse the CSV here
    showToast(`Users imported successfully`);
  };

  // Fetch all users information
   useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/auth/users');

        if (response.data.fetch && response.data.users) {
          setUsers(response.data.users);
        } else {
          setError('Failed to fetch users.');
        }
      } catch (err) {
        setError('Internal error occurred.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    phone: '',
    email: '',
    password: ''
  });


  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };


  const handleCancel = () => {
    setShowAddModal(false);
    setNewUser({
      username: '',
      phone: '',
      email: '',
      password: ''
    });
  };

  const isFormValid =
  /^[a-zA-Z0-9_]{3,20}$/.test(newUser.username) &&
  /^\d{10,15}$/.test(newUser.phone) &&
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newUser.email) &&
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(newUser.password);

  // const handleAddUser = () => {
    // console.log('User to be added:', newUser);
    // setShowAddModal(false);
    // Backend API integration goes here later
  // };

  const handleAddUser = async () => {
    try {
      const response = await api.post('/auth/register', newUser);

      console.log('User successfully added:', response.data);

      // Reset form and close modal
      setShowAddModal(false);
      setNewUser({
        username: '',
        phone: '',
        email: '',
        password: ''
      });

      alert('User registered successfully!');
    } catch (error) {
      console.error('Registration error:', error);

      if (error.response) {
        alert(`Error: ${error.response.data.message || 'Registration failed.'}`);
      } else {
        alert('Network error: Could not reach server.');
      }
    }
  };

  return (
    <div 
      className="bg-[#FFFCF6] min-h-screen p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-10 z-50 flex items-center justify-center border-2 border-dashed border-blue-400">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <Download className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">Drop CSV file here</h3>
            <p className="text-sm text-gray-500">Upload a CSV file to import users</p>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast 
          message={toastMessage.message} 
          type={toastMessage.type} 
          onClose={() => setToastMessage(null)} 
        />
      )}
      
      <div className="min-h-screen mx-auto px-6 lg:px-12 py-6">
        {/* Page Header */}
        <div className="user-header-sect mb-6">
          <h1 className="text-3xl font-light text-[#3A4454] mb-6">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your users, assign roles, and update status</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              {/* Toolbar */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Search */}
                  <div className="relative min-w-[280px] flex-grow max-w-md">
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    {searchTerm && (
                      <button 
                        className="absolute right-3 top-2.5"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-5 w-5 text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* View toggle */}
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                      <button 
                        className={`p-2 ${viewMode === 'table' ? 'bg-gray-100 text-blue-600' : 'bg-white text-gray-500'}`}
                        onClick={() => setViewMode('table')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="8" y1="18" x2="21" y2="18"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                      </button>
                      <button 
                        className={`p-2 ${viewMode === 'card' ? 'bg-gray-100 text-blue-600' : 'bg-white text-gray-500'}`}
                        onClick={() => setViewMode('card')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                      </button>
                    </div>
                    
                    {/* Filter Button */}
                    <div className="relative">
                      <button 
                        className="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                      >
                        <Filter className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">Filter</span>
                        {(filterConfig.status !== 'all' || filterConfig.role !== 'all') && (
                          <span className="ml-1 bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {(filterConfig.status !== 'all' ? 1 : 0) + (filterConfig.role !== 'all' ? 1 : 0)}
                          </span>
                        )}
                      </button>
                      
                      {/* Filter Menu Dropdown */}
                      {showFilterMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <div className="p-3 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium text-gray-800">Filter Options</h3>
                              <button 
                                className="text-sm text-blue-600 hover:text-blue-800"
                                onClick={() => setFilterConfig({ role: 'all' })}
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            {/* <div className="mb-3"> */}
                              {/* <label className="block text-sm font-medium text-gray-700 mb-1">Status</label> */}
                              {/* <select  */}
                                {/* // className="w-full p-2 border border-gray-200 rounded-md" */}
                                {/* // value={filterConfig.status} */}
                                {/* // onChange={(e) => setFilterConfig({...filterConfig, status: e.target.value})} */}
                              {/* // > */}
                                {/* <option value="all">All</option> */}
                                {/* <option value="active">Active</option> */}
                                {/* <option value="inactive">Inactive</option> */}
                                {/* <option value="pending">Pending</option> */}
                              {/* </select> */}
                            {/* </div> */}
                            
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                              <select 
                                className="w-full p-2 border border-gray-200 rounded-md"
                                value={filterConfig.role}
                                onChange={(e) => setFilterConfig({...filterConfig, role: e.target.value})}
                              >
                                <option value="all">All</option>
                                <option value="admin">Admin</option>
                                {/* <option value="editor">Editor</option> */}
                                <option value="user">User</option>
                              </select>
                            </div>
                            
                            <div className="flex justify-end mt-4">
                              <button 
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                onClick={() => setShowFilterMenu(false)}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Add User Button */}
                    {/* <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"> */}
                      {/* <Plus className="h-4 w-4 mr-2" /> */}
                      {/* <span>Add User</span> */}
                    {/* </button> */}

                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => setShowAddModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Add User</span>
                    </button>

                  </div>
                </div>
              </div>
              
               {/* Add User Modal */}
               {showAddModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                   <div className="bg-white rounded-lg p-8 w-[400px] shadow-2xl space-y-4 font-poppins">
                     <h2 className="text-xl font-semibold mb-2 text-center">Add New User</h2>
               
                     {/* Username */}
                     <div className="space-y-1">
                       <label className="block text-sm font-medium">Username</label>
                       <input
                         type="text"
                         name="username"
                         value={newUser.username}
                         onChange={handleInputChange}
                         className="w-full p-2 border rounded-md"
                       />
                       {!/^[a-zA-Z0-9_]{3,20}$/.test(newUser.username) && newUser.username && (
                         <p className="text-xs text-red-500">Username must be 3-20 characters (alphanumeric or _)</p>
                       )}
                     </div>
                     
                     {/* Phone */}
                     <div className="space-y-1">
                       <label className="block text-sm font-medium">Phone</label>
                       <input
                         type="tel"
                         name="phone"
                         value={newUser.phone}
                         onChange={handleInputChange}
                         className="w-full p-2 border rounded-md"
                       />
                       {!/^\d{10,15}$/.test(newUser.phone) && newUser.phone && (
                         <p className="text-xs text-red-500">Phone number must be 10–15 digits</p>
                       )}
                     </div>
                     
                     {/* Email */}
                     <div className="space-y-1">
                       <label className="block text-sm font-medium">Email</label>
                       <input
                         type="email"
                         name="email"
                         value={newUser.email}
                         onChange={handleInputChange}
                         className="w-full p-2 border rounded-md"
                       />
                       {!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newUser.email) && newUser.email && (
                         <p className="text-xs text-red-500">Invalid email format</p>
                       )}
                     </div>
                     
                     {/* Password */}
                     <div className="space-y-1">
                       <label className="block text-sm font-medium">Password</label>
                       <input
                         type="password"
                         name="password"
                         value={newUser.password}
                         onChange={handleInputChange}
                         className="w-full p-2 border rounded-md"
                       />
                       {!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(newUser.password) && newUser.password && (
                         <p className="text-xs text-red-500">Password must be at least 8 characters, include uppercase, lowercase, number, and special character.</p>
                       )}
                     </div>
                     
                     {/* Action Buttons */}
                     <div className="flex justify-between pt-4">
                       <button
                         onClick={handleCancel}
                         className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 hover:scale-105 transition-transform"
                       >
                         Cancel
                       </button>
                       <button
                         onClick={handleAddUser}
                         disabled={!isFormValid}
                         className={`px-4 py-2 rounded-md text-white ${
                           isFormValid
                             ? 'bg-green-600 hover:bg-green-700 hover:scale-105'
                             : 'bg-gray-400 cursor-not-allowed'
                         }`}
                       >
                         Add User
                       </button>
                     </div>
                   </div>
                 </div>
               )}
              
              {/* Bulk Actions */}
              {selectedUsers.length > 0 && (
                <div className="px-5 py-3 bg-blue-50 border-y border-blue-100 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-blue-700">
                      {selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'} selected
                    </span>
                    <button 
                      className="ml-4 text-sm text-blue-600 hover:text-blue-800 underline"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear selection
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-md hover:bg-blue-100 text-blue-700 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Card View */}
              {viewMode === 'card' && (
                <div className="p-5">
                  {currentUsers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentUsers.map((user) => (
                        <UserCard
                          key={user._id}
                          user={user}
                          isSelected={selectedUsers.includes(user._id)}
                          onSelect={handleSelectUser}
                          onView={viewUserDetails}
                          onDelete={handleDeleteUser}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState searchTerm={searchTerm} />
                  )}
                  </div>
                )}
                
                {/* Table View */}
                {viewMode === 'table' && (
                  <div className="overflow-x-auto">
                    {currentUsers.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-12 px-4 py-3">
                              <div 
                                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${selectedUsers.length === currentUsers.length && currentUsers.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                                onClick={handleSelectAll}
                              >
                                {selectedUsers.length === currentUsers.length && currentUsers.length > 0 && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => requestSort('id')}
                            >
                              <div className="flex items-center">
                                <span>User ID</span>
                                <ArrowUpDown className="ml-1 h-4 w-4" />
                              </div>
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => requestSort('name')}
                            >
                              <div className="flex items-center">
                                <span>Username</span>
                                <ArrowUpDown className="ml-1 h-4 w-4" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th 
                              className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                              onClick={() => requestSort('role')}
                            >
                              <div className="flex items-center">
                                <span>Role</span>
                                <ArrowUpDown className="ml-1 h-4 w-4" />
                              </div>
                            </th>
                            {/* <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" */}
                              {/* // onClick={() => requestSort('status')}> */}
                              {/* <div className="flex items-center"> */}
                                {/* <span>Status</span> */}
                                {/* <ArrowUpDown className="ml-1 h-4 w-4" /> */}
                              {/* </div> */}
                            {/* </th> */}
                            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentUsers.map((user) => (
                            <tr 
                              key={user._id} 
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-4">
                                <div 
                                  className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${selectedUsers.includes(user._id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                                  onClick={() => handleSelectUser(user._id)}
                                >
                                  {selectedUsers.includes(user._id) && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {user._id}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="ml-3 text-sm font-medium text-gray-900">{user.username}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {user.email}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <RoleBadge role={user.role} />
                              </td>
                              {/* <td className="px-4 py-4 whitespace-nowrap"> */}
                                {/* <StatusBadge status={user.status} /> */}
                              {/* </td> */}
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                <div className="flex justify-end space-x-2">
                                  <button 
                                    className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
                                    onClick={() => viewUserDetails(user)}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button 
                                    className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button 
                                    className="p-1 rounded-md hover:bg-red-50 text-red-600"
                                    onClick={() => handleDeleteUser(user.username)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyState searchTerm={searchTerm} />
                    )}
                  </div>
                )}
                
                {/* Pagination */}
                {filteredUsers.length > 0 && (
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to <span className="font-medium">
                        {Math.min(indexOfLastUser, filteredUsers.length)}
                      </span> of <span className="font-medium">{filteredUsers.length}</span> results
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        className={`w-9 h-9 rounded-md flex items-center justify-center ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Logic to show pagination numbers around current page
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <button 
                            key={pageNumber}
                            className={`w-9 h-9 rounded-md flex items-center justify-center ${currentPage === pageNumber ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button 
                        className={`w-9 h-9 rounded-md flex items-center justify-center ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <UserDetailsSidebar 
                user={selectedUser} 
                onClose={() => setSelectedUser(null)}
                onDelete={handleDeleteUser}
                onEdit={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

export default UserManagement;