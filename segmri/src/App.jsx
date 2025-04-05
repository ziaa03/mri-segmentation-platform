import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import './index.css'; 

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <LandingPage />
      </main>
      
      <Footer />
    </div>
  );
}

export default App;