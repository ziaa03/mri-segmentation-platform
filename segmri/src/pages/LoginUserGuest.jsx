import React, { useState } from 'react';
import { Heart, Shield, User, UserCheck, ArrowRight, Stethoscope, Activity, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginUserGuest = () => {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();

  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);

  const handleUserModeClick = () => {
    setIsLoadingUser(true);
    // Navigate to the login page
    setTimeout(() => {
      navigate('/login');
      setIsLoadingUser(false);
    }, 500);
  };

  const handleGuestModeClick = async () => {
    setIsLoadingGuest(true);
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
    } finally {
      setIsLoadingGuest(false);
    }
  };

  return (
    <div className='h-screen relative flex items-center justify-center p-6 overflow-hidden'>
      
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
      <div className='relative z-10 w-full max-w-7xl h-full flex items-center'>
        <div className='bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 w-full h-[90vh] flex flex-col justify-center'>
          
          {/* Header Section */}
          <div className='text-center mb-8'>
            {/* Logo */}
            <div className='mt-8 mb-8 flex justify-center'>
              <img src="./heart-logo.png" alt="VisHeart Logo" className='w-42 h-28' />
            </div>
            <h2 className='text-2xl text-white mb-2'>
              Advanced Cardiac Care Platform
            </h2>
            <p className='text-base text-white'>
              Choose your access level to begin your healthcare journey
            </p>
          </div>

          {/* Two Column Layout */}
          <div className='flex-1 flex gap-8 items-stretch max-w-5xl mx-auto w-full'>
            
            {/* User Mode Column */}
            <div className='flex-1 bg-gradient-to-br from-[#741E20]/5 to-[#9D4C51]/5 rounded-2xl p-6 border border-[#741E20]/10 flex flex-col'>
              
              {/* Features */}
              <div className='mb-6'>
                <div className='flex items-center justify-center mb-4'>
                  <div className='w-16 h-16 bg-[#741E20] rounded-2xl flex items-center justify-center'>
                    <User className='w-8 h-8 text-white' />
                  </div>
                </div>
                <h3 className='text-xl font-bold text-white text-center mb-4'>PROFESSIONAL ACCESS</h3>
                
                <div className='space-y-3 mb-6'>
                  <div className='flex items-center justify-center bg-white/70 rounded-xl p-3'>
                    <Activity className='w-5 h-5 text-[#741E20] mr-3' />
                    <span className='text-sm font-medium text-slate-700'>Complete Patient Management</span>
                  </div>
                  <div className='flex items-center justify-center bg-white/70 rounded-xl p-3'>
                    <Zap className='w-5 h-5 text-[#741E20] mr-3' />
                    <span className='text-sm font-medium text-slate-700'>Advanced Diagnostic Tools</span>
                  </div>
                  <div className='flex items-center justify-center bg-white/70 rounded-xl p-3'>
                    <Shield className='w-5 h-5 text-[#741E20] mr-3' />
                    <span className='text-sm font-medium text-slate-700'>Personalized Dashboard</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className='mt-auto'>
                <button
                  onClick={handleUserModeClick}
                  disabled={isLoadingUser || isLoadingGuest}
                  className='w-full bg-gradient-to-r from-[#741E20] to-[#9D4C51] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-[#741E20]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center group relative overflow-hidden'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-[#9D4C51] to-[#741E20] opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                  
                  <div className='relative z-10 flex items-center'>
                    {isLoadingUser ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    ) : (
                      <User className='w-6 h-6 mr-3' />
                    )}
                    <span>Login to Continue</span>
                    {!isLoadingUser && <ArrowRight className='w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-200' />}
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className='flex flex-col items-center justify-center px-4'>
              <div className='h-32 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent'></div>
              <div className='my-4 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-full border border-slate-200 shadow-lg'>
                <span className='text-slate-700 font-semibold text-sm'>OR</span>
              </div>
              <div className='h-32 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent'></div>
            </div>

            {/* Guest Mode Column */}
            <div className='flex-1 bg-gradient-to-br from-[#4D6885]/5 to-[#5A7A9A]/5 rounded-2xl p-6 border border-[#4D6885]/10 flex flex-col'>
              
              {/* Features */}
              <div className='mb-6'>
                <div className='flex items-center justify-center mb-4'>
                  <div className='w-16 h-16 bg-[#4D6885] rounded-2xl flex items-center justify-center'>
                    <UserCheck className='w-8 h-8 text-white' />
                  </div>
                </div>
                <h3 className='text-xl font-bold text-white text-center mb-4'>GUEST PREVIEW</h3>
                
                <div className='space-y-3 mb-6'>
                  <div className='flex items-center justify-center bg-white/70 rounded-xl p-3'>
                    <Activity className='w-5 h-5 text-[#4D6885] mr-3' />
                    <span className='text-sm font-medium text-slate-700'>System Overview & Demo</span>
                  </div>
                  <div className='flex items-center justify-center bg-white/70 rounded-xl p-3'>
                    <Heart className='w-5 h-5 text-[#4D6885] mr-3' />
                    <span className='text-sm font-medium text-slate-700'>Public Information Access</span>
                  </div>
                  <div className='flex items-center justify-center bg-white/70 rounded-xl p-3'>
                    <Stethoscope className='w-5 h-5 text-[#4D6885] mr-3' />
                    <span className='text-sm font-medium text-slate-700'>No Account Required</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className='mt-auto'>
                <button
                  onClick={handleGuestModeClick}
                  disabled={isLoadingUser || isLoadingGuest}
                  className='w-full bg-gradient-to-r from-[#4D6885] to-[#5A7A9A] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-[#4D6885]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center group relative overflow-hidden'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-[#5A7A9A] to-[#4D6885] opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                  
                  <div className='relative z-10 flex items-center'>
                    {isLoadingGuest ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    ) : (
                      <UserCheck className='w-6 h-6 mr-3' />
                    )}
                    <span>Continue as Guest</span>
                    {!isLoadingGuest && <ArrowRight className='w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-200' />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer
          <div className='mt-8 pt-6 border-t border-slate-200'>
            <div className='flex items-center justify-center gap-6 text-xs text-white font-bold'>
              <div className='flex items-center'>
                <Shield className='w-3 h-3 mr-1 text-white' />
                <span>Enterprise Security</span>
              </div>
              <div className='w-1 h-1 bg-slate-400 rounded-full'></div>
              <div className='flex items-center'>
                <Heart className='w-3 h-3 mr-1 text-white' />
                <span>HIPAA Compliant</span>
              </div>
              <div className='w-1 h-1 bg-slate-400 rounded-full'></div>
              <div className='flex items-center'>
                <Stethoscope className='w-3 h-3 mr-1 text-white' />
                <span>FDA Cleared</span>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default LoginUserGuest;