import { Banner, ExternalLink, UtahIdLogin } from '@ugrc/utah-design-system';

export default function Login() {
  return (
    <section className="grid flex-1 justify-center gap-4">
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">PLSS Monument Review</h2>
      <p className="max-w-prose text-justify text-lg text-gray-700 dark:text-gray-200">
        Welcome to the Public Land Survey System (PLSS) Monument Submission Application. This platform allows surveyors,
        engineers, and government officials to document, update, and submit information about survey monuments across
        Utah, helping maintain the accuracy of our state&lsquo;s land records.
      </p>

      <p className="max-w-prose text-justify text-lg text-gray-700 dark:text-gray-200">
        By logging in and reviewing submissions, you&lsquo;re helping to include critical infrastructure that supports
        property boundaries, construction projects, and mapping efforts. Please log in with your UtahId to begin
        reviewing monument information.
      </p>
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Sign in to your account</h2>
      <p className="max-w-prose text-justify text-lg text-gray-700 dark:text-gray-200">
        This app requires a UtahId account to review monument record sheets. Your name and email address will be shared
        with this application.
      </p>
      <UtahIdLogin
        size="extraLarge"
        errorRenderer={(error) => {
          return (
            <Banner>
              <div className="grid gap-4">
                {error}
                <div>
                  Did you want to login to the <ExternalLink href="https://plss.utah.gov">PLSS submission</ExternalLink>{' '}
                  application instead?
                </div>
              </div>
            </Banner>
          );
        }}
      />
    </section>
  );
}
