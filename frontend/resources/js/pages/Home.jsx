import React, { useEffect } from 'react';
import Card from '../blue-bird/components/Card';
import Header from '../components/Header';
import { useLanguage } from '../blue-bird/contexts/LanguageContext';
import Typography from '../blue-bird/components/Typography';
import { useSPA } from '../blue-bird/contexts/SPAContext.jsx';

export default function Home() {
  const { t } = useLanguage();
  const { navigateToLang, pageProps, pageMeta } = useSPA();
  console.log("pageProps", pageProps);
  console.log("pageMeta", pageMeta);

  useEffect(() => {

    fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "example@example.com",
        password: "myPassword123"
      }),
    })
      .then((response) => response.json())
      .then((data) => console.log('Backend response:', data))
      .catch((error) => console.error('Error fetching from backend:', error));
  }, []);

  return (
    <div
      className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 min-h-screen"
    >
      <Header />
      <main className='max-w-7xl mx-auto'>
        <div className='text-center p-4'>
          <header className='mb-8 mt-8'>
            <Typography variant='h1' className='text-4xl mb-4' gradient={{ from: 'sky', to: 'indigo' }}>
              {t("home_page.title")}
            </Typography>
            <Typography className='text-xl text-slate-500 dark:text-slate-400 max-w-[600px] mx-auto'>
              {t("home_page.description")}
            </Typography>
          </header>

          <div className='flex gap-4 justify-center mb-12'>
            <a
              href="https://seip25.github.io/Blue-bird/en.html"
              target="_blank"
              rel="noopener noreferrer"
              className='inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-500 text-white dark:text-slate-900 hover:bg-blue-500/90 dark:hover:bg-blue-500/90 h-10 px-4 py-2'
            >
              Documentation (Eng)
            </a>
            <a
              href="https://seip25.github.io/Blue-bird/"
              target="_blank"
              rel="noopener noreferrer"
              className='inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 dark:border-slate-800 bg-blue-100 dark:bg-slate-900 text-blue-600 dark:text-slate-100 hover:bg-blue-200 dark:hover:bg-blue-100 h-10 px-4 py-2'
            >
              Documentación (Esp)
            </a>
          </div>

          <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto text-left'>
            <Card title={t("home_page.lightweight")}>
              <Typography className="text-sm text-slate-500 dark:text-slate-400">
                {t("home_page.lightweightDescription")}
              </Typography>
            </Card>
            <Card title={t("home_page.reactPowered")}>
              <Typography className="text-sm text-slate-500 dark:text-slate-400">
                {t("home_page.reactPoweredDescription")}
              </Typography>
            </Card>
            <Card title={t("home_page.expressBackend")}>
              <Typography className="text-sm text-slate-500 dark:text-slate-400">
                {t("home_page.expressBackendDescription")}
              </Typography>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
