import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Heart, Shield, User, Lock, Mail, Phone, ArrowRight, CheckCircle, ArrowLeft, UserPlus, Stethoscope } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/AxiosInstance';

const RegisterPage = () => {
  // State to store input for the registration form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  // State to hold validation error messages for each form field
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false); // State to toggle password visibility
  const [welcome, setWelcome] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Simulate navigation function for artifact demo
  const navigate = useNavigate();

  // Smooth fade-in animation on component mount
  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Handle changes to form input fields and update corresponding state
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear specific field error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  // Validate user inputs (name, email, password, phone)
  const validate = () => {
    const errs = {};
    // 3-20 char (letter/number/underscore)
    const nameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    // at least 8 digits (uppercase/lowercase/special char/num)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    // must xx@xx.xx
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // 10-15 digits
    const phoneRegex = /^\d{10,15}$/;

    if (!nameRegex.test(formData.name)) {
      errs.name = "Username must be 3-20 characters and contain only letters, numbers, or underscores.";
    }
    if (!emailRegex.test(formData.email)) {
      errs.email = "Please enter a valid email address.";
    }
    if (!passwordRegex.test(formData.password)) {
      errs.password = "Password must be at least 8 characters with uppercase, lowercase, number, and special character.";
    }
    if (!phoneRegex.test(formData.phone)) {
      errs.phone = "Phone number must be 10-15 digits.";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const validationErrors = validate();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
    } else {
      setErrors({});
      console.log("Form submitted:", formData);

      try {
        const response = await api.post('/auth/register', {
          username: formData.name, // convert name -> username
          password: formData.password,
          email: formData.email,
          phone: formData.phone,
          role: 'user' // Default role for new registrations
        });
        console.log('Registration successful:', response.data);
        
        // Trigger welcome message and start the redirection timer
        setWelcome(true);
        setIsRedirecting(true);

        // Redirect to login page 
        setTimeout(() => {
          navigate('/login');
        }, 1500);

      } catch (error) {
        console.error('Registration failed:', error);
        
        // Handle API errors exactly like your original
        if (error.response?.data?.field) {
          setErrors({
            ...errors,
            [error.response.data.field]: error.response.data.message
          });
        } else {
          // Set general error
          setErrors({
            ...errors,
            general: error.response?.data?.message || 'Registration failed. Please try again.'
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClick = () => setShow(!show);

  return (
    <div className={`min-h-screen bg-transparent transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Main container */}
      <div className='min-h-screen flex'>
        
        {/* Left Column - Auto-scrolling Background Carousel */}
        <div className='flex-[2] relative overflow-hidden'>
          {/* Background Carousel */}
          <div className='absolute inset-0'>
            <div className='flex transition-transform duration-700 ease-in-out animate-scroll h-full'>
              {/* Slide 1 */}
              <div className='min-w-full relative h-full'>
                <img src="./heart3.jpeg" alt="Advanced Medical Platform" className='w-full h-full object-cover' />
                <div className='absolute inset-0 bg-gradient-to-br from-[#741E20]/70 to-black/60'></div>
                <div className='absolute inset-0 flex items-center justify-center text-white'>
                  <div className='text-center max-w-lg px-8'>
                    <h1 className='text-5xl font-bold mb-6 leading-tight'>
                      Advanced Healthcare Platform
                    </h1>
                    <p className='text-xl mb-8 opacity-90 leading-relaxed'>
                      State-of-the-art medical technology at your fingertips
                    </p>
                    <div className='flex items-center justify-center mb-6'>
                      <div className='w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse'></div>
                      <span className='text-lg'>Live System Status: Online</span>
                    </div>
                    <div className='space-y-4'>
                      <div className='flex items-center justify-center text-lg'>
                        <Heart className='w-6 h-6 text-red-400 mr-3' />
                        <span>AI-powered diagnostics</span>
                      </div>
                      <div className='flex items-center justify-center text-lg'>
                        <Stethoscope className='w-6 h-6 text-blue-400 mr-3' />
                        <span>24/7 technical support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Slide 2 */}
              <div className='min-w-full relative h-full'>
                <img src="./heart2.jpeg" alt="Real-time Patient Monitoring" className='w-full h-full object-cover' />
                <div className='absolute inset-0 bg-gradient-to-br from-blue-600/70 to-black/60'></div>
                <div className='absolute inset-0 flex items-center justify-center text-white'>
                  <div className='text-center max-w-lg px-8'>
                    <h1 className='text-5xl font-bold mb-6 leading-tight'>
                      Real-time Patient Monitoring
                    </h1>
                    <p className='text-xl mb-8 opacity-90 leading-relaxed'>
                      Continuous health tracking with AI-powered insights
                    </p>
                    <div className='flex items-center justify-center mb-8'>
                      <div className='w-3 h-3 bg-blue-400 rounded-full mr-3 animate-pulse'></div>
                      <span className='text-lg'>10k+ Active Monitors</span>
                    </div>
                    {/* Logo */}
                    <div className='mb-8'>
                      <img src="./heart-logo.png" alt="VisHeart Logo" className='w-48 h-28 mx-auto opacity-90' />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Slide 3 - Custom Stats Slide */}
              <div className='min-w-full relative h-full bg-gradient-to-br from-[#741E20] to-[#9D4C51]'>
                <div className='absolute inset-0 opacity-10'>
                  <div className='grid grid-cols-12 grid-rows-12 h-full w-full gap-2 p-8'>
                    {Array.from({length: 144}).map((_, i) => (
                      <div key={i} className='bg-white rounded-full opacity-20 animate-pulse' style={{animationDelay: `${i * 0.1}s`}}></div>
                    ))}
                  </div>
                </div>
                <div className='relative z-10 h-full flex items-center justify-center text-white'>
                  <div className='text-center max-w-2xl px-8'>
                    <h1 className='text-5xl font-bold mb-8'>
                      Built for Innovation in Healthcare Technology
                    </h1>
                    <div className='grid grid-cols-3 gap-8 mb-8'>
                      <div className='text-center'>
                        <div className='text-4xl font-bold mb-2'>24/7</div>
                        <div className='text-lg opacity-80'>Expert Support</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-4xl font-bold mb-2'>12 Months</div>
                        <div className='text-lg opacity-80'>Development Timeline</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-4xl font-bold mb-2'>5+</div>
                        <div className='text-lg opacity-80'>Team Collaborators</div>
                      </div>
                    </div>
                    <p className='text-xl opacity-90 leading-relaxed'>
                      A step towards smarter, patient-focused systems
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Carousel Indicators */}
            <div className='absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20'>
              <div className='w-3 h-3 bg-white/70 rounded-full animate-indicator-1'></div>
              <div className='w-3 h-3 bg-white/70 rounded-full animate-indicator-2'></div>
              <div className='w-3 h-3 bg-white/70 rounded-full animate-indicator-3'></div>
            </div>
          </div>
        </div>

        {/* Right Column - Registration Form (Fixed Width) */}
        <div className='flex-1 flex items-center justify-center p-8'>
          <div className='w-full max-w-sm'>
            
            {!isRedirecting && !welcome && (
              <div className='space-y-6'>
                {/* Header */}
                <div className='text-center mb-8'>
                  <h2 className='text-3xl text-slate-800 mb-2'>Create Account</h2>
                  <p className='text-slate-600'>Join VisHeart's Healthcare Platform</p>
                </div>

                <div className='space-y-4'>
                  
                  {/* Username Field */}
                  <div className='group'>
                    <label className='block text-sm font-semibold text-slate-700 mb-2'>
                      Username
                    </label>
                    <div className='relative'>
                      <User className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#741E20] transition-colors' />
                      <input
                        type="text"
                        name="name"
                        placeholder="Choose a username"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-4 py-4 bg-white/80 border-2 rounded-xl focus:outline-none focus:bg-white transition-all duration-300 text-slate-800 placeholder-slate-500 ${
                          errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#741E20]'
                        }`}
                        required
                      />
                    </div>
                    {errors.name && <p className="text-red-600 text-sm mt-2">{errors.name}</p>}
                  </div>

                  {/* Phone Field */}
                  <div className='group'>
                    <label className='block text-sm font-semibold text-slate-700 mb-2'>
                      Phone Number
                    </label>
                    <div className='relative'>
                      <Phone className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#741E20] transition-colors' />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-4 py-4 bg-white/80 border-2 rounded-xl focus:outline-none focus:bg-white transition-all duration-300 text-slate-800 placeholder-slate-500 ${
                          errors.phone ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#741E20]'
                        }`}
                        required
                      />
                    </div>
                    {errors.phone && <p className="text-red-600 text-sm mt-2">{errors.phone}</p>}
                  </div>

                  {/* Email Field */}
                  <div className='group'>
                    <label className='block text-sm font-semibold text-slate-700 mb-2'>
                      Email Address
                    </label>
                    <div className='relative'>
                      <Mail className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#741E20] transition-colors' />
                      <input
                        type="email"
                        name="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-4 py-4 bg-white/80 border-2 rounded-xl focus:outline-none focus:bg-white transition-all duration-300 text-slate-800 placeholder-slate-500 ${
                          errors.email ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#741E20]'
                        }`}
                        required
                      />
                    </div>
                    {errors.email && <p className="text-red-600 text-sm mt-2">{errors.email}</p>}
                  </div>

                  {/* Password Field */}
                  <div className='group'>
                    <label className='block text-sm font-semibold text-slate-700 mb-2'>
                      Password
                    </label>
                    <div className='relative'>
                      <Lock className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-[#741E20] transition-colors' />
                      <input
                        type={show ? "text" : "password"}
                        name="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full pl-12 pr-12 py-4 bg-white/80 border-2 rounded-xl focus:outline-none focus:bg-white transition-all duration-300 text-slate-800 placeholder-slate-500 ${
                          errors.password ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#741E20]'
                        }`}
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
                    {errors.password && <p className="text-red-600 text-sm mt-2">{errors.password}</p>}
                  </div>

                  {/* General error message */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-700 text-sm font-medium">{errors.general}</p>
                    </div>
                  )}

                  {/* Register Button */}
                  <button 
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className='w-full bg-gradient-to-r from-[#741E20] to-[#9D4C51] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-[#741E20]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center group relative overflow-hidden'
                  >
                    <div className='absolute inset-0 bg-gradient-to-r from-[#9D4C51] to-[#741E20] opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                    
                    <div className='relative z-10 flex items-center'>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className='w-6 h-6 mr-3' />
                          <span>Create Account</span>
                          <ArrowRight className='w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-200' />
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {/* Additional Links */}
                <div className='mt-6 space-y-4'>
                  {/* Divider */}
                  <div className='flex items-center justify-center py-2'>
                    <div className='flex-grow h-px bg-slate-300'></div>
                    <div className='mx-4 text-slate-500 text-sm'>or</div>
                    <div className='flex-grow h-px bg-slate-300'></div>
                  </div>

                  {/* Link to sign in */}
                  <div className='text-center'>
                    <p className='text-slate-600'>
                      Already have an account?{' '}
                      <Link 
                        to="/login"
                        className="font-semibold text-[#741E20] hover:text-[#9D4C51] transition-colors duration-200 hover:underline underline-offset-2"
                      >
                        Sign In Instead
                      </Link>
                    </p>
                  </div>

                  {/* Back to login options */}
                  <div className='text-center'>
                    <Link 
                      to="/login-choice"
                      className="inline-flex items-center text-slate-500 hover:text-[#741E20] font-medium transition-all duration-200 group text-sm"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform duration-200" />
                      Back to access options
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
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
        
        @keyframes scroll {
          0% { transform: translateX(0); }
          33.33% { transform: translateX(-100%); }
          66.66% { transform: translateX(-200%); }
          100% { transform: translateX(0); }
        }

        .animate-scroll {
          animation: scroll 24s infinite ease-in-out;
        }
        
        @keyframes indicator-1 {
          0%, 33.33% { background-color: rgba(255, 255, 255, 1); }
          33.34%, 100% { background-color: rgba(255, 255, 255, 0.6); }
        }
        @keyframes indicator-2 {
          0%, 33.32%   { background-color: rgba(255, 255, 255, 0.6); }
          33.33%, 66.66% { background-color: rgba(255, 255, 255, 1); }
          66.67%, 100% { background-color: rgba(255, 255, 255, 0.6); }
        }

        @keyframes indicator-3 {
          0%, 66.65%   { background-color: rgba(255, 255, 255, 0.6); }
          66.66%, 100% { background-color: rgba(255, 255, 255, 1); }
        }
        .animate-indicator-1 { animation: indicator-1 24s infinite; }
        .animate-indicator-2 { animation: indicator-2 24s infinite; }
        .animate-indicator-3 { animation: indicator-3 24s infinite; }
      `}</style>
    </div>
  );
};

export default RegisterPage;