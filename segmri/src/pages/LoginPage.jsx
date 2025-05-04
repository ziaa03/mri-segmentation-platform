import React, { useState, useEffect } from 'react';
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { Link } from 'react-router-dom';
import api from '../api/AxiosInstance';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  // State to trigger welcome message before redirect to landing
  const [welcome, setWelcome] = useState(false); 
  // State to handle redirection
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = () => {
    setShow(!show);
  };

  const navigate = useNavigate();

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      console.log('Login success:', response.data);
      
      // Trigger welcome message and start the redirection timer
      setWelcome(true);
      setIsRedirecting(true);
      
      // Redirect to landing page
      setTimeout(() => {
        navigate('/landing');
      }, 1500);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className='h-screen flex flex-col md:flex-row bg-[#FFFCF6]'>
      {/* Left side */}
      <div className='flex-1 flex flex-col'>
        {/* Logo div */}
        <div className='h-1/8 mt-8 ml-16'>
          <img src="./heart-logo.png" alt="VisHeart Logo" className='w-40 h-24' />
        </div>

        {/* Login div */}
        <div className='h-7/8 flex-1 flex items-center justify-center'>
          <div className='w-full max-w-md px-6'>
            <div className='mb-10 text-[#741E20]'>
              {/* Show original welcome message only when redirect message is not shown */}
              {!welcome && (
                <>
                  <p className='text-4xl mb-3 font-bold tracking-wider'>WELCOME BACK !</p>
                  <p className='text-xl font-thin tracking-wide'>Please enter your details</p>
                </>
              )}
            </div>

            {/* Display the welcome message */}
            {welcome && (
              <div className="text-left justify-center w-[500px] h-[200px]">
                <h1 className="text-5xl font-bold text-[#741E20] tracking-wide mb-4">Welcome to VisHeart !</h1>
                <p className="text-xl mt-4">Redirecting you to the landing page...</p>
              </div>
            )}

            {/* Show the login form only if we're not redirecting and haven't shown the welcome message */}
            {!isRedirecting && !welcome && (
              <form onSubmit={handleSubmit}>
                {/* Username input */}
                <div className='border border-[#4D6885] px-2 py-3 mb-10 shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                  <input 
                    type="text" 
                    placeholder="Username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className='focus:outline-none w-full bg-[#FFFCF6]' 
                    required 
                  />
                </div>

                {/* Password input */}
                <div className='border border-[#4D6885] px-2 py-3 mb-10 flex items-center shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                  <input 
                    type={show ? "text" : "password"} 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='focus:outline-none w-full bg-[#FFFCF6]' 
                    required 
                  />
                  {show ? (
                    <IoMdEye className="text-[#74342B] cursor-pointer ml-2 hover:text-black" onClick={handleClick} />
                  ) : (
                    <IoMdEyeOff className="text-[#74342B] cursor-pointer ml-2 hover:text-black" onClick={handleClick} />
                  )}
                </div>

                {/* Login button */}
                <button 
                  type="submit" 
                  className='text-[#FFFCF6] px-8 py-2 bg-[#741E20] hover:shadow-2xl hover:bg-opacity-85 duration-500 transform transition-transform hover:scale-110 text-xl'
                >LOGIN</button>

                {/* Error message */}
                {error && <p className="text-red-500 mt-4">{error}</p>}

                {/* Link to register */}
                <div className='mt-6'>
                  <p className='tracking-wider text-[#343231]'>
                    Don't have an account yet?
                    <Link to="/register" className="text-[#343231] ml-2 underline hover:text-[#9D4C51] duration-200">
                      Create One Now!
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className='flex-1 flex justify-center items-center'>
        <img src="./heart3.jpeg" alt="loginHeart" className='w-[95%] h-[95%] object-cover rounded-2xl opacity-95' />
      </div>
    </div>
  );
};

export default LoginPage;
