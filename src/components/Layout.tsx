import { ReactNode } from 'react';
import Footer from './Footer';
import Logo from './Logo';
import TopLink from './TopLink';

interface Props {
  children: ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <div className={'bg-primary min-h-screen text-center px-8'}>
      <div className="max-w-7xl m-auto">
        <div className="hidden md:block">
          <TopLink />
        </div>
        
        {children}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
