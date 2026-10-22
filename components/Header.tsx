// src/components/Header.jsx
import { Link } from "react-router-dom";
import home from "../assets/home_icon.png";
import logo from "../assets/brand-symbol.png";
import icon from "../assets/profile_icon.png";
import bell from "../assets/default_bell_icon.png";

export default function Header() {
  return (
    <header>
        <Link id="logo" to="../L01Home">
            <img src={logo} alt="Logo"/>
            <h1>UTD Assessment Helper</h1>
        </Link>
        <nav id="user-shortcuts">
            <Link to="../L01Home"><img className="icon" src={home} alt="Home"/></Link>
            <img className="icon" src={bell} alt="Notifications"/>
            <nav><img className="icon" src={icon} alt="Icon"/></nav>
        </nav>
    </header>
  );
}