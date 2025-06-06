import React from 'react'
import {motion} from 'framer-motion'
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import { fadeIn } from './variants';

// image slider
const imageslider = [
    {
      text: "Authentication",
      image: "./authentication.jpeg",
    },
    {
      text: "Automatic Cardiac Segmentation (LVC, MYO, RV)",
      image: "./view_result.jpeg",
    },
    {
      text: "Intuitive User Interface",
      image: "./ui.jpeg",
    },
    {
      text: "MRI Image Upload",
      image: "./image_upload.jpg",
    },
    {
      text: "Real-time Result Viewing",
      image: "./realtimeseg.jpeg",
    },
  ];

const AboutUsPage = () => {

    return (

    <div className='w-full min-h-screen'>

        {/* About Us section */}
        <div className='py-16 px-6 md:px-16 xl:px-72 bg-gradient-to-b from-[#F9EDD4] via-[#FFFCF6] to-[#F9EDD4] min-h-screen flex flex-col items-center justify-center'>
            <img src="./visheart_line.png" alt="VisHeart small logo" className='w-60 h-30' />

            <motion.div 
                variants={fadeIn("down", 0.2)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: false, amount: 0.7 }}
                className="text-center flex flex-col items-center">
                <h1 className='pt-4 pb-10 text-6xl text-[#74342B]'>About Us</h1>
                <p className='text-lg text-[#343231] max-w-4xl'>
                    Our cardiac component segmentation website is a web-based platform designed to assist in the analysis of cardiac MRI images. By integrating advanced AI segmentation models, it enables accurate identification of key cardiac structures such as the left ventricle cavity, myocardium, and right ventricle. The platform focuses on creating a seamless experience for image uploading, segmentation, and results visualization, all within a secure and intuitive environment tailored for medical imaging.
                </p>
            </motion.div>
        </div>
        
        {/* Mission & Vision Section Wrapper */}
        <section className='bg-[#091021] text-white'>
          {/* Mission */}
          <div className='py-20 px-6 md:px-16 xl:px-72 flex flex-col lg:flex-row items-center gap-16'>
            {/* Image */}
            <motion.img 
              src="./mission.jpeg" 
              alt="mission" 
              className='w-full max-w-md rounded-xl shadow-lg object-cover'
              variants={fadeIn("left", 0.5)} 
              initial="hidden"
              whileInView="show"
              transition={{ duration: 1, ease: "easeOut" }} 
              viewport={{ once: false, amount: 0.7 }}
            />

            {/* Text Content */}
            <motion.div
              className='flex-1'
              variants={fadeIn("right", 0.5)} 
              initial="hidden"
              whileInView="show"
              transition={{ duration: 1, ease: "easeOut" }} 
              viewport={{ once: false, amount: 0.7 }}
            >
              <div className='mb-4 flex items-center gap-3'>
                <div className='w-1.5 h-8 bg-[#FDBA74] rounded-full'></div>
                <span className='uppercase tracking-widest text-base text-[#FDBA74]'>Our Mission</span>
              </div>
              <h2 className='text-3xl md:text-4xl font-bold text-white mb-4'>Enhancing Accessibility in Cardiac Imaging</h2>
              <p className='text-base md:text-lg text-[#E5E7EB] leading-relaxed text-justify'>
                Our mission is to enhance the efficiency and accessibility of cardiac image analysis through a web-based platform that combines deep learning with 
                medical imaging. By integrating state-of-the-art segmentation models into a user-friendly interface, we aim to support clinical decision-making, 
                accelerate research workflows, and contribute to better patient outcomes. We are committed to promoting secure data handling while making complex AI 
                tools usable and approachable for healthcare and research professionals.
              </p>
            </motion.div>
          </div>

          {/* Vision */}
          <div className='py-20 px-6 md:px-16 xl:px-72 flex flex-col-reverse lg:flex-row items-center gap-16 bg-[#091021]'>
            {/* Text Content */}
            <motion.div
              className='flex-1'
              variants={fadeIn("left", 0.5)} 
              initial="hidden"
              whileInView="show"
              transition={{ duration: 1, ease: "easeOut" }} 
              viewport={{ once: false, amount: 0.7 }}
            >
              <div className='mb-4 flex items-center gap-3'>
                <div className='w-1.5 h-8 bg-[#FDBA74] rounded-full'></div>
                <span className='uppercase tracking-widest text-base text-[#FDBA74]'>Our Vision</span>
              </div>
              <h2 className='text-3xl md:text-4xl font-bold text-white mb-4'>Bridging AI & Clinical Impact</h2>
              <p className='text-base md:text-lg text-[#E5E7EB] leading-relaxed text-justify'>
                Our goal is to bridge the gap between cutting-edge technology and practical clinical use by creating a robust and scalable digital tool. By fostering 
                innovation and accessibility, we strive to lead the transformation of cardiac image analysis into an intelligent, standardized, and widely adopted 
                practice in both hospitals and academic environments.
              </p>
            </motion.div>

            {/* Image */}
            <motion.img 
              src="./vision.jpeg" 
              alt="vision" 
              className='w-full max-w-md rounded-xl shadow-lg object-cover'
              variants={fadeIn("right", 0.5)} 
              initial="hidden"
              whileInView="show"
              transition={{ duration: 1, ease: "easeOut" }} 
              viewport={{ once: false, amount: 0.7 }}
            />
          </div>
        </section>


        {/* Leads & Advisors Section */}
        <div className='py-16 px-6 md:px-16 xl:px-72 bg-[#fdf8f3] flex flex-col items-center'>
          <motion.div
            variants={fadeIn("up", 0.2)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.7 }}
            className="text-center max-w-4xl"
          >
            <h2 className="text-4xl text-[#74342B] mb-6">Meet Our Leadership</h2>
            <p className="text-[#343231] text-lg mb-12">
              Meet the minds shaping our direction, championing innovation, and delivering impact with purpose.
            </p>
          </motion.div>
            
          <div className='grid grid-cols-1 md:grid-cols-2 gap-12 justify-center'>
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
              <div
                key={index}
                className='bg-white rounded-xl shadow-xl overflow-hidden transform hover:scale-105 transition duration-300 flex flex-col items-center'
                variants={fadeIn("up", 0.3 + index * 0.1)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.6 }}
              >
                <img
                  src={person.image}
                  alt={person.name}
                  className='w-32 h-32 mt-6 rounded-full object-cover border-4 border-[#fdf8f3]'
                />
                <div className='p-6 text-center'>
                  <h3 className='text-base font-semibold text-[#1f1f1f]'>{person.name}</h3>
                  <p className='text-[#74342B] font-medium mt-2'>{person.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>



        {/* Website Feature Section */}
        <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#5B7B9A] to-[#3A4454] overflow-hidden px-4">
            {/* Text */}
            <motion.div
            variants={fadeIn("up", 0.2)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.7 }}
            className="text-center max-w-2xl mb-10">
              <h2 className="text-3xl md:text-4xl text-white mb-4">
                Explore Our Features
              </h2>
              <p className="text-gray-300 text-base md:text-lg">
                Discover what makes our platform unique. Innovative design meets exceptional functionality — tailored just for you.
              </p>
            </motion.div>

            {/* Swiper Slider */}
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
                  className="w-[320px] bg-[#c1c3c4] rounded-[10px] shadow-[0_15px_50px_rgba(0,0,0,0.2)] transition-all duration-300 swiper-slide-custom"
                >
                  <div className="relative w-full h-[300px] rounded-[10px] overflow-hidden">
                    <img 
                      src={item.image} 
                      alt="slide"
                      className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center px-4 text-center">
                      <p className="text-white text-2xl font-bold">{item.text}</p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Style for blur effect */}
            <style>
              {`
                .swiper-slide {
                  filter: blur(3px);
                  transform: scale(0.95);
                  transition: all 0.3s ease-in-out;
                }
                .swiper-slide.swiper-slide-active {
                  filter: none;
                  transform: scale(1);
                }
              `}
            </style>
        </div>

    </div>
  )
}

export default AboutUsPage