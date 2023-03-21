import DiscordSVG from '../assets/discord.svg';
import TwitterSVG from '../assets/twitter.svg';
  
const Footer = () => {

  return (
    <div className={'text-secondary font-sansLight text-xs sm:text-sm mt-14 sm:mt-28 pb-3'}>
      <div className="md:hidden mb-8 mx-auto w-44 sm:w-48">
      </div>
      <div className={'flex justify-between '}>
        <p className="mt-auto">All Rights Reserved 2021</p>
        <div>
          <div className={'text-right'}>
            <a href="https://discord.gg/sMUu9REvU8">
              <img src={DiscordSVG} className="inline m-2 cursor-pointer" />
            </a>
            <a href="https://twitter.com/MortuaryIncNFT">
              <img src={TwitterSVG} className="inline m-2 cursor-pointer" />
            </a>
          </div>
          <a className="underline-purple" href="https://mortuary-inc.io/terms-conditions/">
            Terms and Conditions
          </a>
        </div>
      </div>
    </div>
  );
};

export default Footer;
