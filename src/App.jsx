import { useState } from 'react'
import Navbar from "../src/components/layout/Navbar"
import Footer from './components/layout/Footer'

function App() {
  return (
    <div className="bg-amber-200 min-h-screen flex flex-col">
      <Navbar />
      <main className='flex-1'>
        
      </main>
      <Footer / >
    </div>
  )
}

export default App
