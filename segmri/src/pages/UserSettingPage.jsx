import React, { useState, useEffect } from 'react';
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { FiEdit } from "react-icons/fi";
import { Tooltip } from 'react-tooltip';
import { TbPasswordMobilePhone } from "react-icons/tb";
import 'react-tooltip/dist/react-tooltip.css';
import api from '../api/AxiosInstance';
import { useNavigate } from 'react-router-dom';

const UserSettingPage = () => {
  // User Info States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gmail, setGmail] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Temp States for User Info Modal
  const [tempName, setTempName] = useState(name);
  const [tempPhone, setTempPhone] = useState(phone);
  const [tempGmail, setTempGmail] = useState(gmail);

  // Account Info States
  const [registeredDate, setRegisteredDate] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [originalPassword, setOriginalPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // User Information Modal - Validation Check (username,phone,email)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  const phoneRegex = /^\d{10,15}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const isUsernameValid = usernameRegex.test(tempName);
  const isPhoneValid = phoneRegex.test(tempPhone);
  const isEmailValid = emailRegex.test(tempGmail);
  const isUserFormValid = isUsernameValid && isPhoneValid && isEmailValid;

  // Account Information Modal - Validation Check (newPassword)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  const isPasswordValid = passwordRegex.test(newPassword);
  const showPasswordError = newPassword !== "" && !isPasswordValid;
  const isAccFormValid = isPasswordValid;

  const handleEditClick = () => {
    setTempName(name);
    setTempPhone(phone);
    setTempGmail(gmail);
    setShowModal(true);
  };

  // Show success notification
  const showNotification = (message) => {
    setNotificationMessage(message);
    setShowSuccessNotification(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 3000);
  };

  // save user infomation (update username/phone/email)
  const handleSave = async () => {
    try {
      const response = await api.post('auth/update', {
        username: tempName,
        phone: tempPhone,
        email: tempGmail
      });

      console.log('Update successful:', response.data);

      // Apply updates to UI states
      setName(tempName);
      setPhone(tempPhone);
      setGmail(tempGmail);
      setShowModal(false);
      
      // Show success notification
      showNotification('Your information has been updated successfully!');
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update user info. Please try again.');
    }
  };

  const handleAccountEditClick = () => {
    setOriginalPassword('');
    setNewPassword('');
    setShowAccountModal(true);
  };

  // save user infomation (update password)
  const handleAccountSave = async () => {
    try {
      const response = await api.post('/auth/update-password', {
        old_password: originalPassword,
        password: newPassword,
      });

      if (response.data.update) {
        // Show success notification
        showNotification('Password updated successfully!');
        setShowAccountModal(false);
      } else {
        alert(response.data.message || 'Failed to update password.');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  //State for eye icon (original password)
  const [show, setShow] = useState(false)
  const handleClick = () => {
    setShow(!show)
  }

  // State for eye icon (new password)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const handleNewPasswordClick = () => {
    setShowNewPassword(!showNewPassword)
  }

  // Delete Account Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigate = useNavigate();
  const handleDeleteAccount = async () => {
    try {
      const response = await api.post('/auth/delete');

      if (response.data.delete) {
        alert("Account deleted successfully.");
        navigate('/landing');
      } else {
        alert(response.data.message || "Failed to delete account.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("An error occurred while deleting your account.");
    }
  };

  // fetch user information
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('auth/fetch');
        console.log('User Info Response:', response.data);
        const { user } = response.data;
        const { username, phone, email, createdAt } = user;

        setName(username);
        setPhone(phone);
        setGmail(email);
        const formattedDate = new Date(createdAt).toISOString().split('T')[0];
        setRegisteredDate(formattedDate);

        // Optionally sync temp values for edit modal
        setTempName(name);
        setTempPhone(phone);
        setTempGmail(email);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F2E6] relative" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Gradient Header Bar */}
      <div className="h-32 bg-gradient-to-r from-[#9AA9D6] to-[#566C82] rounded-b-2xl shadow-md"></div>
      
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className="bg-white rounded-lg shadow-lg border-l-4 border-green-500 p-4 max-w-sm w-full flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Success!</p>
              <p className="mt-1 text-sm text-gray-600">{notificationMessage}</p>
            </div>
            <button 
              onClick={() => setShowSuccessNotification(false)}
              className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 -mt-16">
        {/* User Welcome Card */}
        <div className="bg-[#FFFCF6] rounded-xl shadow-md p-6 mb-6 text-left flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9AA9D6] to-[#566C82] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#3E435D]">Welcome, {name}!</h1>
            <p className="mt-1 text-[#676765]">Manage your account settings and preferences</p>
          </div>
        </div>


        <div className="grid md:grid-cols-2 gap-6">
          {/* User Info Card */}
          <div className="bg-[#FFFCF6] rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#3E435D]">Personal Information</h2>
              <button
                onClick={handleEditClick}
                className="flex items-center text-base text-[#3E435D] hover:text-[#566C82] transition-colors duration-300"
              >
                <FiEdit className="mr-1.5 h-4 w-4" />
                Edit
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#F8F2E6] flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#3E435D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#676765]">Username</p>
                  <p className="text-[#3E435D]">{name}</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#F8F2E6] flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#3E435D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#676765]">Phone Number</p>
                  <p className="text-[#3E435D]">{phone}</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#F8F2E6] flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#3E435D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#676765]">Email</p>
                  <p className="text-[#3E435D]">{gmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-[#FFFCF6] rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#3E435D]">Account Settings</h2>
              <button
                onClick={handleAccountEditClick}
                className="flex items-center text-base text-[#3E435D] hover:text-[#566C82] transition-colors duration-300"
              >
                <TbPasswordMobilePhone className="mr-1.5 h-4 w-4" />
                Change Password
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-[#F8F2E6] flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#3E435D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#676765]">Member Since</p>
                  <p className="text-[#3E435D]">{registeredDate}</p>
                </div>
              </div>
            </div>
            
            {/* Delete Account Button - Moved to inside the Account Info Card */}
            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full text-center py-2.5 text-sm rounded-md text-white bg-[#BF565B] hover:bg-[#A24449] transition-colors duration-300 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* User Info Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
              style={{ fontFamily: 'Poppins, sans-serif' }}>
              <h2 className="text-xl font-semibold mb-4 text-center text-[#3E435D]">Edit Personal Information</h2>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#3E435D] mb-1">Username</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9AA9D6] focus:border-transparent"
                />
                {!isUsernameValid && (
                  <p className="text-xs text-red-500 mt-1">Username must be 3-20 characters, alphanumeric or underscores only.</p>
                )}
              </div>

              {/* Phone Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#3E435D] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9AA9D6] focus:border-transparent"
                />
                {!isPhoneValid && (
                  <p className="text-xs text-red-500 mt-1">Phone number must be 10-15 digits.</p>
                )}
              </div>

              {/* Email Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#3E435D] mb-1">Email</label>
                <input
                  type='email'
                  value={tempGmail}
                  onChange={(e) => setTempGmail(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9AA9D6] focus:border-transparent"
                />
                {!isEmailValid && (
                  <p className="text-xs text-red-500 mt-1">Invalid email format</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isUserFormValid}
                  className={`px-4 py-2 rounded-md text-white ${isUserFormValid
                    ? 'bg-[#6AB062] hover:bg-[#55914F] transition-colors duration-300'
                    : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Info Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <h2 className="text-xl font-semibold mb-4 text-center text-[#3E435D]">Change Password</h2>

              {/* Original Password */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#3E435D] mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={originalPassword}
                    onChange={(e) => setOriginalPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9AA9D6] focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {show ? (
                      <IoMdEye className="text-gray-500 cursor-pointer hover:text-[#3C4E84]" onClick={handleClick} />
                    ) : (
                      <IoMdEyeOff className="text-gray-500 cursor-pointer hover:text-[#3C4E84]" onClick={handleClick} />
                    )}
                  </div>
                </div>
              </div>

              {/* New Password */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#3E435D] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                    }}
                    disabled={originalPassword.trim() === ""}
                    data-tooltip-id='new-password-tooltip'
                    data-tooltip-content='Please enter your current password first'
                    className={`w-full p-2.5 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#9AA9D6] focus:border-transparent ${originalPassword.trim() === "" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                  />
                  {/* tooltip for new password if original password havent been filled in */}
                  {originalPassword.trim() === "" && (<Tooltip id="new-password-tooltip" place="top" effect="solid" />)}

                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {showNewPassword ? (
                      <IoMdEye className="text-gray-500 cursor-pointer hover:text-[#3C4E84]" onClick={handleNewPasswordClick} />
                    ) : (
                      <IoMdEyeOff className="text-gray-500 cursor-pointer hover:text-[#3C4E84]" onClick={handleNewPasswordClick} />
                    )}
                  </div>
                </div>
                {showPasswordError && (
                  <p className="text-xs text-red-500 mt-1"> Password must be at least 8 characters and include at least one uppercase, one lowercase, one number, and one special character.</p>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setShowAccountModal(false)} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-300">Cancel</button>
                <button
                  onClick={handleAccountSave}
                  disabled={!isAccFormValid}
                  className={`px-4 py-2 rounded-md text-white ${isAccFormValid ? 'bg-[#6AB062] hover:bg-[#55914F] transition-colors duration-300' : 'bg-gray-400 cursor-not-allowed'
                    }`}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-center text-[#D2353E]">Delete Account</h2>
              <p className="text-sm text-center text-gray-600 mb-6">
                This action will permanently delete your account and all associated data. This cannot be undone.
              </p>

              <div className="flex justify-between">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-300">Cancel</button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-md text-white bg-[#BF565B] hover:bg-[#8C242A] transition-colors duration-300"
                >Delete My Account</button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add custom animation for the notification */}
      <style>
        {`
          @keyframes fade-in-down {
            0% {
              opacity: 0;
              transform: translateY(-20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.5s ease-out;
          }
        `}
      </style>
    </div>
  );
};

export default UserSettingPage;