import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav id="navbar">
        <Link to="/songs/add">
            spot
        </Link>
        <Link to="/library">
            library
        </Link>
    </nav>
  )
}

export default Navbar;