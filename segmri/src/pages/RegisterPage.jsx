import React, { useState } from 'react'
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";

const RegisterPage = () => {

     //State for eye icon
     const [show,setShow] = useState(false) //pwd is hidden by default
     const handleClick = () =>{
         setShow(!show) //when click the icon, switch the 'show' value
     }


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
                <div className='mb-10 text-[#741E20]' style={{fontFamily: 'Ovo' }}>
                  <p className='text-4xl mb-3 text-bold tracking-wider'>SIGN UP to VisHeart !</p>
                  <p className='text-xl text-thin tracking-wide'>Start your journey</p>
                </div>

                <div>
                    <form>
                        {/* input */}
                        <div className='border border-[#4D6885] px-2 py-3 mb-4 shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                            <input type="text" placeholder="Name" className='focus:outline-none w-full bg-[#FFFCF6]' required />
                        </div>
                        <div className='border border-[#4D6885] px-2 py-3 mb-4 shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                            <input type="date" placeholder="Date of Birth" className='focus:outline-none w-full bg-[#FFFCF6]' required />
                        </div>
                        <div className='border border-[#4D6885] px-2 py-3 mb-4 shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                            <input type="tel" placeholder="Phone Number" className='focus:outline-none w-full bg-[#FFFCF6]' required />
                        </div>
                        <div className='border border-[#4D6885] px-2 py-3 mb-4 shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                            <input type="email" placeholder="Gmail" className='focus:outline-none w-full bg-[#FFFCF6]' required />
                        </div>
                        <div className='border border-[#4D6885] px-2 py-3 mb-4 flex items-center shadow-md hover:shadow-lg transition-transform duration-700 focus-within:scale-105'>
                          <input type={show ? "text" : "password"} placeholder="Password" className='focus:outline-none w-full bg-[#FFFCF6]' required />
                          {show ? (<IoMdEye className="text-[#74342B] cursor-pointer ml-2 hover:text-black" onClick={handleClick} />) : (<IoMdEyeOff className="text-[#74342B] cursor-pointer ml-2 hover:text-black" onClick={handleClick} />)}
                        </div>

                        <button className='mt-4 text-[#FFFCF6] px-8 py-2 bg-[#741E20] text-xl hover:shadow-2xl hover:bg-opacity-85 duration-500 transform transition-transform  hover:scale-110 ' style={{fontFamily: 'Ovo' }}>REGISTER</button>


                        <div className='mt-5' style={{fontFamily: 'Ovo' }}>
                          <p className='tracking-wider text-[#343231]'>
                            Already have an account?
                            <a href="#" className="text-[#343231] ml-2 underline hover:text-[#9D4C51] duration-200">Sign-in Here.</a>
                          </p>
                        </div>

                    </form>
                </div>
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
