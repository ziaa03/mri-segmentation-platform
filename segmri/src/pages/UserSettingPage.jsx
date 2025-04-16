import React, { useState } from 'react';
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";

const UserSettingPage = () => {
  // User Info States
  const [name, setName] = useState('Alexa Raules');
  const [dob, setDob] = useState('1998-04-27');
  const [phone, setPhone] = useState('0123456789');
  const [showModal, setShowModal] = useState(false);

  // Temp States for User Info Modal
  const [tempName, setTempName] = useState(name);
  const [tempDob, setTempDob] = useState(dob);
  const [tempPhone, setTempPhone] = useState(phone);

  // Account Info States
  const [gmail, setGmail] = useState('alexaraules@gmail.com');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [tempGmail, setTempGmail] = useState(gmail);
  const [originalPassword, setOriginalPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [profileImage, setProfileImage] = useState('./default_user.png');
  const [tempImage, setTempImage] = useState(profileImage);

  const handleEditClick = () => {
    setTempName(name);
    setTempDob(dob);
    setTempPhone(phone);
    setTempImage(profileImage);
    setShowModal(true);
  };
  
  const handleSave = () => {
    setName(tempName);
    setDob(tempDob);
    setPhone(tempPhone);
    setProfileImage(tempImage);
    setShowModal(false);
  };
  

  // check if the user info modal input is not empty
  const isUserFormValid = tempName.trim() && tempDob && tempPhone.trim();

  const handleAccountEditClick = () => {
    setTempGmail(gmail);
    setOriginalPassword('');
    setNewPassword('');
    setShowAccountModal(true);
  };

  const handleAccountSave = () => {
    setGmail(tempGmail);
    // Handle original & new password validation here later (backend logic)
    setShowAccountModal(false);
  };

  // check if the acc info modal input is not empty
  // only check gmail field -> cuz pwd wont show by default
  const isAccFormValid = tempGmail.trim();

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

  const handleDeleteAccount = () => {
    // Handle account deletion logic here
    console.log("Account deleted");
    setShowDeleteModal(false);
  };

  return (
    <div className="min-h-screen flex justify-center bg-[#F8F2E6]">
      <div className="max-w-6xl mx-auto">

        {/* Profile Picture Section */}
        <div className="flex flex-col items-center pt-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <img src={profileImage} alt="pfp" className="w-32 h-32 rounded-full shadow-lg object-cover" />
          <h1 className="mt-4 text-xl font-bold text-[#3E435D]">{name}</h1>
          <h2 className="mt-2 text-base text-[#676765]">{gmail}</h2>
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
                <p className="text-sm font-semibold">Name</p>
                <p className="text-base text-[#616161]">{name}</p>
              </div>
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Date of Birth</p>
                <p className="text-base text-[#616161]">{dob}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Phone Number</p>
                <p className="text-base text-[#616161]">{phone}</p>
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
                <p className="text-base text-[#616161]">2025-04-09</p>
              </div>
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold">Gmail</p>
                <p className="text-base text-[#616161]">{gmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Button*/}
        <div className='flex justify-center mt-12 mb-20' style={{ fontFamily: 'Poppins, sans-serif' }}>
          <button 
          onClick={() => setShowDeleteModal(true)}
          className='rounded-md px-6 py-2 text-[#FFFCF6] bg-[#DA858A] shadow-lg hover:bg-[#BF7377] duration-300 transform transition-transform hover:scale-110'>
            Delete This Account
          </button>
        </div>


        {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div
            className="bg-white rounded-lg p-8 w-[400px] shadow-2xl space-y-4"
            style={{ fontFamily: 'Poppins, sans-serif' }}>
            <h2 className="text-xl font-semibold mb-2 text-center">Edit User Info</h2>
              
            {/* Image Preview & Upload */}
            <div className="space-y-2">
              
              {/* Image Preview First */}
              {tempImage && (
                <img
                  src={tempImage}
                  alt="Preview"
                  className="w-24 h-24 rounded-full mx-auto mt-1 object-cover shadow"
                />
              )}
    
              {/* Upload Button Second */}
              <label className="block text-sm font-medium">Profile Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setTempImage(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            
            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            {/* DOB Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                value={tempDob}
                onChange={(e) => setTempDob(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
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

              <div className="space-y-2">
                <label className="block text-sm font-medium">Registered Date</label>
                <input value="2025-04-09" disabled className="w-full p-2 border bg-gray-100 text-gray-500 rounded-md" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Gmail</label>
                <input type='email' value={tempGmail} onChange={(e) => setTempGmail(e.target.value)} className="w-full p-2 border rounded-md" />
              </div>

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

              <div className="space-y-2">
                <label className="block text-sm font-medium">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 pr-10 border rounded-md"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {showNewPassword ? (
                      <IoMdEye className="text-black cursor-pointer hover:text-[#3C4E84]" onClick={handleNewPasswordClick} />
                    ) : (
                      <IoMdEyeOff className="text-black cursor-pointer hover:text-[#3C4E84]" onClick={handleNewPasswordClick} />
                    )}
                  </div>
                </div>
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