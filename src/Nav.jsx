import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav id="navbar">
      <NavLink id='navlink-1' to="/songs/add" className={({isActive}) => isActive ? 'active' : ''}>
        <img className="nav-icon" src="/images/nav-spot.png" alt="Spot" />
      </NavLink>
      <NavLink id='navlink-2' to="/" className={({isActive}) => isActive ? 'active' : ''}>
        <img className="nav-icon" src="/images/nav-library.png" alt="Library" />
      </NavLink>
      <NavLink id='navlink-3' to="/deck" className={({isActive}) => isActive ? 'active' : ''}>
        <img className="nav-icon" src="/images/nav-deck.png" alt="Deck" />
      </NavLink>
      <NavLink id='navlink-4' to="/social" className={({isActive}) => isActive ? 'active' : ''}>
        <img className="nav-icon" src="/images/nav-social.png" alt="Social" />
      </NavLink>
    </nav>
  )
}

export default Navbar;