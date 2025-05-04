import React, { useState } from 'react';
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { Link, Navigate } from 'react-router-dom';
import api from '../api/AxiosInstance';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {

  //State to store input for the registration form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  //State to hold validation erro messages for each form field
  const [errors, setErrors] = useState({});

  const [welcome, setWelcome] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  //Handle changes to form input fields and update corresponding state
  const handleChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  //Validate user inputs (name,email,password,phone)
  const validate = () => {
      const errs = {};
      // 3-20 char (letter/number/underscore)
      const nameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      // at least 8 digits (uppercase/lowercase/special char/num)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
      //must xx@xx.xx
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      //10-15 digits
      const phoneRegex = /^\d{10,15}$/;

      if (!nameRegex.test(formData.name)) {
          errs.name = "Name must be 3-20 characters and contain only letters, numbers, or underscores.";
      }
      if (!emailRegex.test(formData.email)) {
          errs.email = "Email must be a valid Gmail address.";
      }
      if (!passwordRegex.test(formData.password)) {
          errs.password = "Password must be at least 8 characters and include at least one Uppercase, one Lowercase, one Number, and a Special Character.";
      }
      if (!phoneRegex.test(formData.phone)) {
          errs.phone = "Phone number must be 10-15 digits.";
      }
      return errs;
  };

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
      e.preventDefault(); 
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
      } else {
          setErrors({});
          console.log("Form submitted:", formData);
      
          try {
              const response = await api.post('/auth/register', {
                  username: formData.name, // convert name -> username
                  password: formData.password,
                  email: formData.email,
                  phone: formData.phone
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
              console.error('Registration failed:', error.response?.data ||    error.message);
              // Optionally show error message to user
          }
      }
  };


  // Toggle show/hide password state (eye icon)
  const [show, setShow] = useState(false);
  // Handle pwd visibility toggle
  const handleClick = () => setShow(!show);

  return (
      <div className='h-screen flex flex-col md:flex-row bg-[#FFFCF6]'>
          {/* Left side */}
          <div className='flex-1 flex flex-col'>
              <div className='h-1/8 mt-8 ml-16'>
                  <img src="./heart-logo.png" alt="VisHeart Logo" className='w-40 h-24' />
              </div>
              <div className='h-7/8 flex-1 flex items-center justify-center'>
                  <div className='w-full max-w-md px-6'>
                      {!welcome && (                    
                      <div className='mb-10 text-[#741E20]'>
                          <p className='text-4xl mb-3 font-bold tracking-wider'>SIGN UP to VisHeart!</p>
                          <p className='text-xl tracking-wide'>Start your journey</p>
                      </div>
                      )}

                       {/* Display the welcome message */}
                       {welcome && (
                           <div className="text-left justify-center w-[500px] h-[200px]">
                             <h1 className="text-5xl font-bold text-[#741E20] tracking-wide mb-4">Thank you for signing up !</h1>
                             <p className="text-xl mt-4">Redirecting you to the login page...</p>
                           </div>
                        )}

                      {!isRedirecting && !welcome && ( 
                      <form onSubmit={handleSubmit}>
                          {/* Name */}
                          <div className="border border-[#4D6885] px-2 py-3 mb-5 shadow-md transition-transform duration-700 focus-within:scale-105">
                          <input
                            type="text"
                            name="name"
                            placeholder="Username"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-[#FFFCF6] focus:outline-none"
                            required
                          />
                        </div>
                          {errors.name && <p className="text-red-600 text-sm mb-2">{errors.name}</p>}

                          {/* Phone */}
                          <div className='border border-[#4D6885] px-2 py-3 mb-5 shadow-md transition-transform duration-700 focus-within:scale-105'>
                              <input
                                  type="tel"
                                  name="phone"
                                  placeholder="Phone Number"
                                  value={formData.phone}
                                  onChange={handleChange}
                                  className='focus:outline-none w-full bg-[#FFFCF6]'
                                  required
                              />
                          </div>
                          {errors.phone && <p className="text-red-600 text-sm mb-2">{errors.phone}</p>}

                          {/* Email */}
                          <div className='border border-[#4D6885] px-2 py-3 mb-5 shadow-md transition-transform duration-700 focus-within:scale-105'>
                              <input
                                  type="email"
                                  name="email"
                                  placeholder="Gmail"
                                  value={formData.email}
                                  onChange={handleChange}
                                  className='focus:outline-none w-full bg-[#FFFCF6]'
                                  required
                              />
                          </div>
                          {errors.email && <p className="text-red-600 text-sm mb-2">{errors.email}</p>}

                          {/* Password */}
                          <div className='border border-[#4D6885] px-2 py-3 mb-5 flex items-center shadow-md transition-transform duration-700 focus-within:scale-105'>
                              <input
                                  type={show ? "text" : "password"}
                                  name="password"
                                  placeholder="Password"
                                  value={formData.password}
                                  onChange={handleChange}
                                  className='focus:outline-none w-full bg-[#FFFCF6]'
                                  required
                              />
                              {show ? (
                                  <IoMdEye className="text-[#74342B] cursor-pointer ml-2 hover:text-black" onClick={handleClick} />
                              ) : (
                                  <IoMdEyeOff className="text-[#74342B] cursor-pointer ml-2 hover:text-black" onClick={handleClick} />
                              )}
                          </div>
                          {errors.password && <p className="text-red-600 text-sm mb-4">{errors.password}</p>}
                          <button type="submit" className='mt-4 text-[#FFFCF6] px-8 py-2 bg-[#741E20] text-xl hover:shadow-2xl hover:bg-opacity-85 duration-500 transform hover:scale-110'>
                              REGISTER
                          </button>
                          <div className='mt-5'>
                              <p className='tracking-wider text-[#343231]'>
                                  Already have an account?
                                  <Link to="/login" className="text-[#343231] ml-2 underline hover:text-[#9D4C51] duration-200">Sign In Now!</Link>
                              </p>
                          </div>
                      </form>
                      )} 
                  </div>
              </div>
          </div>
          {/* Right side */}
          <div className='flex-1 flex justify-center items-center'>
              <img src="./heart2.jpeg" alt="loginHeart" className='w-[95%] h-[95%] object-cover rounded-2xl opacity-95' />
          </div>
      </div>
  );
};

export default RegisterPage;
