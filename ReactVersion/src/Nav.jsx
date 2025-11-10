import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav id="navbar">
      <NavLink id='navlink-1' to="/songs/add" className={({isActive}) => isActive ? 'active' : ''}>
        SPOT
      </NavLink>
      <NavLink id='navlink-2' to="/library" className={({isActive}) => isActive ? 'active' : ''}>
        LIBRARY
      </NavLink>
    </nav>
  )
}

export default Navbar;