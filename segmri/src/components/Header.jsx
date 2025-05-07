import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="py-4 px-8 bg-[#FFFCF6] text-[#343231] shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/">
              <h1 className={`text-2xl font-semibold mr-4 transition-colors`}>
                <span className="text-[#74342B]">Vis</span>Heart
              </h1>           
            </Link>
          </div>
          
          <nav className="hidden md:block">
            <ul className="flex space-x-8 text-sm font-medium ">
              <li>
                <a href="/" className="text-[#343231] hover:text-[#74342B]  transition-colors">HOME</a>
              </li>
              <li>
                <a href="/uploads" className="text-[#343231] hover:text-[#74342B] transition-colors">UPLOADS</a>
              </li>
              <li>
                <a href="/about-us" className="text-[#343231] hover:text-[#74342B] transition-colors">ABOUT US</a>
              </li>
              <li>
                <a href="/login" className="text-[#343231] hover:text-[#74342B] transition-colors">LOGIN</a>
              </li>
              <li>
                <a href="/user-settings" className="text-[#343231] hover:text-[#74342B] transition-colors">SETTINGS</a>
              </li>
              <li>
                <a href="/user-management" className="text-[#343231] hover:text-[#74342B] transition-colors">USERS</a>    
              </li>
              <li>
                <a href="/cardiac-analysis" className="text-[#343231] hover:text-[#74342B] transition-colors">CARDIAC ANALYSIS</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;