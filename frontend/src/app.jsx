import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

import Layout from './components/Layout';


function App() {
  return (
    <Routes>
      {/* Routes with Navbar + Footer */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        
      </Route>

      {/* Routes without Navbar + Footer */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;
