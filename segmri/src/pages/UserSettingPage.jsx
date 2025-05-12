import React, { useState, useEffect } from 'react';
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css'; // Import default styles
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

  // User Information Modal - Validation Check (username,phone,email)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  const phoneRegex = /^\d{10,15}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const isUsernameValid = usernameRegex.test(tempName);
  const isPhoneValid = phoneRegex.test(tempPhone);
  const isEmailValid = emailRegex.test(tempGmail);
  const isUserFormValid = isUsernameValid && isPhoneValid && isEmailValid ;

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
      alert('Password updated successfully.');
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
  const [show,setShow] = useState(false) 
  const handleClick = () =>{
      setShow(!show)
  }

  // State for eye icon (new password)
  const [showNewPassword,setShowNewPassword] = useState(false) 
  const handleNewPasswordClick = () =>{
      setShowNewPassword(!showNewPassword)
  }

  // Delete Account Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // const handleDeleteAccount = () => {
    // Handle account deletion logic here
    // console.log("Account deleted");
    // setShowDeleteModal(false);
  // };

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
  useEffect(() =>
    {
      const fetchUserInfo = async () => {
        try {
          const response = await api.get('auth/fetch'); // Make sure AxiosInstance has baseURL set
          console.log('User Info Response:', response.data); // <== log here
          const { user } = response.data;
          const { username, phone, email, createdAt } = user;
        
          setName(username);
          setPhone(phone);
          setGmail(email);
          const formattedDate = new Date(createdAt).toISOString().split('T')[0]; // "YYYY-MM-DD"
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
    <div className="min-h-screen flex justify-center bg-[#F8F2E6]">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-col items-center pt-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {/* <img src={profileImage} alt="pfp" className="w-32 h-32 rounded-full shadow-lg object-cover" /> */}
          <h1 className="mt-4 text-xl font-bold text-[#3E435D]">Hi, {name} !</h1>
          <p className='mt-2 text-base text-[#676765]'>Manage your account here</p>
          {/* <h2 className="mt-2 text-base text-[#676765]">{gmail}</h2> */}
        </div>

        {/* User Info Section */}
        <div className="mt-16 mb-8 bg-[#FFFCF6] rounded-2xl shadow-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl">User Information</h2>
              <button
                onClick={handleEditClick}
                className="text-[#FFFCF6] px-4 py-2 rounded-md bg-[#9AA9D6] hover:shadow-lg hover:bg-[#7F8FBD] duration-300 transform transition-transform hover:scale-110">
                Edit
              </button>
            </div>
            <div className="h-[0.5px] w-[550px] bg-black mx-auto mb-8"></div>
            <div>
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Username</p>
                <p className="text-base text-[#616161]">{name}</p>
              </div>
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Phone Number</p>
                <p className="text-base text-[#616161]">{phone}</p>
              </div>
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Email</p>
                <p className="text-base text-[#616161]">{gmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info Section */}
        <div className="md:w-[600px] bg-[#FFFCF6] rounded-2xl shadow-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl">Account Information</h2>
              <button
                onClick={handleAccountEditClick}
                className="text-[#FFFCF6] px-4 py-2 rounded-md bg-[#9AA9D6] hover:shadow-lg hover:bg-[#7F8FBD] duration-300 transform transition-transform hover:scale-110">
                Edit
              </button>
            </div>
            <div className="h-[0.5px] w-[550px] bg-black mx-auto mb-8"></div>
            <div>
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Registered Date</p>
                <p className="text-base text-[#616161]">{registeredDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Button*/}
        <div className='flex justify-center mt-12 mb-20' style={{ fontFamily: 'Poppins, sans-serif' }}>
          <button 
          onClick={() => setShowDeleteModal(true)}
          className='rounded-md px-6 py-2 text-[#FFFCF6] bg-[#74342B] shadow-lg hover:bg-[#BF7377] duration-300 transform transition-transform hover:scale-110'>
            Delete This Account
          </button>
        </div>

        {/* user info model */}
        {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div
            className="bg-white rounded-lg p-8 w-[400px] shadow-2xl space-y-4"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            <h2 className="text-xl font-semibold mb-2 text-center">Edit User Info</h2>
              
            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              {!isUsernameValid && (
                <p className="text-sm text-red-500"> Username must be 3-20 characters, alphanumeric or underscores only.</p>
              )}
            </div>
            
            {/* Phone Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              {!isPhoneValid && (
                <p className="text-sm text-red-500">Phone number must be 10-15 digits.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Email</label>
              <input type='email' value={tempGmail} onChange={(e) => setTempGmail(e.target.value)} className="w-full p-2 border rounded-md" />
              {!isEmailValid && (
                <p className="text-sm text-red-500">Invalid email format</p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 duration-300 transform transition-transform hover:scale-110"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!isUserFormValid}
                className={`px-4 py-2 rounded-md text-white ${
                  isUserFormValid
                    ? 'bg-[#6AB062] hover:bg-[#55914F] duration-300 transform transition-transform hover:scale-110'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        )}


        {/* Account Info Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-[400px] shadow-2xl space-y-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <h2 className="text-xl font-semibold mb-2 text-center">Edit Account Info</h2>
              {/* Registered Date */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Registered Date</label>
                <input value={registeredDate} disabled className="w-full p-2 border bg-gray-100 text-gray-500 rounded-md" />
              </div>

              {/* Original Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Original Password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={originalPassword}
                    onChange={(e) => setOriginalPassword(e.target.value)}
                    className="w-full p-2 pr-10 border rounded-md"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {show ? (
                      <IoMdEye className="text-black cursor-pointer hover:text-[#3C4E84]" onClick={handleClick} />
                    ) : (
                      <IoMdEyeOff className="text-black cursor-pointer hover:text-[#3C4E84]" onClick={handleClick} />
                    )}
                  </div>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                    }}
                    disabled={originalPassword.trim() === ""}
                    data-tooltip-id='new-password-tooltip'
                    data-tooltip-content='Please enter your original password first'
                    className={`w-full p-2 pr-10 border rounded-md ${originalPassword.trim() === "" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                  />
                  {/* tooltip for new password if original password havent been filled in */}
                  {originalPassword.trim() === "" && (<Tooltip id="new-password-tooltip" place="top" effect="solid" />)}

                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {showNewPassword ? (
                      <IoMdEye className="text-black cursor-pointer hover:text-[#3C4E84]" onClick={handleNewPasswordClick} />
                    ) : (
                      <IoMdEyeOff className="text-black cursor-pointer hover:text-[#3C4E84]" onClick={handleNewPasswordClick} />
                    )}
                  </div>
                  
                </div>
                {showPasswordError && (
                <p className="text-sm text-red-500"> Password must be at least 8 characters and include at least one Uppercase, one Lowercase, one Number, and a Special Character.</p>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <button onClick={() => setShowAccountModal(false)} className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 duration-300 transform transition-transform hover:scale-110">Cancel</button>
                <button
                  onClick={handleAccountSave}
                  disabled={!isAccFormValid}
                  className={`px-4 py-2 rounded-md text-white ${
                    isAccFormValid ? 'bg-[#6AB062] hover:bg-[#55914F] duration-300 transform transition-transform hover:scale-110' : 'bg-gray-400 cursor-not-allowed'
                  }`}>Save</button>
              </div>
            </div>
          </div>
        )}


        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-[400px] shadow-2xl space-y-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <h2 className="text-xl font-semibold mb-4 text-center text-[#D2353E]">Delete Account</h2>
              <p className="text-base text-center text-gray-700">Deleting your account will PERMANENTLY remove all associated personal information and files. This action is IRREVERSIBLE, and you will not be able to recover this account. Are you sure you want to proceed?</p>

              <div className="flex justify-between mt-6">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 duration-300 transform transition-transform hover:scale-110">Cancel</button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-md text-white bg-[#D2353E] hover:bg-[#8C242A] duration-300 transform transition-transform hover:scale-110">Yes, Proceed</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserSettingPage;