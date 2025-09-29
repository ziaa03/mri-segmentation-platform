import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";

// image slider data
const imageslider = [
    {
      text: "Authentication",
      image: "./authentication.jpeg",
      description: "Secure authentication system"
    },
    {
      text: "Automatic Cardiac Segmentation (LVC, MYO, RV)",
      image: "./view_result.jpeg",
      description: "AI-powered segmentation with 90% clinical accuracy"
    },
    {
      text: "Intuitive User Interface",
      image: "./ui.jpeg",
      description: "Medical-grade interface designed for professionals"
    },
    {
      text: "MRI Image Upload",
      image: "./image_upload.jpg",
      description: "Secure cloud storage and processing"
    },
    {
      text: "Real-time Result Viewing",
      image: "./realtimeseg.jpeg",
      description: "Instant visualization with collaboration tools"
    }
];

const fadeIn = (direction, delay) => {
  return {
    hidden: {
      y: direction === "up" ? 80 : direction === "down" ? -80 : 0,
      opacity: 0,
      x: direction === "left" ? 80 : direction === "right" ? -80 : 0,
    },
    show: {
      y: 0,
      x: 0,
      opacity: 1,
      transition: {
        type: "tween",
        duration: 1.2,
        delay: delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      }
    }
  };
};

const FeaturesPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(2);
  const [isVisible, setIsVisible] = useState({});

  // Enhanced features data
  const features = [
    {
      id: 1,
      title: "AI-Driven Segmentation Pipeline",
      shortDesc: "GPU-accelerated inference with YOLO + MedSAM",
      longDesc: "Leverages cloud-based GPU servers running YOLO and MedSAM models for automated segmentation of cardiac structures. Supports manual corrections, bounding-box inputs, and annotation saving, ensuring accurate results validated through rigorous testing. VisHeart precisely delineates the left ventricle, right ventricle, and myocardium in under 60 seconds.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      benefits: [
        "GPU-powered inference with optimized YOLO + MedSAM",
        "Supports manual corrections and annotations",
        "Job queueing for concurrent segmentation requests",
        "End-to-end workflow from upload to visualization"
      ],
      metrics: { accuracy: "Validated", speed: "<60s", views: "Concurrent" },
      demoImage: "./view_result.jpeg"
    },
    {
      id: 2,
      title: "Medical Image Management",
      shortDesc: "Upload, manage and export imaging data",
      longDesc: "Securely upload and organize medical imaging files with full support for NIfTI formats. Provides file deletion, metadata handling, cascade cleanup, and export in multiple standardized formats.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {/* Viewer frame */}
          <rect x="3" y="3" width="18" height="14" rx="2" strokeWidth={1.5} />

          {/* Corner L-markers */}
          <path
            d="M5 7V5h2M19 7V5h-2M5 13v2h2M19 13v2h-2"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair grid */}
          <path
            d="M12 5v10M5 10h14"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".35"
          />

          {/* Heart / segmentation contour */}
          <path
            d="M11.9 8.1c-.7-1.1-2.4-1.3-3.4-.3-1 .9-.9 2.6.2 3.5l3.3 2.7 3.3-2.7c1.1-.9 1.2-2.6.2-3.5-1-.9-2.6-.8-3.4.3Z"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom toolbar */}
          <rect
            x="3"
            y="18"
            width="18"
            height="3"
            rx="1.5"
            strokeWidth={1.2}
          />
        </svg>
      ),
      benefits: [
        "Drag-and-drop upload with progress feedback",
        "Cascade deletion prevents orphaned data",
        "Export results in multiple formats",
        "AWS S3 integration for scalable storage"
      ],
      metrics: { storage: "S3-backed", formats: "NIfTI", export: "Multi-format" },
      demoImage: "./image_upload.jpg"
    },
    {
      id: 3,
      title: "Secure Authentication & User Roles",
      shortDesc: "Robust access control with Redis sessions",
      longDesc: "Implements secure user authentication with support for guest, user, and admin roles. Features Redis session storage, role-based access controls, and integration with Passport.js for industry-standard session management.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      benefits: [
        "Role-based access (Guest, User, Admin)",
        "Persistent Redis-backed sessions",
        "Secure login and registration",
        "Guest login mode supported"
      ],
      metrics: { roles: "3", security: "Redis + Passport", compliance: "Best practices" },
      demoImage: "./realtimeseg.jpeg"
    },
    {
      id: 4,
      title: "Interactive Visualization Tools",
      shortDesc: "Advanced 2D/3D visualization and editing",
      longDesc: "Intuitive frontend tools for annotating, editing, and visualizing segmentation results. Supports distinction between AI-generated and manually edited masks, annotation saving, and exporting results with a polished medical-grade interface.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      benefits: [
        "AI vs manual mask distinction",
        "Annotation and correction tools",
        "Save and export functionality",
        "Responsive, medical-grade UI"
      ],
      metrics: { latency: "<100ms", views: "2D/3D", usability: "High" },
      demoImage: "./ui.jpeg"
    },
    {
      id: 5,
      title: "Scalable Cloud Deployment",
      shortDesc: "Dockerized AWS deployment with auto-scaling",
      longDesc:
        "Fully deployed on AWS using Docker, EC2, ECR, and S3. Features Application Load Balancer, Auto Scaling Groups, Redis (ElastiCache), Route 53, and HTTPS with SSL/TLS, ensuring enterprise-grade reliability, scalability, and security.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      benefits: [
        "Dockerized Node.js + FastAPI servers",
        "AWS EC2 with Auto Scaling & ALB",
        "Secure HTTPS with TLS",
        "99.9% uptime deployment verified"
      ],
      metrics: { uptime: "99.9%", infra: "AWS", scaling: "Auto" },
      demoImage: "./cloud.png"
  }
  ];

  const technicalSpecs = [
    { label: "Processing Speed", value: "< 60 seconds per scan", icon: "⚡" },
    { label: "AI Models", value: "YOLO + MedSAM (TensorRT optimized)", icon: "🎯" },
    { label: "Session Management", value: "Redis-backed authentication", icon: "🔒" },
    { label: "Data Handling", value: "NIfTI with S3 storage", icon: "📁" },
    { label: "Deployment", value: "Dockerized on AWS (EC2, ALB, ASG)", icon: "☁️" },
    { label: "API Access", value: "Documented RESTful APIs", icon: "🔌" }
  ];

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % imageslider.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fadeInVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFCF6] to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-32 px-8" style={{ zIndex: 1 }}>
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('./cardiac-ai.jpeg')",
            zIndex: -2
          }}
        >
          {/* Dark overlay for text readability */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/100 via-black/50 to-black/90"
            style={{ zIndex: -1 }}
          ></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="max-w-7xl mx-auto"
        >
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Content */}
            <div className="lg:w-1/2 text-center lg:text-left">
              <motion.img 
                src="./visheart_line.png" 
                alt="VisHeart Logo" 
                className="w-80 h-auto mb-8 mx-auto lg:mx-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
              <h1 className="text-6xl md:text-7xl font-light text-white mb-6 tracking-wide">
                Revolutionary
                <span className="block text-[#FDBA74]">Cardiac AI</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl leading-relaxed">
                Transform cardiac MRI analysis with AI-powered precision, real-time collaboration, 
                and enterprise-grade security - all in one intelligent platform.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-20 -right-20 w-96 h-96 bg-[#FDBA74] rounded-full mix-blend-multiply filter blur-3xl opacity-20"
            animate={{ 
              x: [0, 50, 0], 
              y: [0, -30, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#5B7B9A] rounded-full mix-blend-multiply filter blur-3xl opacity-20"
            animate={{ 
              x: [0, -40, 0], 
              y: [0, 20, 0],
              scale: [1.2, 1, 1.2]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
      </div>

      {/* Scrolling Feature Showcase with Swiper */}
<div className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#5B7B9A] to-[#3A4454] overflow-hidden px-4">
  <motion.div
    variants={fadeIn("up", 0.2)}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.7 }}
    className="text-center max-w-3xl mb-16"
  >
    <h2 className="text-4xl md:text-5xl text-white mb-6 font-light">
      Explore Our Features
    </h2>
    <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
      Discover what makes our platform unique. Innovative design meets exceptional functionality — tailored just for you.
    </p>
  </motion.div>

  {/* Swiper with custom card design */}
  <Swiper
    effect="coverflow"
    grabCursor={true}
    centeredSlides={true}
    slidesPerView={"auto"}
    initialSlide={2}
    loop={false}
    modules={[EffectCoverflow]}
    coverflowEffect={{
      rotate: 0,
      stretch: 0,
      depth: 100,
      modifier: 2,
      slideShadows: true,
    }}
    className="w-full py-12"
  >
    {imageslider.map((item, index) => (
      <SwiperSlide
        key={index}
        className="w-[320px] sm:w-[350px] bg-[#c1c3c4] rounded-xl shadow-2xl overflow-hidden swiper-slide-custom"
      >
        {/* Card design from 2nd snippet */}
        <div className="w-full h-full flex flex-col">
          <div className="relative w-full h-64 rounded-t-xl overflow-hidden">
            <img
              src={item.image}
              alt={item.text}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center px-4 text-center">
              <p className="text-white text-2xl font-bold">{item.text}</p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-[#3A4454]/70 text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>
      </SwiperSlide>
    ))}
  </Swiper>

  {/* Blur + scale effect like in first snippet */}
  <style>
    {`
      .swiper-slide {
        filter: blur(3px);
        transform: scale(0.9);
        transition: all 0.3s ease-in-out;
      }
      .swiper-slide.swiper-slide-active {
        filter: none;
        transform: scale(1);
      }
    `}
  </style>
</div>

      
      {/* Interactive Feature Showcase - Enhanced */}
      <div id="features" data-animate className="py-24 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            variants={fadeInVariants}
            initial="hidden"
            animate={isVisible.features ? "visible" : "hidden"}
          >
            <h2 className="text-5xl md:text-6xl font-light text-[#3A4454] mb-6">Advanced Features</h2>
            <p className="text-xl text-[#3A4454]/80 max-w-3xl mx-auto">
              Discover the cutting-edge capabilities that make VisHeart the premier choice for cardiac MRI analysis
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Feature Navigation - Enhanced */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    className={`group p-6 rounded-xl cursor-pointer transition-all duration-500 border-2 ${
                      activeFeature === index 
                        ? 'bg-gradient-to-r from-[#5B7B9A] to-[#3A4454] text-white shadow-2xl border-transparent transform scale-105' 
                        : 'bg-white text-[#3A4454] hover:bg-[#F8F2E6] shadow-lg border-gray-200 hover:border-[#FDBA74] hover:shadow-xl'
                    }`}
                    onClick={() => setActiveFeature(index)}
                    whileHover={{ x: activeFeature === index ? 0 : 5 }}
                    onHoverStart={() => setHoveredCard(index)}
                    onHoverEnd={() => setHoveredCard(null)}
                  >
                    <div className="flex items-center mb-4">
                      <div className={`mr-4 transition-all duration-300 ${
                        activeFeature === index ? 'text-[#FDBA74] scale-110' : 'text-[#5B7B9A] group-hover:text-[#3A4454] group-hover:scale-105'
                      }`}>
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-[#5B7B9A]">
                      {feature.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${
                      activeFeature === index ? 'text-blue-100' : 'text-[#3A4454]/70 group-hover:text-[#3A4454]'
                    }`}>
                      {feature.shortDesc}
                    </p>
                    
                    {/* Metrics Preview */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(feature.metrics).map(([key, value]) => (
                        <span key={key} className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activeFeature === index 
                            ? 'bg-white/20 text-white' 
                            : 'bg-[#FDBA74]/20 text-[#3A4454]'
                        }`}>
                          {value}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Feature Display - Enhanced */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, x: 30, rotateY: -10 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -30, rotateY: 10 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl overflow-hidden border border-gray-200"
                >
                  {/* Feature Image/Demo */}
                  <div className="relative h-80 bg-gradient-to-br from-[#5B7B9A] via-[#3A4454] to-[#091021] overflow-hidden">
                    <img 
                      src={features[activeFeature].demoImage} 
                      alt={features[activeFeature].title}
                      className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-6 right-6">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-white">
                        {features[activeFeature].icon}
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-4xl font-light text-[#3A4454] mb-4">
                        {features[activeFeature].title}
                      </h3>
                      <p className="text-lg text-[#3A4454]/80 mb-8 leading-relaxed">
                        {features[activeFeature].longDesc}
                      </p>
                    </motion.div>

                    {/* Enhanced Benefits Grid */}
                    <motion.div 
                      className="mb-8"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h4 className="text-xl font-bold text-[#5B7B9A] mb-6 flex items-center">
                        <span className="w-2 h-8 bg-[#FDBA74] rounded-full mr-3"></span>
                        Key Advantages
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {features[activeFeature].benefits.map((benefit, index) => (
                          <motion.div 
                            key={index}
                            className="flex items-start group p-3 rounded-lg hover:bg-[#F8F2E6] transition-all duration-300"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                          >
                            <div className="w-6 h-6 bg-gradient-to-r from-[#FDBA74] to-[#5B7B9A] rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-[#3A4454] font-medium group-hover:text-[#5B7B9A] transition-colors duration-300">
                              {benefit}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Technical Specifications */}
      <div id="specs" data-animate className="py-24 px-8 bg-gradient-to-br from-[#F8F2E6] via-white to-[#F9EDD4]">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            variants={fadeInVariants}
            initial="hidden"
            animate={isVisible.specs ? "visible" : "hidden"}
          >
            <h2 className="text-5xl md:text-6xl font-light text-[#3A4454] mb-6">
              Technical Excellence
            </h2>
            <p className="text-xl text-[#3A4454]/80 max-w-3xl mx-auto">
              Built on enterprise-grade infrastructure with industry-leading performance metrics 
              and cutting-edge technology standards.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {technicalSpecs.map((spec, index) => (
              <motion.div
                key={index}
                className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-[#FDBA74] relative overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible.specs ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FDBA74]/5 to-[#5B7B9A]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {spec.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#5B7B9A] mb-3 group-hover:text-[#3A4454] transition-colors duration-300">
                    {spec.label}
                  </h3>
                  <p className="text-3xl font-light text-[#3A4454] group-hover:text-[#5B7B9A] transition-colors duration-300">
                    {spec.value}
                  </p>
                </div>

                {/* Hover Effect Lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FDBA74] to-[#5B7B9A] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </motion.div>
            ))}
          </div>

          {/* Performance Metrics Dashboard */}
          <motion.div 
            className="mt-16 bg-white rounded-3xl p-8 shadow-2xl border border-gray-100"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isVisible.specs ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <h3 className="text-3xl font-light text-[#3A4454] mb-8 text-center">
              Real-Time Performance Dashboard
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="2"
                    />
                    <motion.path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#FDBA74"
                      strokeWidth="2"
                      strokeDasharray="90, 100"
                      initial={{ strokeDasharray: "0, 100" }}
                      animate={isVisible.specs ? { strokeDasharray: "90, 100" } : { strokeDasharray: "0, 100" }}
                      transition={{ delay: 1.2, duration: 1.5 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#3A4454]">90%</span>
                  </div>
                </div>
                <p className="text-[#5B7B9A] font-semibold">Accuracy Rate</p>
              </div>

              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="2"
                    />
                    <motion.path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#5B7B9A"
                      strokeWidth="2"
                      strokeDasharray="75, 100"
                      initial={{ strokeDasharray: "0, 100" }}
                      animate={isVisible.specs ? { strokeDasharray: "75, 100" } : { strokeDasharray: "0, 100" }}
                      transition={{ delay: 1.4, duration: 1.5 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#3A4454]">55s</span>
                  </div>
                </div>
                <p className="text-[#5B7B9A] font-semibold">Avg Processing</p>
              </div>

              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="2"
                    />
                    <motion.path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#3A4454"
                      strokeWidth="2"
                      strokeDasharray="99, 100"
                      initial={{ strokeDasharray: "0, 100" }}
                      animate={isVisible.specs ? { strokeDasharray: "99, 100" } : { strokeDasharray: "0, 100" }}
                      transition={{ delay: 1.6, duration: 1.5 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[#3A4454]">99.9%</span>
                  </div>
                </div>
                <p className="text-[#5B7B9A] font-semibold">Uptime</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="py-32 px-8 bg-gradient-to-br from-[#091021] via-[#3A4454] to-[#5B7B9A] relative overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <h2 className="text-6xl md:text-7xl font-light text-white mb-8 tracking-wide">
            Ready to Transform
            <span className="block text-[#FDBA74]">Cardiac Analysis?</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
            Join leading medical institutions worldwide in revolutionizing cardiac imaging 
            with AI-powered precision and collaborative excellence.
          </p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
          </motion.div>

          <motion.div 
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <div className="p-6">
              <div className="text-3xl font-bold text-[#FDBA74] mb-2">24/7</div>
              <div className="text-white/80">Expert Support</div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-[#FDBA74] mb-2">Global</div>
              <div className="text-white/80">Collaboration Ready</div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-[#FDBA74] mb-2">1-Click</div>
              <div className="text-white/80">Upload & Analyze</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Enhanced Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-40 -right-40 w-80 h-80 bg-[#FDBA74] rounded-full mix-blend-multiply filter blur-3xl opacity-20"
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{ 
              duration: 12, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#5B7B9A] rounded-full mix-blend-multiply filter blur-3xl opacity-20"
            animate={{ 
              scale: [1.2, 1, 1.2],
              x: [0, -40, 0],
              y: [0, 30, 0]
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 3
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;