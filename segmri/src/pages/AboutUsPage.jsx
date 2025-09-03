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