import { Footer, Header, SocialMedia, UgrcLogo, useFirebaseAuth } from '@ugrc/utah-design-system';
import { Outlet } from 'react-router';

const version = import.meta.env.PACKAGE_VERSION;

const links = [
  {
    key: 'PLSS submission website',
    action: { url: 'https://plss.utah.gov' },
  },
  {
    key: 'GitHub Repository',
    action: { url: 'https://github.com/agrc/plss-review' },
  },
  {
    key: `Version ${version} changelog`,
    action: { url: `https://github.com/agrc/plss-review/releases/v${version}` },
  },
];

export default function Layout() {
  const { currentUser, logout } = useFirebaseAuth();

  return (
    <>
      <main className="flex h-screen flex-col md:gap-2">
        <Header links={links} currentUser={currentUser} logout={logout}>
          <div className="flex h-full grow items-center gap-3">
            <UgrcLogo />
            <h2 className="font-heading text-3xl font-black text-zinc-600 sm:text-5xl dark:text-zinc-100">
              PLSS Review
            </h2>
          </div>
        </Header>
        <section className="relative flex min-h-0 flex-1">
          <div className="relative flex flex-1 flex-col">
            <div className="relative w-full flex-1 overflow-y-auto p-4 dark:rounded">
              <Outlet />
            </div>
            <SocialMedia />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
