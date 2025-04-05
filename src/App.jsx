import { BrowserRouter, Routes, Route } from "react-router-dom";


import './App.css'
import Home from './Home'
import AMazeThing from './AMazeThing';
import CacheBlog from './CacheBlog';

function App() {

return (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />}>
      </Route>
      <Route path="/amazething" element={<AMazeThing />} />
      <Route path="/cacheblog" element={<CacheBlog />} />
    </Routes>
  </BrowserRouter>
);
}

export default App
