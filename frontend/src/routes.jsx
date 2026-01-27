import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

function Layout() {
  return (
    <>
      <Navbar />
      <Outlet /> {/* This renders the child page */}
      <Footer />
    </>
  );
}

export default Layout;
