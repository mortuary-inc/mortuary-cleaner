import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link } from 'react-router-dom';
import LogotextSVG from '../assets/LogoMortuaryText.svg';
import '@solana/wallet-adapter-react-ui/styles.css'

const TopLink = () => {

  return (
    <div className={'text-primary relative md:flex font-sansLight'}>

      <div className={'lg:flex flex-1 justify-left pt-4'}>
        <div className={'text-left mr-4 lg:mr-8'}>
          <Link className={'basis-full'} to="/">
            <img src={LogotextSVG} className="cursor-pointer" />
          </Link>
          <div className={'text-third font-sansLight text-xs mt-3 basis-full'}>CURATING DEATH SINCE 2021</div>
        </div>
      </div>

      <div className='md:flex flex-0 place-content-end rounded-xl bg-secondary-h md:bg-transparent md:rounded-none mt-4 pb-4 md:pb-0 md:pt-3 flex-col-reverse md:flex-row md:mt-0'>
        <div>
          <WalletModalProvider>
            <WalletMultiButton className='font-sans bg-third px-3 py-2 text-primary rounded-xl hover:bg-third-h active:bg-third-h transition-colors duration-1500 ease-in-out' />
          </WalletModalProvider>
        </div>
      </div>

    </div>
  );
};

export default TopLink;
