import React, { useState, useEffect } from 'react';

const LandingPage = () => {
  // State for image slider
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Images for slider
  const sliderImages = [
    { src: "/image-1.png", alt: "Cardiac MRI Scan", caption: "Cardiac MRI Scan" },
    { src: "/image-2.png", alt: "High-Reso Cardiac MRI Scan", caption: "High-resolution cardiac imaging" },
    { src: "/image-3.png", alt: "Doctor Interface", caption: "Intuitive specialist interface" }
  ];
  
  // Handle manual slider navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <>
      {/* Hero Section with Background Video */}
      <div className="hero-section relative w-full h-screen overflow-hidden bg-gradient-to-b from-[#3A4454] to-[#5B7B9A]">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute inset-0 bg-[#3A4454] opacity-50 z-10"></div>
          <video 
            className="w-full h-full object-cover"
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ transform: `translateY(${scrollY * 0.15}px)` }}
          >
            <source src="/hero-vid.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        
        {/* Content */}
        <div className="hero-content relative z-20 h-full flex flex-col items-center justify-center text-center px-4">
          <div>
            <h1 className="hero-header text-6xl font-light tracking-wider text-white m-0">
              VisHeart
            </h1>
            <p className="hero-description text-xl font-light text-white mt-6 mb-12 max-w-xl opacity-90">
              AI-Powered Cardiac Segmentation for Precision Healthcare
            </p>
            <button 
              className="hero-button px-8 py-3 bg-transparent border-2 border-white text-white rounded-full hover:bg-white hover:text-blue-900 transition-all duration-300 transform hover:-translate-y-1"
            >
              Explore
            </button>
          </div>
        </div>
      </div>
      
      {/* Information Section with Image Slider */}
      <div className="info-section py-24 px-8 bg-[#FFFCF6]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* Info Description */}
            <div className="info-desc w-full lg:w-1/2 lg:sticky lg:top-8">
              <h2 className="text-3xl font-light mb-8 text-[#3A4454]">
                Advanced Cardiac<br />Imaging Technology
              </h2>
              
              <p className="text-base mb-6 text-[#3A4454] leading-relaxed">
                The cardiac system is the heart's network for circulating oxygen-rich blood throughout the body. Our VisHeart technology provides unprecedented visualization capabilities for cardiac specialists, enabling more accurate diagnosis through AI-powered segmentation.
              </p>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-3 text-[#5B7B9A]">Key Benefits</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#A87C5F] mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Advanced AI segmentation algorithms for greater accuracy</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#A87C5F] mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Cloud-based collaboration for specialists worldwide</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#A87C5F] mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Intuitive interface optimized for clinical workflows</span>
                  </li>
                </ul>
              </div>
              
              <div className="info-button mt-8">
                <button 
                  className="px-6 py-3 bg-[#5B7B9A] hover:bg-[#4A6A89] text-white rounded-md transition-all duration-300 shadow-md"
                >
                  Learn More
                </button>
              </div>
            </div>
            
            {/* Image Slider */}
            <div className="w-full lg:w-1/2 relative overflow-hidden rounded-lg shadow-lg h-96">
              {sliderImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img 
                    src={image.src} 
                    alt={image.alt} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3A4454] to-transparent p-4">
                    <p className="text-white text-sm">{image.caption}</p>
                  </div>
                </div>
              ))}
              
              {/* Slider controls */}
              <div className="absolute bottom-4 right-4 flex space-x-2">
                {sliderImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide ? 'bg-white scale-125' : 'bg-white bg-opacity-50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              {/* Prev/Next buttons */}
              <button 
                onClick={() => goToSlide((currentSlide - 1 + sliderImages.length) % sliderImages.length)}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full p-2 transition-all"
                aria-label="Previous slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={() => goToSlide((currentSlide + 1) % sliderImages.length)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full p-2 transition-all"
                aria-label="Next slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="feature-sect py-24 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="feature-title text-3xl font-light text-[#3A4454] mb-6 max-w-3xl">
              Powerful Features
            </h2>
            <p className="feature-desc text-lg text-[#3A4454] opacity-80 max-w-3xl">
              Our platform combines cutting-edge AI technology with intuitive interfaces to provide cardiac specialists with the tools they need for accurate diagnosis and treatment planning.
            </p>
          </div>
          
          <div className="feature-cards grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Real-time Analysis",
                description: "Perform advanced cardiac analysis in real-time with our powerful processing engine."
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Secure Platform",
                description: "HIPAA compliant with enterprise-grade security for all patient data and analysis."
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                ),
                title: "Cloud Integration",
                description: "Seamlessly share results and collaborate with specialists worldwide."
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="bg-[#F8F2E6] p-8 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg border-t-4 border-[#A87C5F]"
              >
                <div className="text-[#5B7B9A] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-medium mb-3 text-[#3A4454]">{feature.title}</h3>
                <p className="text-[#3A4454] opacity-80">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Team Section */}
      <div className="team-sect py-24 px-8 bg-[#FFFCF6]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-light text-center text-gray-800 mb-16">Our Team</h2>
          
          <div className="team-cards grid grid-cols-2 md:grid-cols-5 gap-8">
            {[
              { name: "James Muking", role: "Lead Backend Developer", avatar: "/avatar1.jpg" },
              { name: "Jesmine Ting", role: "Backend Developer", avatar: "/avatar2.jpg" },
              { name: "Clarissa Wong", role: "Backend Developer", avatar: "/avatar3.jpg" },
              { name: "Yee Qian Hui", role: "Frontend Developer", avatar: "/avatar4.jpg" },
              { name: "Zia Tan", role: "Lead Frontend Developer", avatar: "/avatar5.jpg" }
            ].map((member, index) => (
              <div 
                key={index} 
                className="text-center transform transition-all duration-300 hover:scale-105"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full bg-blue-100 overflow-hidden">
                    <img 
                      src={member.avatar} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder-pfp.png";
                      }}
                    />
                  </div>
                </div>
                <h4 className="text-base font-medium mb-1">{member.name}</h4>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="cta-sect py-24 px-8 bg-gradient-to-br from-[#5B7B9A] to-[#3A4454]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-2/3">
              <h2 className="text-3xl font-light mb-6 text-white">Start analyzing cardiac MRIs with AI precision</h2>
              <p className="text-lg opacity-90 mb-8 text-white max-w-2xl">
                Create an account to securely upload and view your cardiac MRI scans using VisHeart's advanced segmentation platform.
              </p>
            </div>
            <div className="md:w-1/3 flex flex-col space-y-4">
              <button className="px-8 py-3 bg-[#A87C5F] text-white rounded-md hover:bg-[#966C52] transition-all duration-300 shadow-lg">
                Create an account
              </button>
              <button className="px-8 py-3 bg-transparent border border-white text-white rounded-md hover:bg-white hover:bg-opacity-10 transition-all duration-300">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;