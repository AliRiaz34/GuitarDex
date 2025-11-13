import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav id="navbar">
      <NavLink id='navlink-1' to="/songs/add" className={({isActive}) => isActive ? 'active' : ''}>
        SPOT
      </NavLink>
      <NavLink id='navlink-2' to="/" className={({isActive}) => isActive ? 'active' : ''}>
        LIBRARY
      </NavLink>
      <NavLink id='navlink-3' to="/playlists" className={({isActive}) => isActive ? 'active' : ''}>
        DECK
      </NavLink>
    </nav>
  )
}

export default Navbar;