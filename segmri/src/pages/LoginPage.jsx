import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Heart, Shield, User, Lock, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Smooth fade-in animation on component mount
  useEffect(() => {
    setFadeIn(true);
  }, []);

  const handleClick = () => {
    setShow(!show);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // --- 1️⃣ Local validation before contacting server ---
    const usernameRegex = /^.{3,}$/; // At least 3 characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    // - At least 8 chars
    // - 1 lowercase, 1 uppercase, 1 number, 1 special character

    if (!usernameRegex.test(username)) {
      setError('Username must be 3-20 characters and contain only letters, numbers, or underscores.');
      setIsLoading(false);
      return;
    }

    if (!passwordRegex.test(password)) {
      setError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'
      );
      setIsLoading(false);
      return;
    }

    // --- 2️⃣ Proceed with server request if validation passes ---
    try {
      const result = await login(username, password);

      if (result.success) {
        // Set welcome message based on role
        const role = result.user.role || 'user';
        let redirectPath = '/landing';

        if (role === 'admin') {
          setWelcomeMessage(`Welcome, Admin ${result.user.username}!`);
        } else {
          setWelcomeMessage(`Welcome back, ${result.user.username}!`);
        }

        // Show welcome message and redirect after delay
        setWelcome(true);
        setIsRedirecting(true);

        setTimeout(() => {
          navigate(redirectPath);
        }, 1500);
      } else {
        // --- 3️⃣ Logical message if credentials are wrong ---
        setError('Invalid username and password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={`h-screen relative flex items-center justify-center p-6 overflow-hidden transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Background Image */}
      <div className='absolute inset-0'>
        <img 
          src="./heart3.jpeg" 
          alt="Medical Background" 
          className='w-full h-full object-cover'
        />
        <div className='absolute inset-0 bg-black/40'></div>
      </div>

      {/* Main container */}
      <div className='relative z-10 w-full max-w-4xl h-full flex items-center'>
        <div className='bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 w-full h-[95vh] flex flex-col justify-center'>
          
          {/* Header Section */}
          <div className='text-center mb-8'>
            {/* Logo */}
            <div className='mb-8 mt-4 flex justify-center'>
              <img src="./heart-logo.png" alt="VisHeart Logo" className='w-42 h-28' style={{filter: 'drop-shadow(0 0 0 white) drop-shadow(0 0 2px white) drop-shadow(0 0 70px white)'}} />
            </div>

            {!welcome && (
              <div>
                <h2 className='text-2xl text-white mb-2'>
                  Professional Access Portal
                </h2>
                <p className='text-base text-white'>
                  Enter your credentials to access the healthcare management system
                </p>
              </div>
            )}
          </div>

          {/* Welcome Message */}
          {welcome && (
            <div className="text-center animate-fadeIn">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-[#DEC1C2] mb-4">{welcomeMessage}</h1>
              <p className="text-lg mb-6 text-white">Authentication successful</p>
              <div className="flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#741E20] mr-3"></div>
                Accessing your dashboard...
              </div>
            </div>
          )}

          {/* Login Form */}
          {!isRedirecting && !welcome && (
            <div className='flex-1 max-w-md mx-auto w-full'>
              <form onSubmit={handleSubmit} className='space-y-5'>
                
                {/* Username Field */}
                <div className='group'>
                  <label className='block text-sm font-semibold text-white mb-2'>
                    Username / Employee ID
                  </label>
                  <div className='relative'>
                    <User className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#741E20] transition-colors' />
                    <input 
                      type="text" 
                      placeholder="Enter your username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className='w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#741E20] focus:bg-white transition-all duration-300 text-slate-800 placeholder-slate-500' 
                      required 
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className='group'>
                  <label className='block text-sm font-semibold text-white mb-2'>
                    Password
                  </label>
                  <div className='relative'>
                    <Lock className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#741E20] transition-colors' />
                    <input 
                      type={show ? "text" : "password"} 
                      placeholder="Enter your password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className='w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#741E20] focus:bg-white transition-all duration-300 text-slate-800 placeholder-slate-500' 
                      required 
                    />
                    <button
                      type="button"
                      onClick={handleClick}
                      className='absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-[#741E20] transition-colors'
                    >
                      {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                {/* Login Button */}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className='w-full bg-gradient-to-r from-[#741E20] to-[#9D4C51] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-[#741E20]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center group relative overflow-hidden'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-[#9D4C51] to-[#741E20] opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                  
                  <div className='relative z-10 flex items-center'>
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <User className='w-6 h-6 mr-3' />
                        <span>Sign In to Continue</span>
                        <ArrowRight className='w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-200' />
                      </>
                    )}
                  </div>
                </button>
              </form>

              {/* Additional Links */}
              <div className='mt-8 space-y-4'>
                {/* Back to login options */}
                <div className='text-center'>
                  <Link 
                    to="/login-choice"
                    className="inline-flex items-center text-white hover:text-[#741E20] font-medium transition-all duration-200 group"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform duration-200" />
                    Back to access options
                  </Link>
                </div>

                {/* Divider */}
                <div className='flex items-center justify-center py-2'>
                  <div className='flex-grow h-px bg-slate-300'></div>
                  <div className='mx-4 text-slate-500 text-sm'>or</div>
                  <div className='flex-grow h-px bg-slate-300'></div>
                </div>

                {/* Link to register */}
                <div className='text-center'>
                  <p className='text-white'>
                    Don't have an account yet?{' '}
                    <Link 
                      to="/register"
                      className="font-semibold text-white transition-colors duration-200 underline"
                    >
                      Create One Now
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;