import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TeamPage = () => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isVisible, setIsVisible] = useState({});

  // Fix: Set the animation state when component mounts
  useEffect(() => {
    setIsVisible({ about: true });
  }, []);

  const teamMembers = [
    {
      id: 1,
      name: "James Muking",
      role: "Lead Backend Developer",
      department: "engineering",
      avatar: "/pfp-james.jpg",
      bio: "James handles GPU acceleration, model inference logic, and the integration of AI models into the backend system for efficient medical image processing.",
      expertise: ["Python", "Node.js", "Medical Data Processing", "Model Optimization"],
      education: "B.CS. AI and Data Science",
      projects: [
        "Implemented GPU-based inference pipeline for cardiac MRI segmentation",
        "Optimized segmentation performance for MRI datasets"
      ],
      social: {
        gmail: "mailto:jamesmuking@gmail.com",
      },
      quote: "Technology is only powerful when it makes life easier."
    },
    {
      id: 2,
      name: "Jesmine Ting",
      role: "Backend Developer & Cloud Engineer",
      department: "engineering",
      avatar: "/pfp-jes.jpg",
      bio: "Jesmine manages the cloud infrastructure for VisHeart, handling architecture design, dockerization, deployment, scalability, and monitoring through AWS. She ensures the system runs securely and efficiently across all cloud services.",
      expertise: ["AWS", "Docker", "Cloud Architecture", "API Design" ],
      education: "B.CS. AI",
      projects: [
        "Deployed containerized backend and frontend services to cloud infrastructure",
        "Ensured data security and compliance in cloud-based operations",
        "Developed backend endpoints to support system integration",
      ],
      social: {
        gmail: "mailto:tingziching@gmail.com",
      },
      quote: "Architecting for scalability, deploying for reliability."
    },
    {
      id: 3,
      name: "Clarissa Wong",
      role: "Backend Developer",
      department: "engineering",
      avatar: "/pfp-cla.jpg",
      bio: "Clarissa focuses on designing APIs, managing databases, and ensuring smooth communication between the frontend and AI inference services.",
      expertise: ["Python", "Data Pipeline", "API Design", "Data Modeling"],
      education: "B.CS. AI",
      projects: [
        "Developed API endpoints for model inference and file handling",
        "Designed and managed database for MRI data storage",
      ],
      social: {
        gmail: "mailto:wongclarissa25@gmail.com",
      },
      quote: "Perfection isn’t the goal, clarity is."
    },
    {
      id: 4,
      name: "Yee Qian Hui",
      role: "Frontend Developer",
      department: "design",
      avatar: "/pfp-qh.jpg",
      bio: "Qian Hui specializes in designing intuitive and responsive interfaces, ensuring seamless interaction and accessibility across the VisHeart platform.",
      expertise: ["React", "UI/UX Design", "Tailwind CSS", "Recharts"],
      education: "B.CS. Cyberscurity",
      projects: [
        "Developed AWS monitoring dashboard",
        "Created responsive layouts for VisHeart platform",
        "Implemented responsive and secure user interfaces"
      ],
      social: {
        gmail: "mailto:qianhuiyee@gmail.com",
      },
      quote: "Small details make the biggest difference."
    },
    {
      id: 5,
      name: "Zia Tan",
      role: "Lead Frontend Developer",
      department: "design",
      avatar: "/pfp-zia.jpg",
      bio: "Zia leads our frontend development efforts with a focus on performance and user experience.",
      expertise: ["React", "Frontend Architecture", "Performance Optimization", "UI/UX"],
      education: "B.CS. AI and Data Science",
      projects: [
        "Led the complete redesign of VisHeart's user interface",
        "Established frontend development best practices and standards"
      ],
      social: {
       gmail: "mailto:qianhuiyee@gmail.com",
      },
      quote: "In healthcare technology, every pixel and every interaction can impact a life."
    }
  ];

  const departments = [
    { id: 'all', name: 'All Team', count: teamMembers.length },
    { id: 'engineering', name: 'Engineering', count: teamMembers.filter(m => m.department === 'engineering').length },
    { id: 'design', name: 'Design', count: teamMembers.filter(m => m.department === 'design').length }
  ];

  const filteredMembers = activeTab === 'all' 
    ? teamMembers 
    : teamMembers.filter(member => member.department === activeTab);

  const companyValues = [
    {
      title: "Patient-Centered Innovation",
      description: "Every feature we build starts with how it can improve patient outcomes and support healthcare professionals.",
      icon: "❤️"
    },
    {
      title: "Scientific Rigor",
      description: "We apply the highest standards of scientific validation to our AI models and clinical tools.",
      icon: "🔬"
    },
    {
      title: "Collaborative Excellence",
      description: "Our diverse team combines technical expertise with deep healthcare domain knowledge.",
      icon: "🤝"
    },
    {
      title: "Continuous Learning",
      description: "We stay at the forefront of AI and medical technology through ongoing research and education.",
      icon: "📚"
    }
  ];

  const fadeInVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="team-page min-h-screen bg-gradient-to-br from-[#FFFCF6] to-white">
      {/* Hero Section - Fixed */}
      <div data-animate className="relative overflow-hidden bg-gradient-to-r from-[#5B7B9A] to-[#3A4454] py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            variants={fadeInVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-light text-white mb-8">About VisHeart</h2>
            <p className="text-xl text-white/90 max-w-4xl mx-auto leading-relaxed">
              Our cardiac component segmentation platform revolutionizes medical imaging by integrating advanced AI 
              with intuitive design. We enable accurate identification of key cardiac structures including the left 
              ventricle cavity, myocardium, and right ventricle through a secure, collaborative environment tailored 
              for medical professionals.
            </p>
          </motion.div>

          {/* Mission & Vision Cards */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <motion.div 
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-[#FDBA74]/20"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-6">
                <h3 className="text-2xl font-bold text-[#3A4454]">Our Mission</h3>
              </div>
              <p className="text-[#343231] leading-relaxed">
                Enhance efficiency and accessibility in cardiac imaging through AI-powered analysis. We support clinical 
                decision-making, accelerate research workflows, and contribute to better patient outcomes while ensuring 
                secure, user-friendly tools for healthcare professionals.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-[#5B7B9A]/20"
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-6">
                <h3 className="text-2xl font-bold text-[#3A4454]">Our Vision</h3>
              </div>
              <p className="text-[#343231] leading-relaxed">
                Bridge cutting-edge technology with practical clinical use through robust, scalable digital tools. 
                We strive to transform cardiac image analysis into an intelligent, standardized practice adopted 
                worldwide in hospitals and academic environments.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Leadership Section */}
      <div className='py-16 px-6 md:px-16 xl:px-72 bg-[#fdf8f3] flex flex-col items-center'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          className="text-center max-w-4xl"
        >
          <h2 className="text-4xl text-[#74342B] mb-6">Leadership Team</h2>
          <p className="text-[#343231] text-lg mb-12">
            Meet the minds shaping our direction, championing innovation, and delivering impact with purpose.
          </p>
        </motion.div>
          
        <div className='grid grid-cols-1 md:grid-cols-2 gap-12 justify-center mb-16'>
          {[
            {
              name: "Kathy Wong Hui Ying",
              role: "Lead",
              image: "./kathy.jpg"
            },
            {
              name: "Ts. Assoc. Prof. Dr. Miko Chang May Lee",
              role: "Advisor",
              image: "./miko.jpeg"
            },
          ].map((person, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true, amount: 0.6 }}
              className='bg-white rounded-xl shadow-xl overflow-hidden transform hover:scale-105 transition duration-300 flex flex-col items-center'
            >
              <img
                src={person.image}
                alt={person.name}
                className='w-32 h-32 mt-6 rounded-full object-cover border-4 border-[#fdf8f3]'
              />
              <div className='p-6 text-center'>
                <h3 className='text-lg font-semibold text-[#1f1f1f]'>{person.name}</h3>
                <p className='text-[#74342B] font-medium mt-2'>{person.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Development Team Section */}
      <div className="py-16 px-6 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-light text-[#3A4454] mb-4">Development Team</h2>
            <p className="text-xl text-[#3A4454] opacity-80">The talented developers and designers building VisHeart</p>
          </div>
          <div className="flex justify-center space-x-1">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setActiveTab(dept.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === dept.id 
                    ? 'bg-[#5B7B9A] text-white shadow-md' 
                    : 'bg-[#F8F2E6] text-[#3A4454] hover:bg-[#5B7B9A] hover:text-white'
                }`}
              >
                {dept.name} ({dept.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence>
              {filteredMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="relative">
                    <div className="h-64 bg-gradient-to-br from-[#5B7B9A] to-[#3A4454] flex items-center justify-center">
                      <img 
                        src={member.avatar} 
                        alt={member.name}
                        className="w-full h-full object-cover shadow-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/placeholder-pfp.png";
                        }}
                      />
                    </div>
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                      member.department === 'engineering' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {member.department === 'engineering' ? 'Engineering' : 'Design'}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-medium text-[#3A4454] mb-2">{member.name}</h3>
                    <p className="text-[#5B7B9A] font-medium mb-3">{member.role}</p>
                    <p className="text-[#3A4454] text-sm opacity-80 mb-4 line-clamp-3">
                      {member.bio}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {member.expertise.slice(0, 3).map((skill, skillIndex) => (
                        <span 
                          key={skillIndex}
                          className="px-2 py-1 bg-[#F8F2E6] text-[#A87C5F] text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.expertise.length > 3 && (
                        <span className="px-2 py-1 bg-[#A87C5F] text-white text-xs rounded-full">
                          +{member.expertise.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <button className="text-[#5B7B9A] text-sm font-medium hover:text-[#4A6A89] transition-colors">
                      View Full Profile →
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Team Member Modal */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-[#5B7B9A] to-[#3A4454] flex items-center justify-center">
                  <img 
                    src={selectedMember.avatar} 
                    alt={selectedMember.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-2/3">
                    <div className="flex items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-3xl font-light text-[#3A4454]">{selectedMember.name}</h2>
                        <p className="text-xl text-[#5B7B9A] font-medium">{selectedMember.role}</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-[#3A4454] mb-3">About</h3>
                      <p className="text-[#3A4454] opacity-80 leading-relaxed">{selectedMember.bio}</p>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-[#3A4454] mb-3">Key Projects</h3>
                      <ul className="space-y-2">
                        {selectedMember.projects.map((project, index) => (
                          <li key={index} className="flex items-start">
                            <svg className="w-4 h-4 text-[#A87C5F] mr-2 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[#3A4454] opacity-80">{project}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-[#F8F2E6] p-4 rounded-lg">
                      <p className="text-[#3A4454] italic">"{selectedMember.quote}"</p>
                    </div>
                  </div>
                  
                  <div className="md:w-1/3">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-[#3A4454] mb-3">Experience</h3>
                        <p className="text-[#5B7B9A] font-medium">{selectedMember.experience}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-[#3A4454] mb-3">Education</h3>
                        <p className="text-[#3A4454] opacity-80">{selectedMember.education}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-[#3A4454] mb-3">Expertise</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedMember.expertise.map((skill, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-[#5B7B9A] text-white text-sm rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-[#3A4454] mb-3">Connect</h3>
                        <div className="flex space-x-3">
                          {Object.entries(selectedMember.social).map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-10 bg-[#5B7B9A] hover:bg-[#4A6A89] rounded-full flex items-center justify-center transition-colors"
                            >
                              <span className="text-white text-sm capitalize">{platform[0]}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamPage;