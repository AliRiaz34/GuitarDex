import { Link } from 'react-router-dom';

function Header() {
  return (
    <header>
      <Link to="/">
        <img
          id="guitardex-icon"
          src="/images/guitarDexIcon.png"
          alt="website icon"
          width="50"
          height="50"
        />
        <h3 id="guitardex-heading">GuitarDex</h3>
      </Link>
    </header>
  )
}

export default Header;