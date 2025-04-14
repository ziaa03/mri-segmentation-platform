import React from 'react';

const Footer = () => {
  return (
    <footer className="py-8 px-8 bg-[#FFFCF6] text-[#343231]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Logo and branding section */}
          <div className="flex flex-col items-start">
            <div className="flex items-center mb-2">
              {/* Heart Logo */}
              <div className="flex items-center mb-2 ml-5">
                {/* Logo Image */}
                <img src="/heart-logo.png" alt="VisHeart Logo" className="w-[220px]" />
              </div>
            </div>
          </div>
          
          {/* About Us section */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-12'>
          <div>
            <h4 className="text-lg font-medium mb-4 mt-2 text-[#74342B]">ABOUT US</h4>
            <p className="text-sm">
              We specialize in AI-powered cardiac segmentation, delivering precise and automated medical image analysis to enhance diagnosis and patient care.
            </p>
          </div>
          
          {/* Quick Links section */}
          <div>
            <h4 className="text-lg font-medium mb-4 mt-2 text-[#74342B]">QUICK LINKS</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-[#74342B] transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-[#74342B] transition-colors">Login</a></li>
              <li><a href="#" className="hover:text-[#74342B] transition-colors">Uploads</a></li>
              <li><a href="#" className="hover:text-[#74342B] transition-colors">The Team</a></li>
            </ul>
          </div>
        </div>
        </div>
        
        {/* Copyright section */}
        <div className="mt-8 pt-6 border-t border-[#DFD3BF] text-left">
          <p className="text-sm">© 2025 VisHeart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;