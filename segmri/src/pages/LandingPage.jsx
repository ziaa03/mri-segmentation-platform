import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BrushMaskCanvas from '../pages/Brush';

  const LandingPage = () => {
    // State for image slider
    const [currentSlide, setCurrentSlide] = useState(0);

    const sampleImage = '/image-1.png';
    
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

    // Feature hover animation
      const [activeFeature, setActiveFeature] = useState(null);

    return (
      <>
        {/* Hero Section with Background Video */}
        <motion.div 
          style={{ opacity: 1, scale: 1}}
          className="hero-section relative w-full h-screen overflow-hidden"
        >
          {/* Background Video with Parallax Effect */}
          <div className="absolute inset-0 w-full h-full">
            <div className="absolute inset-0 bg-[#3A4454] opacity-30 z-10"></div>
            <video 
              className="w-full h-full object-cover"
              autoPlay 
              loop 
              muted 
              playsInline
            >
              <source src="/heart.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          
          {/* Animated Content */}
          <div className="hero-content relative z-20 h-full flex flex-col items-center justify-center text-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <motion.h1 
                initial={{ letterSpacing: "0.5em" }}
                animate={{ letterSpacing: "0.2em" }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="hero-header text-7xl md:text-6xl font-light tracking-wider text-white m-0 drop-shadow-lg"
              >
                Visheart
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="hero-description text-xl md:text-2xl font-light text-white mt-6 mb-12 max-w-2xl mx-auto"
              >
                AI-Powered Cardiac Segmentation for Precision Healthcare
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
              >
                <a href="#info-section" 
                  className="hero-button px-8 py-4 bg-transparent border-2 border-white text-white rounded-full hover:bg-white hover:text-blue-900 transition-all duration-300 transform hover:-translate-y-1 scroll-smooth inline-flex items-center group"
                >
                  Explore
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transition-transform duration-300 group-hover:translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* <div> */}
      {/* <h1>Segmentation Mask Test</h1> */}
      {/* <BrushMaskCanvas imageSrc={sampleImage} /> */}
    {/* </div> */}
        
        {/* Information Section with Image Slider */}
        <div id="info-section" className="info-section py-24 px-8 bg-[#FFFCF6]">
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
                  <Link to="/about-us"
                    className="px-6 py-3 bg-[#5B7B9A] hover:bg-[#4A6A89] text-white rounded-md transition-all duration-300 shadow-md"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
              
              {/* Enhanced Image Slider */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="w-full lg:w-1/2 relative overflow-hidden rounded-xl shadow-2xl h-[450px]"
            >
              {sliderImages.map((image, index) => (
                <AnimatePresence key={index}>
                  {index === currentSlide && (
                    <motion.div
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0"
                    >
                      <img 
                        src={image.src} 
                        alt={image.alt} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-900 to-transparent p-8">
                        <h3 className="text-2xl font-medium text-white mb-2">{image.title}</h3>
                        <p className="text-white text-lg opacity-90">{image.description}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
              
              {/* Improved slider controls */}
              <div className="absolute bottom-4 right-4 flex space-x-3">
                {sliderImages.map((_, index) => (
                  <motion.button
                    key={index}
                    onClick={() => goToSlide(index)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentSlide ? 'bg-white scale-125' : 'bg-white bg-opacity-50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              {/* Prev/Next buttons */}
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.5)" }}
                onClick={() => goToSlide((currentSlide - 1 + sliderImages.length) % sliderImages.length)}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white rounded-full p-3 transition-all"
                aria-label="Previous slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.5)" }}
                onClick={() => goToSlide((currentSlide + 1) % sliderImages.length)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 text-white rounded-full p-3 transition-all"
                aria-label="Next slide"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
        
        {/* Features Section */}
        <div className="feature-sect py-24 px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center text-center mb-24"
                      >
                        <h2 className="feature-title text-4xl font-light text-[#3A4454] mb-6 max-w-3xl">
                          Precision Cardiac Tools
                        </h2>
                        <p className="feature-desc text-xl text-[#3A4454] opacity-80 max-w-3xl">
                          Our platform combines cutting-edge AI technology with intuitive interfaces to provide cardiac specialists with the tools they need for accurate diagnosis and treatment planning.
                        </p>
                      </motion.div>
            
            <div className="feature-cards grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: "Automated Cardiac Segmentation",
                  description: "Leverage advanced AI algorithms to automatically segment cardiac MRI scans with precision and accuracy."
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: "MRI Image Upload and Analysis",
                  description: "Easily upload and analyze cardiac MRI images on our secure platform, enabling seamless collaboration and detailed insights for specialists."
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  ),
                  title: "Real-Time Result Viewing",
                  description: "Access and view segmentation results in real-time, empowering specialists to make informed decisions quickly and efficiently."
                }
              ].map((feature, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 30 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.2, duration: 0.8 }}
                              viewport={{ once: true }}
                              whileHover={{ y: -10, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                              onHoverStart={() => setActiveFeature(index)}
                              onHoverEnd={() => setActiveFeature(null)}
                              className="bg-[#F8F2E6] p-8 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg border-t-4 border-[#A87C5F]"
                            >
                              <div className={`text-[#5B7B9A] mb-6 transition-all duration-300 ${activeFeature === index ? 'scale-110' : ''}`}>{feature.icon}</div>
                              <h3 className="text-2xl font-medium mb-4 text-[#3A4454]">{feature.title}</h3>
                              <p className="text-[#3A4454] text-lg opacity-80">{feature.description}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
        
        {/* Team Section */}
        <div className="team-sect py-24 px-8 bg-[#FFFCF6]">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="text-4xl font-light text-center text-gray-800 mb-16"
                      >
                        Our Expert Team
                      </motion.h2>
            
            <div className="team-cards grid grid-cols-2 md:grid-cols-5 gap-8">
                        {[
                          { name: "James Muking", role: "Lead Backend Developer", avatar: "/pfp-james.jpg" },
                          { name: "Jesmine Ting", role: "Backend Developer", avatar: "/pfp-jes.jpg" },
                          { name: "Clarissa Wong", role: "Backend Developer", avatar: "/pfp-cla.jpg" },
                          { name: "Yee Qian Hui", role: "Frontend Developer", avatar: "/pfp-qh.jpg" },
                          { name: "Zia Tan", role: "Lead Frontend Developer", avatar: "/pfp-zia.jpg" }
                        ].map((member, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -10 }}
                            className="text-center"
                          >
                            <div className="flex justify-center mb-4">
                              <motion.div 
                                whileHover={{ scale: 1.1 }}
                                className="w-32 h-32 rounded-full p-1 shadow-lg overflow-hidden"
                              >
                                <img 
                                  src={member.avatar} 
                                  alt={member.name}
                                  className="w-full h-full object-cover rounded-full"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/placeholder-pfp.png";
                                  }}
                                />
                              </motion.div>
                            </div>
                            <h4 className="text-lg font-medium mb-1 text-gray-500">{member.name}</h4>
                            <p className="text-gray-500">{member.role}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

        {/* Interactive Demo Section */}
              <div className="demo-section py-32 px-8 bg-gradient-to-r bg-[#5B7B9A]">
                <div className="max-w-6xl mx-auto">
                  <div className="flex flex-col md:flex-row items-center gap-16">
                    <motion.div 
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8 }}
                      viewport={{ once: true }}
                      className="w-full md:w-1/2"
                    >
                      <h2 className="text-4xl font-light text-white mb-8">Experience the Power of AI Visualization</h2>
                      <p className="text-xl text-blue-100 mb-8">
                        Our interactive platform transforms complex cardiac MRI data into clear, actionable insights. Witness the power of VisHeart's advanced segmentation technology.
                      </p>
                      <div className="flex flex-wrap gap-6 mb-8">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full flex items-center justify-center mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-white">Process in seconds</span>
                        </div>
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full flex items-center justify-center mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-white">90% accuracy rate</span>
                        </div>
                      </div>
                      <Link to="/cardiac-analysis">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-8 py-4 bg-white text-blue-900 rounded-lg shadow-lg hover:bg-blue-50 transition-all duration-300 text-lg font-medium flex items-center"
                        >
                          Try Now
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </motion.button>
                      </Link>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8 }}
                      viewport={{ once: true }}
                      className="w-full md:w-1/2"
                    >
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-300">
                        <img 
                          src="/image-1.png" 
                          alt="VisHeart Demo Interface" 
                          className="w-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/800/500";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div 
                            whileHover={{ scale: 1.1 }}
                            className="h-20 w-20 rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </motion.div>
                        </div>
                      </div>
                      <div className="mt-6 text-center">
                        <p className="text-blue-100 text-sm">Watch our 2-minute demo video</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
        
              {/* FAQ Section */}
              <div className="faq-section py-24 px-8 bg-white">
                <div className="max-w-4xl mx-auto">
                  <motion.h2 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-4xl font-light text-center text-blue-900 mb-16"
                  >
                    Frequently Asked Questions
                  </motion.h2>
                  
                  <div className="space-y-6">
                    {[
                      {
                        question: "How accurate is VisHeart's cardiac segmentation?",
                        answer: "VisHeart's AI algorithms achieve up to 90% accuracy in cardiac segmentation, validated against expert manual segmentation in multiple clinical studies."
                      },
                      {
                        question: "Is my patients' data secure on your platform?",
                        answer: "Absolutely. VisHeart employs end-to-end encryption, HIPAA compliance protocols, and secure cloud infrastructure to ensure all patient data remains private and protected."
                      },
                      {
                        question: "Can VisHeart integrate with our existing hospital systems?",
                        answer: "Yes, VisHeart is designed with comprehensive API connectivity and supports major healthcare system integrations including standard DICOM/PACS systems."
                      }
                    ].map((faq, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        viewport={{ once: true }}
                        className="bg-blue-50 rounded-xl overflow-hidden shadow-md"
                      >
                        <div className="p-6">
                          <h3 className="text-xl font-medium text-blue-900 mb-3">{faq.question}</h3>
                          <p className="text-blue-800">{faq.answer}</p>
                        </div>
                      </motion.div>
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
              <Link to="/register" className="block">
                <button className="w-full px-8 py-3 bg-[#A87C5F] text-white rounded-md hover:bg-[#966C52] transition-all duration-300 shadow-lg">
                  Create an account
                </button>
              </Link>
              <Link to="/about-us" className="block">
                <button className="w-full px-8 py-3 bg-transparent border border-white text-white rounded-md hover:bg-white hover:bg-opacity-10 transition-all duration-300">
                  Learn more
                </button>
              </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  export default LandingPage;                                                                   