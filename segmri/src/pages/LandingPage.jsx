import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Images for slider
  const sliderImages = [
    { src: "/image-1.png", alt: "Cardiac MRI Scan", caption: "Advanced Cardiac Analysis", subtitle: "Precision imaging technology" },
    { src: "/image-2.png", alt: "High-Reso Cardiac MRI Scan", caption: "Clinical Excellence", subtitle: "Unmatched diagnostic clarity" },
    { src: "/image-3.png", alt: "Doctor Interface", caption: "Intuitive Workflow", subtitle: "Designed for professionals" }
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Intersection Observer for smooth section animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.animate-section');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-section {
          opacity: 0;
          transform: translateY(30px);
          transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .animate-section.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        
        .hero-loaded {
          animation: fadeInUp 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .floating {
          animation: float 8s ease-in-out infinite;
        }
        
        .card-hover {
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px rgba(91, 123, 154, 0.15);
        }
        
        .minimal-border {
          border: 1px solid rgba(91, 123, 154, 0.2);
          transition: border-color 0.3s ease;
        }
        
        .minimal-border:hover {
          border-color: rgba(91, 123, 154, 0.4);
        }
        
        .video-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }
        
        .overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, 
            rgba(15, 23, 42, 0.3) 0%, 
            rgba(59, 130, 246, 0.1) 50%, 
            rgba(15, 23, 42, 0.4) 100%
          );
          z-index: 1;
        }
        
        .content-overlay {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Hero Section with Background Video */}
      <div className="relative w-full h-screen overflow-hidden">
        {/* Background Video */}
        <video 
          className="video-background"
          autoPlay 
          muted 
          loop 
          playsInline
        >
          <source src="/hero.mp4" type="video/mp4" />
          {/* Fallback gradient background if video fails to load */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20"></div>
        </video>

        {/* Dark overlay for better text readability */}
        <div className="overlay"></div>

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <div className={`max-w-5xl mx-auto ${isLoaded ? 'hero-loaded' : 'opacity-0'}`}>
            {/* Main content with glassmorphism overlay */}
            <div className=" rounded-3xl p-12 mb-12">
              <h1 className="text-8xl md:text-9xl font-extralight tracking-wider text-white mb-12" 
                  style={{ letterSpacing: '0.3em' }}>
                VISHEART
              </h1>
              
              <div className="w-32 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-16"></div>
              
              <p className="text-2xl md:text-3xl font-light text-slate-200 mb-8 leading-relaxed max-w-3xl mx-auto">
                AI-Powered Cardiac Segmentation for Precision Healthcare
              </p>
              
              <p className="text-lg text-slate-300 mb-20 max-w-2xl mx-auto leading-relaxed">
                Advanced technology meets clinical excellence in revolutionary cardiac imaging
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button 
                  onClick={() => scrollToSection('features')}
                  className="group px-10 py-4 bg-white/90 text-slate-800 rounded-lg text-lg font-medium hover:bg-white transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm"
                >
                  <span className="flex items-center justify-center">
                    Explore Technology
                    <svg className="ml-3 w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </button>
                
                <button 
                  onClick={() => scrollToSection('demo')}
                  className="px-10 py-4 border border-white/50 text-white rounded-lg text-lg font-medium hover:border-white hover:bg-white/10 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  View Demo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div 
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 cursor-pointer floating"
          onClick={() => scrollToSection('info')}
        >
          <div className="w-6 h-10 border border-white/50 rounded-full flex justify-center backdrop-blur-sm bg-white/10">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </div>

      {/* Professional Info Section */}
      <div id="info" className="animate-section py-32 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-8">
                <div className="inline-block px-4 py-2 bg-slate-100 rounded-full">
                  <span className="text-slate-600 text-sm font-medium tracking-wider uppercase">Advanced Technology</span>
                </div>
                
                <h2 className="text-5xl font-light text-slate-800 leading-tight">
                  Precision Cardiac
                  <br />
                  <span className="text-blue-800">Imaging Solutions</span>
                </h2>
                
                <div className="w-24 h-1 bg-gradient-to-r from-blue-800 to-amber-600 rounded-full"></div>
              </div>

              <p className="text-xl text-slate-600 leading-relaxed">
                Our VisHeart platform delivers unparalleled accuracy in cardiac segmentation, 
                combining advanced AI algorithms with intuitive clinical workflows to enhance 
                diagnostic precision and patient outcomes.
              </p>

              <div className="space-y-6">
                {[
                  { 
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ),
                    title: "AI-Powered Analysis", 
                    desc: "Advanced machine learning algorithms deliver 95% accuracy in segmentation"
                  },
                  { 
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                    title: "Real-Time Processing", 
                    desc: "Instant analysis and results for improved clinical efficiency"
                  },
                  { 
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: "Cloud Integration", 
                    desc: "Seamless collaboration and data sharing across healthcare networks"
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start space-x-6 p-6 bg-slate-50 rounded-xl card-hover minimal-border">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-800 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">{feature.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            <Link 
              to="/team" 
              className="group inline-flex items-center justify-center px-8 py-4 bg-blue-800 text-white rounded-lg font-medium hover:bg-blue-900 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Learn More
              <svg className="ml-2 w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            </div>

            <div className="relative floating">
              <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl minimal-border">
                {sliderImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-1000 ${
                      index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    }`}
                  >
                    <img 
                      src={image.src} 
                      alt={image.alt} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8 right-8">
                      <h3 className="text-2xl font-semibold text-white mb-2">{image.caption}</h3>
                      <p className="text-slate-200">{image.subtitle}</p>
                    </div>
                  </div>
                ))}

                <div className="absolute top-6 right-6 flex space-x-3">
                  {sliderImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? 'bg-white scale-125' 
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Elegant Features Section */}
      <div id="features" className="animate-section py-32 px-8 bg-gradient-to-br from-blue-50/50 to-amber-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block px-6 py-3 bg-white rounded-full shadow-sm mb-8">
              <span className="text-slate-600 font-medium tracking-wider uppercase text-sm">Core Capabilities</span>
            </div>
            
            <h2 className="text-5xl font-light text-slate-800 mb-8">
              Advanced AI Technology
            </h2>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Experience the future of cardiac diagnostics with precision-engineered AI solutions 
              designed for modern healthcare professionals
            </p>
          </div>

          <div className="flex flex-col items-center space-y-8">
            <div id="demo" className="relative floating">
              <div className="relative w-full h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden minimal-border">
                <img 
                  src="/image-1.png" 
                  alt="Demo Interface" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                    <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white text-center font-medium">Interactive Technology Demo</p>
                </div>
              </div>
            </div>

            <Link to="/features" className="group px-8 py-4 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl">
              <span className="flex items-center justify-center">
                Discover More Features
                <svg className="ml-3 w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Professional CTA Section */}
      <div className="animate-section py-32 px-8 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-light text-white mb-8 leading-tight">
            Transform Your
            <br />
            <span className="text-amber-300">Cardiac Practice</span>
          </h2>
          
          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            Start analyzing cardiac MRIs with AI precision today
          </p>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16 leading-relaxed">
            Create an account to securely upload and view your cardiac MRI scans using VisHeart's advanced segmentation platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link to="/register" className="group px-12 py-4 bg-amber-600 text-white rounded-xl text-lg font-semibold hover:bg-amber-700 transition-all duration-300 shadow-xl hover:scale-105">
              <span className="flex items-center justify-center">
                Create an account
                <svg className="ml-3 w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
            
            {/* <button className="px-12 py-4 border border-slate-400 text-slate-300 rounded-xl text-lg font-semibold hover:bg-slate-700 hover:border-slate-300 transition-all duration-300 hover:scale-105"> */}
              {/* Learn more */}
            {/* </button> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;