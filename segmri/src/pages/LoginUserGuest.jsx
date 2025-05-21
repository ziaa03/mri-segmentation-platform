import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useAuth } from '../context/AuthContext';

const LoginUserGuest = () => {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();

  const handleUserModeClick = () => {
    // Navigate to the login page
    setTimeout(() => {
      navigate('/login');
    }, 500);
  };

  const handleGuestModeClick = async () => {
    try {
      // Use the auth context to login as guest
      const result = await loginAsGuest();
      console.log('Login result:', result);
      if (result.success) {
        console.log('Guest mode activated');
        // Redirect to landing page after success
        setTimeout(() => {
          navigate('/landing');
        }, 500);
      }
    } catch (error) {
      console.error('Error activating guest mode:', error);
    }
  };

  return (
    <div className='h-screen flex flex-col md:flex-row bg-[#FFFCF6]'>
      {/* left side */}
      <div className='flex-1 flex flex-col'>
        {/* Logo */}
        <div className='mt-8 ml-16'>
          <img src="./heart-logo.png" alt="VisHeart Logo" className='w-40 h-24' />
        </div>

        {/* Content */}
        <div className='flex-1 flex flex-col items-center justify-center px-6'>
          <div className='mb-20 text-[#741E20] w-[380px]'>
            <h2 className='text-2xl md:text-3xl font-serif text-left tracking-wide'>LOGIN to VisHeart</h2>
            <p className='text-xl font-thin tracking-wide'>Select an option to get started with VisHeart</p>
          </div>

          {/* User Mode Button */}
          <button
            onClick={handleUserModeClick}
            className='w-full max-w-sm py-3 rounded-full bg-[#974646] text-white text-lg tracking-wider mb-6 shadow-md hover:bg-[#7D3A3A] transition duration-300'
            data-tooltip-id="user-tooltip"
            data-tooltip-content="'User Mode' to access all features with your account"
          >
            USER MODE
          </button>
          <Tooltip id="user-tooltip" style={{backgroundColor:'#FFD9DB', color:'black'}} />

          {/* Divider with OR */}
          <div className='flex items-center justify-center w-full max-w-sm mb-6'>
            <div className='flex-grow h-px bg-black'></div>
            <span className='mx-4 text-[#7D3A3A] font-medium'>OR</span>
            <div className='flex-grow h-px bg-black'></div>
          </div>

          {/* Guest Mode Button */}
          <button
            onClick={handleGuestModeClick}
            className='w-full max-w-sm py-3 rounded-full bg-[#974646] text-white text-lg tracking-wider shadow-md hover:bg-[#7D3A3A] transition duration-300'
            data-tooltip-id="guest-tooltip"
            data-tooltip-content="'Guest Mode' for limited access without logging in"
          >
            GUEST MODE
          </button>
          <Tooltip id="guest-tooltip" style={{backgroundColor:'#FFD9DB', color:'black'}} />
        </div>
      </div>

      {/* right side */}
      <div className='flex-1 flex justify-center items-center'>
        <img
          src="./heart3.jpeg"
          alt="loginHeart"
          className='w-[95%] h-[95%] object-cover rounded-2xl opacity-95'
        />
      </div>
    </div>
  );
};

export default LoginUserGuest;