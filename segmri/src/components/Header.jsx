const Header = () => {
  return (
    <header className="py-4 px-8 bg-[#FFFCF6] text-[#343231] shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo */}
            <img src="/heart-logo.png" alt="VisHeart Logo" className="w-[110px]" />
          </div>
          
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <a href="#" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">HOME</a>
              </li>
              <li>
                <a href="/uploads" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">UPLOADS</a>
              </li>
              <li>
                <a href="/about-us" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">ABOUT US</a>
              </li>
              <li>
                <a href="/profile" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">PROFILE</a>
              </li>
            </ul>
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden text-[#343231]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile menu (hidden by default) */}
        <div className="md:hidden hidden">
          <ul className="mt-4 space-y-2">
            <li><a href="#" className="block py-2 text-[#343231] hover:text-[#74342B] transition-colors">HOME</a></li>
            <li><a href="#" className="block py-2 text-[#343231] hover:text-[#74342B] transition-colors">UPLOADS</a></li>
            <li><a href="#" className="block py-2 text-[#343231] hover:text-[#74342B] transition-colors">ABOUT US</a></li>
            <li><a href="#" className="block py-2 text-[#343231] hover:text-[#74342B] transition-colors">PROFILE</a></li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;