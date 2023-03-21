import { Link } from 'react-router-dom';
import logoMobile from '../assets/mortuaryInc-mobile.png';
import logo from '../assets/mortuaryInc.png';
import skullMobile from '../assets/skull-logo-mobile.png';
import skull from '../assets/skull-logo.png';

const Logo = () => {

  return (
    <div>
      <Link to="/">
        <img
          className="text-center m-auto"
          style={{ minWidth: '195px' }}
          src={skull}
          srcSet={`${skullMobile} 640w, ${skull} `}
          alt="Logo Skull"
        />
        <img
          className="text-center m-auto"
          style={{ minWidth: '180px' }}
          src={logo}
          srcSet={`${logoMobile} 640w, ${logo} `}
          alt="Logo MortuaryInc"
        />
      </Link>
      <div className={'text-third font-sansLight text-sm mt-3'}>CURATING DEATH SINCE 2021</div>
    </div>
  );
};

export default Logo;
