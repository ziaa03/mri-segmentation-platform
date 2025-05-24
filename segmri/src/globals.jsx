import ByteStream from 'bytestream';

// Define globally in the browser (Vite builds for browser)
window.ByteStream = ByteStream;

console.log(window.ByteStream);       // Should log the class/function
console.log(typeof window.ByteStream); // Should be "function"


