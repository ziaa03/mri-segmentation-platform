import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="py-4 px-8 bg-[#FFFCF6] text-[#343231] shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/">
            <h1 className="text-2xl font-semibold text-[#343231] mr-4">VisHeart</h1>
            </Link>
          </div>
          
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <a href="/" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">HOME</a>
              </li>
              <li>
                <a href="/uploads" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">UPLOADS</a>
              </li>
              <li>
                <a href="/about-us" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">ABOUT US</a>
              </li>
              <li>
                <a href="/login" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">LOGIN</a>
              </li>
              <li>
                <a href="/user-settings" className="text-[#343231] hover:text-[#74342B] hover:underline transition-colors">SETTINGS</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;